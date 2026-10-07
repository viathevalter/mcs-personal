import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  computeDisputeTotalsAndCells, 
  deepMergeDisputedHours, 
  normalizeDisputedHoursMap,
  getDisputedHourValue 
} from '../api/faturamentoApi';
import { getBillingCycleDays } from '../pages/FaturasPendentes';
import { supabase } from '@/shared/supabase/client';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function sanitizeFilenamePart(str: string): string {
  if (!str) return '';
  return str
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getFaturaBillingPeriod(fat: any, hours?: any[]): string {
  // 1. Check hours
  if (hours && hours.length > 0) {
    const sample = hours.find((h: any) => h.data_trabalho)?.data_trabalho;
    if (sample) {
      const dateStr = typeof sample === 'string' ? sample.split('T')[0] : new Date(sample).toISOString().split('T')[0];
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12 && !isNaN(y)) {
          return `${MONTH_NAMES_PT[m]} ${y}`;
        }
      }
    }
  }

  // 2. Check descricao_servico in ajustes_json
  const desc = fat?.ajustes_json?.descricao_servico || fat?.ajustes_json?.descricaoServico || '';
  const monthMatch = desc.match(/(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})/i);
  if (monthMatch) {
    const mStr = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
    return `${mStr} ${monthMatch[2]}`;
  }

  // 3. Check data_emissao
  const emissao = fat?.data_emissao || fat?.ajustes_json?.data_emissao;
  if (emissao) {
    const dateStr = typeof emissao === 'string' ? emissao.split('T')[0] : new Date(emissao).toISOString().split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (m >= 0 && m < 12 && !isNaN(y)) {
        return `${MONTH_NAMES_PT[m]} ${y}`;
      }
    }
  }

  // 4. Check fat.year / fat.month
  if (fat?.year && fat?.month !== undefined) {
    const m = Number(fat.month);
    if (m >= 0 && m < 12) {
      return `${MONTH_NAMES_PT[m]} ${fat.year}`;
    }
  }

  // 5. Check created_at
  if (fat?.created_at) {
    const d = new Date(fat.created_at);
    return `${MONTH_NAMES_PT[d.getMonth()]} ${d.getFullYear()}`;
  }

  const now = new Date();
  return `${MONTH_NAMES_PT[now.getMonth()]} ${now.getFullYear()}`;
}

export function buildFaturaPdfFilename(
  fat: any, 
  hours: any[] | undefined, 
  clientName: string, 
  type: 'informe' | 'factura' | 'horas' = 'factura'
): string {
  const cleanClient = sanitizeFilenamePart(
    fat?.client?.legal_name || fat?.client?.razon_social || fat?.client?.nombre_comercial || clientName || 'Cliente'
  );
  const period = getFaturaBillingPeriod(fat, hours);
  
  let rawNumero = fat?.fatura_numero || '';
  if (!rawNumero && fat?.empresa?.invoiceSeries) {
    rawNumero = `Factura nº${fat.empresa.invoiceSeries} ${fat.year || new Date().getFullYear()}/${fat.empresa.nextInvoiceNumber || 1}`;
  }
  if (!rawNumero) {
    rawNumero = 'Factura';
  }
  
  const cleanNumero = sanitizeFilenamePart(rawNumero);

  if (type === 'informe') {
    return `Informe - ${cleanClient} - ${period} - ${cleanNumero}.pdf`;
  } else if (type === 'horas') {
    return `Folha de Ponto - ${cleanClient} - ${period} - ${cleanNumero}.pdf`;
  }

  // Factura
  if (/factura/i.test(cleanNumero)) {
    return `${cleanClient} - ${period} - ${cleanNumero}.pdf`;
  }
  return `Factura - ${cleanClient} - ${period} - ${cleanNumero}.pdf`;
}

export async function resolveEmpresaForFatura(fat: any, providedEmpresa?: any): Promise<any> {
  if (providedEmpresa) return providedEmpresa;
  
  try {
    if (fat?.empresa_id) {
      const { data } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('*')
        .eq('id', fat.empresa_id)
        .single();
      if (data) return data;
    }

    const { data: defaultEmp } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('*')
      .limit(1)
      .single();
    if (defaultEmp) return defaultEmp;
  } catch (err) {
    console.warn('Erro ao carregar empresa para PDF:', err);
  }

  return {
    nome: 'MCS - GESTÃO COMERCIAL',
    address_line: 'Rua Principal',
    city: 'Lisboa',
    postal_code: '1000-001',
    province: 'Portugal',
    tax_id: 'PT517834747',
    atcud_prefix: 'J6XBVVRV'
  };
}

export async function generateFacturaPDF(
  fat: any, 
  hours: any[], 
  clientName: string, 
  providedEmpresa?: any
): Promise<jsPDF | null> {
  const targetEmpresa = await resolveEmpresaForFatura(fat, providedEmpresa);
  const adj = fat.ajustes_json || fat.ajustesJson || {};
  const baseDisputed = adj.disputed_hours || {};
  const disputedHoursObj = normalizeDisputedHoursMap(baseDisputed);
  const targetObraId = adj.obra_id || 'all';

  const { totalHorasCalculadas, totalBaseVal } = computeDisputeTotalsAndCells(
    hours,
    disputedHoursObj,
    targetObraId
  );

  const emissionDateStr = new Date((fat.data_emissao || new Date().toISOString().split('T')[0]) + 'T00:00:00').toLocaleDateString('pt-PT');
  const vencimentoDateStr = fat.data_vencimento
    ? new Date(fat.data_vencimento + 'T00:00:00').toLocaleDateString('pt-PT')
    : (() => {
        const emission = new Date((fat.data_emissao || new Date().toISOString().split('T')[0]) + 'T00:00:00');
        emission.setDate(emission.getDate() + (fat.client?.paymentTermDays || 30));
        return emission.toLocaleDateString('pt-PT');
      })();

  let qrSvgString = '';
  try {
    qrSvgString = renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: `${window.location.origin}/aprovacao-cliente/${fat.magic_link_token || 'draft'}`,
        size: 80,
        level: 'H',
        includeMargin: false
      })
    );
  } catch {
    qrSvgString = `
      <div style="width: 80px; height: 80px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #64748b; font-weight: bold;">
        QR CODE
      </div>
    `;
  }

  const incrementos = Number(adj.incrementos || 0);
  const incrementosDesc = adj.incrementos_desc || adj.incrementosDesc || 'Incremento Adicional';
  const reducoes = Number(adj.reducoes || 0);
  const reducoesDesc = adj.reducoes_desc || adj.reducoesDesc || 'Redução Comercial';
  const ivaPct = Number(adj.iva_pct !== undefined ? adj.iva_pct : (adj.ivaPct || 0));

  const subtotal = totalBaseVal + incrementos - reducoes;
  const ivaVal = subtotal * (ivaPct / 100);
  const finalTotal = subtotal + ivaVal;

  const iban = adj.iban || targetEmpresa?.iban || targetEmpresa?.bank_details || '';
  const descricaoServico = adj.descricao_servico || adj.descricaoServico || 'Prestação de Serviços';

  const clientLegalName = fat.client?.legal_name || fat.client?.razon_social || fat.client?.nombre_comercial || clientName;
  const clientAddress = fat.client?.address_line || 'N/A';
  const clientPostalCity = [fat.client?.postal_code, fat.client?.city].filter(Boolean).join(' ') || '';
  const clientCountry = fat.client?.countryName || fat.client?.country || fat.client?.country_name || fat.client?.province || 'Espanha';
  const clientTaxId = fat.client?.tax_id || fat.client?.taxId || fat.client?.cif_nif || 'N/A';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Inter', Arial, Helvetica, sans-serif";
  container.style.letterSpacing = '0.01px';

  const facturaHtml = `
    <div style="width: 800px; min-height: 1130px; height: 1130px; background-color: #ffffff; padding: 40px; box-sizing: border-box; color: #1e293b; font-family: 'Inter', Arial, Helvetica, sans-serif; letter-spacing: 0.01px; font-variant-ligatures: none; -webkit-font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'kern' 0; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
      <!-- TOP SECTION -->
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
          <div>
            <h3 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: normal;">
              ${fat.fatura_numero || `Factura nº${targetEmpresa?.invoice_series || '1'} ${new Date().getFullYear()}/${targetEmpresa?.next_invoice_number || 1}`}
            </h3>
            <p style="font-size: 11px; font-weight: 700; color: #0f172a; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">ORIGINAL</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
            <span style="font-size: 9px; font-weight: 700; color: #475569;">
              ATCUD: ${fat.atcud || `${targetEmpresa?.atcud_prefix || 'J6XBVVRV'}-${fat.fatura_numero || 1}`}
            </span>
            <div style="border: 1px solid #e2e8f0; padding: 4px; background-color: #ffffff; border-radius: 4px;">
              ${qrSvgString}
            </div>
          </div>
        </div>

        <!-- 3 COLUMNS: De, ATCUD/Datas, Para -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 28px; font-size: 11px; line-height: 1.45; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <div>
            <p style="font-weight: 700; font-size: 9px; color: #ec8a5e; text-transform: uppercase; margin: 0 0 4px 0;">De</p>
            <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${targetEmpresa?.nome || 'MCS'}</p>
            <p style="color: #475569; margin: 0;">${targetEmpresa?.address_line || 'N/A'}</p>
            <p style="color: #475569; margin: 0;">${[targetEmpresa?.postal_code, targetEmpresa?.city].filter(Boolean).join(' ')}</p>
            <p style="color: #475569; margin: 0;">${targetEmpresa?.province || 'Portugal'}</p>
            ${targetEmpresa?.email ? `<p style="color: #475569; margin: 0;">${targetEmpresa.email}</p>` : ''}
            <p style="color: #475569; margin: 0;">Nº Contribuinte: ${targetEmpresa?.tax_id || 'N/A'}</p>
            ${targetEmpresa?.capital_social ? `<p style="color: #475569; margin: 0;">Capital Social: ${targetEmpresa.capital_social}</p>` : ''}
            ${targetEmpresa?.conservatoria ? `<p style="color: #475569; margin: 0;">Cons. Reg. Com.: ${targetEmpresa.conservatoria}</p>` : ''}
            ${targetEmpresa?.matricula ? `<p style="color: #475569; margin: 0;">Matrícula: ${targetEmpresa.matricula}</p>` : ''}
          </div>

          <div>
            <p style="font-weight: 700; font-size: 9px; color: #ec8a5e; text-transform: uppercase; margin: 0 0 4px 0;">ATCUD</p>
            <p style="font-weight: 600; color: #0f172a; margin: 0;">${fat.atcud || `${targetEmpresa?.atcud_prefix || 'J6XBVVRV'}-${fat.fatura_numero || 1}`}</p>
            
            <p style="font-weight: 700; font-size: 9px; color: #ec8a5e; text-transform: uppercase; margin: 12px 0 2px 0;">Data de Emissão</p>
            <p style="color: #334155; margin: 0;">${emissionDateStr}</p>
            
            <p style="font-weight: 700; font-size: 9px; color: #ec8a5e; text-transform: uppercase; margin: 12px 0 2px 0;">Data de Vencimento</p>
            <p style="color: #334155; margin: 0;">${vencimentoDateStr}</p>
          </div>

          <div>
            <p style="font-weight: 700; font-size: 9px; color: #ec8a5e; text-transform: uppercase; margin: 0 0 4px 0;">Para</p>
            <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${clientLegalName}</p>
            <p style="color: #475569; margin: 0;">${clientAddress}</p>
            <p style="color: #475569; margin: 0;">${clientPostalCity}</p>
            <p style="color: #475569; margin: 0;">${clientCountry}</p>
            <p style="color: #475569; margin: 6px 0 0 0;">Nº Contribuinte: ${clientTaxId}</p>
          </div>
        </div>

        <!-- TABELA LISTA DE ARTIGOS -->
        <div style="background-color: #ec8a5e; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; text-align: center; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          Lista de Artigos
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(236, 138, 94, 0.4); font-size: 11px; margin-bottom: 24px; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f2a87a; color: #ffffff; border-bottom: 1px solid rgba(236, 138, 94, 0.4);">
              <th style="font-weight: 700; color: #ffffff; padding: 6px 12px; text-align: left;">DESCRIÇÃO DO ARTIGO</th>
              <th style="text-align: right; font-weight: 700; color: #ffffff; width: 80px; padding: 6px 8px;">QUANT.</th>
              <th style="text-align: right; font-weight: 700; color: #ffffff; width: 90px; padding: 6px 8px;">PREÇO</th>
              <th style="text-align: right; font-weight: 700; color: #ffffff; width: 60px; padding: 6px 8px;">DESC.</th>
              <th style="text-align: right; font-weight: 700; color: #ffffff; width: 70px; padding: 6px 8px;">IVA (%)</th>
              <th style="text-align: right; font-weight: 700; color: #ffffff; width: 100px; padding: 6px 12px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.3);">
              <td style="padding: 6px 12px; color: #1e293b;">${descricaoServico}</td>
              <td style="text-align: right; padding: 6px 8px; color: #1e293b;">${totalHorasCalculadas.toFixed(2)}</td>
              <td style="text-align: right; padding: 6px 8px; color: #1e293b;">${(totalBaseVal / (totalHorasCalculadas || 1)).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; padding: 6px 8px; color: #1e293b;">0,00</td>
              <td style="text-align: right; padding: 6px 8px; color: #1e293b;">${ivaPct.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
              <td style="text-align: right; font-weight: 700; padding: 6px 12px; color: #0f172a;">${totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${incrementos > 0 ? `
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.3); color: #047857;">
              <td style="padding: 6px 12px;">${incrementosDesc}</td>
              <td style="text-align: right; padding: 6px 8px;">1.00</td>
              <td style="text-align: right; padding: 6px 8px;">${incrementos.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; padding: 6px 8px;">0,00</td>
              <td style="text-align: right; padding: 6px 8px;">${ivaPct.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
              <td style="text-align: right; font-weight: 700; padding: 6px 12px; ">${incrementos.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
            ${reducoes > 0 ? `
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.3); color: #be123c;">
              <td style="padding: 6px 12px;">${reducoesDesc}</td>
              <td style="text-align: right; padding: 6px 8px;">1.00</td>
              <td style="text-align: right; padding: 6px 8px;">-${reducoes.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; padding: 6px 8px;">0,00</td>
              <td style="text-align: right; padding: 6px 8px;">${ivaPct.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
              <td style="text-align: right; font-weight: 700; padding: 6px 12px; ">-${reducoes.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- TABELA RESUMO -->
        <div style="background-color: #ec8a5e; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; text-align: center; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          Resumo
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(236, 138, 94, 0.4); font-size: 11px; margin-bottom: 24px; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; overflow: hidden;">
          <tbody>
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.3);">
              <td style="padding: 6px 12px; color: #1e293b;">Subtotal da Factura</td>
              <td style="text-align: right; font-weight: 600; width: 160px; padding: 6px 12px; color: #1e293b;">${subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.3);">
              <td style="padding: 6px 12px; color: #1e293b;">IVA ${ivaPct.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}% (Incidência: ${subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })})</td>
              <td style="text-align: right; font-weight: 600; width: 160px; padding: 6px 12px; color: #1e293b;">${ivaVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(236, 138, 94, 0.4); background-color: #fff7ed;">
              <td style="font-weight: 800; color: #0f172a; padding: 8px 12px; font-size: 12px;">Total da Factura</td>
              <td style="text-align: right; font-weight: 800; color: #0f172a; font-size: 13px; padding: 8px 12px; ">
                ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.4;">
          Condições de Enquadramento de IVA:<br/>
          (1) ${ivaPct === 0 ? 'M40-IVA - autoliquidação' : 'Regime Geral'}
        </div>
      </div>

      <!-- BOTTOM SECTION / FOOTER -->
      <div style="margin-top: 20px;">
        <div style="text-align: center; font-size: 10px; color: #475569; font-style: italic; font-weight: 600; margin-bottom: 12px;">
          ${targetEmpresa?.certified_software_text || 'Dclm - Processado por Programa Certificado nº 1137/AT'}
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: grid; grid-template-columns: 1fr 1.2fr 1fr; font-size: 9px; color: #64748b; line-height: 1.4;">
          <div>
            <p style="font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 2px 0;">Local de Carga</p>
            <p style="margin: 0;">${targetEmpresa?.address_line || 'N/ Morada'}</p>
            <p style="margin: 0;">${[targetEmpresa?.postal_code, targetEmpresa?.city].filter(Boolean).join(' ')}</p>
          </div>
          ${iban ? `
          <div style="text-align: center;">
            <p style="font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 2px 0;">Informações de Pagamento</p>
            <div style="font-size: 9px; white-space: pre-line; line-height: 1.2;">${iban}</div>
          </div>` : '<div></div>'}
          <div style="text-align: right;">
            <p style="font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 2px 0;">Local de Descarga</p>
            <p style="margin: 0;">${clientAddress || 'V/ Morada'}</p>
            <p style="margin: 0;">${[clientPostalCity, clientCountry].filter(Boolean).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = facturaHtml;
  document.body.appendChild(container);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  try {
    const canvas = await html2canvas(container, {
      scale: 2.0,
      useCORS: true,
      width: 800,
      windowWidth: 800,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        if (document.fonts) {
          document.fonts.forEach(font => clonedDoc.fonts.add(font));
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    document.body.removeChild(container);
    return pdf;
  } catch (err) {
    console.error("Erro ao gerar PDF da Factura:", err);
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    return null;
  }
}

export async function generateInformePDF(
  fat: any, 
  hours: any[], 
  clientName: string, 
  providedEmpresa?: any
): Promise<jsPDF | null> {
  const targetEmpresa = await resolveEmpresaForFatura(fat, providedEmpresa);
  const adj = fat.ajustes_json || fat.ajustesJson || {};
  const baseDisputed = adj.disputed_hours || {};
  const disputedHoursObj = normalizeDisputedHoursMap(baseDisputed);
  const targetObraId = adj.obra_id || 'all';

  const {
    totalHorasCalculadas: displayTotalHoras,
    totalBaseVal: totalBase,
    groupedDisputeWorkersEnriched
  } = computeDisputeTotalsAndCells(hours, disputedHoursObj, targetObraId);

  const exceptionWorkerIds = new Set(
    hours.filter((h: any) => !!h.is_exception).map((h: any) => h.worker_id)
  );

  const workers = groupedDisputeWorkersEnriched.map(w => ({
    ...w,
    isException: exceptionWorkerIds.has(w.workerId)
  }));

  const desc = adj.descricao_servico || adj.descricaoServico || 'Serviços Prestados';
  const inc = Number(adj.incrementos || 0);
  const incDesc = adj.incrementos_desc || adj.incrementosDesc || 'Adicional';
  const red = Number(adj.reducoes || 0);
  const redDesc = adj.reducoes_desc || adj.reducoesDesc || 'Desconto';
  const iva = Number(adj.iva_pct ?? adj.ivaPct ?? 0);
  const iban = adj.iban || targetEmpresa?.iban || '';
  const obraName = adj.obra || 'TODAS AS OBRAS';

  const finalTotal = (totalBase + inc - red) * (1 + iva/100);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Inter', Arial, Helvetica, sans-serif";
  container.style.letterSpacing = '0.01px';

  const logoHtml = targetEmpresa?.invoice_logo_url 
    ? `<div style="height: 56px; display: flex; align-items: center; margin-bottom: 8px;"><img src="${targetEmpresa.invoice_logo_url}" style="max-height: 100%; max-width: 220px; object-fit: contain;" /></div>`
    : `<h3 style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.025em;">${(targetEmpresa?.nome || 'STOCCO').toUpperCase()}</h3>`;

  const docNumber = `IF-${new Date(fat.created_at || fat.data_emissao).getFullYear()}/${String(fat.fatura_numero || targetEmpresa?.next_invoice_number || '0001').padStart(4, '0')}`;
  const emissionDateStr = new Date((fat.data_emissao || new Date().toISOString().split('T')[0]) + 'T00:00:00').toLocaleDateString('pt-PT');
  
  const emissionDateObj = new Date(fat.data_emissao || new Date());
  emissionDateObj.setDate(emissionDateObj.getDate() + (fat.client?.paymentTermDays || 30));
  const vencimentoDateStr = emissionDateObj.toLocaleDateString('pt-PT');

  const firstPageLimit = 8;
  const subsequentPageLimit = 16;
  
  let currentIndex = 0;
  let pageNum = 1;
  const totalPagesCount = workers.length <= firstPageLimit ? 1 : 1 + Math.ceil((workers.length - firstPageLimit) / subsequentPageLimit);

  while (currentIndex < workers.length || pageNum === 1) {
    const isFirstPage = pageNum === 1;
    const limit = isFirstPage ? firstPageLimit : subsequentPageLimit;
    const chunk = workers.slice(currentIndex, currentIndex + limit);
    currentIndex += limit;

    const pageDiv = document.createElement('div');
    pageDiv.className = 'pdf-portrait-page-export';
    pageDiv.style.width = '800px';
    pageDiv.style.height = '1130px';
    pageDiv.style.padding = '50px 45px';
    pageDiv.style.boxSizing = 'border-box';
    pageDiv.style.background = '#ffffff';
    pageDiv.style.position = 'relative';
    pageDiv.style.display = 'flex';
    pageDiv.style.flexDirection = 'column';

    let pageHtml = '';

    if (isFirstPage) {
      pageHtml = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
          <div>
            ${logoHtml}
            <p style="font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin: 4px 0 0 0;">Informe de Facturación</p>
            <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0;">MCS - Gestão Comercial</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.4;">
            <p style="font-weight: 700; color: #94a3b8; text-transform: uppercase; font-size: 9px; margin: 0;">Documento</p>
            <p style="font-weight: 800; color: #0f172a; font-size: 12px; margin: 2px 0 6px 0;">${docNumber}</p>
            <p style="margin: 0;">Emissão: <strong style="color: #334155;">${emissionDateStr}</strong></p>
            <p style="margin: 0;">Vencimento: <strong style="color: #334155;">${vencimentoDateStr}</strong></p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px;">
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; font-size: 11px; line-height: 1.4;">
            <p style="font-weight: 700; color: #94a3b8; text-transform: uppercase; font-size: 8px; margin: 0 0 4px 0;">Emissor</p>
            <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${targetEmpresa?.nome || 'STOCCO LDA'}</p>
            <p style="color: #64748b; margin: 0;">NIF: ${targetEmpresa?.tax_id || 'PT517834747'}</p>
            <p style="color: #64748b; margin: 0;">${targetEmpresa?.address_line || 'N/A'}</p>
            <p style="color: #64748b; margin: 0;">${[targetEmpresa?.postal_code, targetEmpresa?.city].filter(Boolean).join(' ')}</p>
          </div>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; font-size: 11px; line-height: 1.4;">
            <p style="font-weight: 700; color: #94a3b8; text-transform: uppercase; font-size: 8px; margin: 0 0 4px 0;">Cliente</p>
            <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${fat.client?.legal_name || fat.client?.razon_social || fat.client?.nombre_comercial || clientName}</p>
            <p style="color: #64748b; margin: 0;">NIF: ${fat.client?.tax_id || fat.client?.taxId || 'N/A'}</p>
            <p style="color: #64748b; margin: 0;">${fat.client?.address_line || 'N/A'}</p>
            <p style="color: #64748b; margin: 0;">${[fat.client?.postal_code, fat.client?.city, fat.client?.province].filter(Boolean).join(', ')}</p>
          </div>
        </div>

        <h5 style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin: 0 0 8px 0;">Resumo de Importes</h5>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 6px 10px; text-align: left; font-weight: 700; color: #475569;">Conceito</th>
              <th style="padding: 6px 10px; text-align: right; font-weight: 700; color: #475569; width: 110px;">Valor (€)</th>
              <th style="padding: 6px 10px; text-align: left; font-weight: 700; color: #475569;">Descrição</th>
              <th style="padding: 6px 10px; text-align: right; font-weight: 700; color: #475569; width: 120px;">Total (€)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">Importe total</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600;">€ ${totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 6px 10px; color: #64748b;">${desc}</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600; ">€ ${totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${inc > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0; color: #059669;">
              <td style="padding: 6px 10px; font-weight: 600;">Incrementos</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600;">€ ${inc.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 6px 10px; color: #059669;">${incDesc}</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600; ">€ ${inc.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            ${red > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0; color: #e11d48;">
              <td style="padding: 6px 10px; font-weight: 600;">Reduções</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600;">€ -${red.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 6px 10px; color: #e11d48;">${redDesc}</td>
              <td style="padding: 6px 10px; text-align: right; font-weight: 600; ">€ -${red.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            <tr style="background-color: #f8fafc; font-weight: 750;">
              <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;" colSpan="3">Total a facturar</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 800; font-size: 13px; color: #0f172a;">€ ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <h5 style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin: 0 0 6px 0;">Resumo de Horas por Obra</h5>
        <div style="text-align: center; font-weight: 700; font-size: 11px; background-color: #f1f5f9; padding: 6px; border-radius: 4px; color: #334155; margin-bottom: 20px;">
          OBRA: ${obraName.toUpperCase()}
        </div>
      `;
    } else {
      const periodYear = new Date(fat.created_at || fat.data_emissao).getFullYear();
      const periodMonth = new Date(fat.created_at || fat.data_emissao).getMonth() + 1;
      pageHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">
          <span style="font-size: 11px; font-weight: 700; color: #475569;">INFORME DE FACTURACIÓN — ${fat.client?.legal_name || fat.client?.razon_social || fat.client?.nombre_comercial || clientName} (${docNumber})</span>
          <span style="font-size: 10px; color: #64748b;">Período: ${String(periodMonth).padStart(2, '0')} / ${periodYear}</span>
        </div>
      `;
    }

    let tableHeaderHtml = `
      <h5 style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin: 0 0 8px 0;">Relación de Trabajadores</h5>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: auto;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 8px 12px; text-align: left; font-weight: 700; color: #475569;">Trabajador</th>
            <th style="padding: 8px 12px; text-align: right; font-weight: 700; color: #475569; width: 140px;">Quantidade de horas</th>
            <th style="padding: 8px 12px; text-align: right; font-weight: 700; color: #475569; width: 140px;">Preço hora (€)</th>
            <th style="padding: 8px 12px; text-align: right; font-weight: 700; color: #475569; width: 140px;">Total (€)</th>
          </tr>
        </thead>
        <tbody>
    `;

    let tableBodyRowsHtml = '';
    chunk.forEach(w => {
      const specialBadge = w.isException 
        ? `<span style="font-size: 8px; font-weight: 700; color: #d97706; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 4px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.02em; margin-left: 8px;">Tarifa Especial</span>`
        : '';
      const hasNight = Boolean(w.totalHorasNoturnas && w.totalHorasNoturnas > 0);
      const normais = w.totalHorasNormais ?? Math.max(0, w.totalHoras - (w.totalHorasNoturnas || 0));
      const noturnas = w.totalHorasNoturnas || 0;
      const tarifaNotu = w.tarifaNoturna || w.tarifa;

      if (hasNight) {
        if (normais > 0) {
          tableBodyRowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 12px; font-weight: 600; color: #1e293b; display: flex; align-items: center; justify-content: space-between;">
                <span>${w.workerName} <span style="font-size: 9px; color: #64748b; font-weight: normal;">(Diurnas ☀️)</span></span>
                ${specialBadge}
              </td>
              <td style="padding: 7px 12px; text-align: right;">${normais.toFixed(2)}h</td>
              <td style="padding: 7px 12px; text-align: right; ${w.isException ? 'color: #d97706; font-weight: 700;' : ''}">€ ${w.tarifa.toFixed(2)}</td>
              <td style="padding: 7px 12px; text-align: right; font-weight: 700;">€ ${(normais * w.tarifa).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        }
        tableBodyRowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 7px 12px; font-weight: 600; color: #1e293b; display: flex; align-items: center; justify-content: space-between;">
              <span>${w.workerName} <span style="font-size: 9px; color: #4f46e5; font-weight: 600;">(Noturnas 🌙)</span></span>
              ${specialBadge}
            </td>
            <td style="padding: 7px 12px; text-align: right; color: #4f46e5;">${noturnas.toFixed(2)}h</td>
            <td style="padding: 7px 12px; text-align: right; color: #4f46e5; font-weight: 600;">€ ${tarifaNotu.toFixed(2)}</td>
            <td style="padding: 7px 12px; text-align: right; font-weight: 700; color: #4f46e5;">€ ${(noturnas * tarifaNotu).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      } else {
        const rowTotalValor = w.totalValor > 0 ? w.totalValor : (w.totalHoras * w.tarifa);
        tableBodyRowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 12px; font-weight: 600; color: #1e293b; display: flex; align-items: center; justify-content: space-between;">
              <span>${w.workerName}</span>
              ${specialBadge}
            </td>
            <td style="padding: 7px 12px; text-align: right;">${w.totalHoras.toFixed(2)}h</td>
            <td style="padding: 7px 12px; text-align: right; ${w.isException ? 'color: #d97706; font-weight: 700;' : ''}">€ ${w.tarifa.toFixed(2)}</td>
            <td style="padding: 7px 12px; text-align: right; font-weight: 700;">€ ${rowTotalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      }
    });

    let tableFooterHtml = '';
    const isLastPage = currentIndex >= workers.length;

    if (isLastPage) {
      tableFooterHtml = `
        <tr style="background-color: #f8fafc; font-weight: 750; border-top: 2px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: 700; color: #1e293b;">Totais</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700;">${displayTotalHoras.toFixed(2)}h</td>
          <td style="padding: 8px 12px; text-align: right;">-</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #0f172a;">€ ${totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }

    tableHeaderHtml += tableBodyRowsHtml + tableFooterHtml + `
        </tbody>
      </table>
    `;

    let bankHtml = '';
    if (isLastPage && iban) {
      bankHtml = `
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-size: 11px; color: #64748b; font-weight: 500; white-space: pre-line; line-height: 1.4;">
          <span style="font-weight: 700; text-transform: uppercase; color: #94a3b8; font-size: 8px; display: block; margin-bottom: 2px;">Dados de Depósito / IBAN</span>
          ${iban}
        </div>
      `;
    }

    const footerHtml = `
      <div style="margin-top: auto; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 5px;">
        <span>MCS - Gestão Comercial</span>
        <span>Página ${pageNum} de ${totalPagesCount}</span>
      </div>
    `;

    pageDiv.innerHTML = pageHtml + tableHeaderHtml + bankHtml + footerHtml;
    container.appendChild(pageDiv);

    pageNum++;
  }

  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const pageElements = container.querySelectorAll('.pdf-portrait-page-export');
    
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          if (document.fonts) {
            document.fonts.forEach(font => clonedDoc.fonts.add(font));
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      if (i > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    
    document.body.removeChild(container);
    return pdf;
  } catch (err) {
    console.error("Erro ao gerar PDF do Informe:", err);
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    return null;
  }
}

export async function generateRelatorioHorasPDF(
  fat: any, 
  hours: any[], 
  clientName: string
): Promise<jsPDF | null> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '1120px';
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Inter', Arial, Helvetica, sans-serif";
  container.style.letterSpacing = '0.01px';
  
  const adj = fat.ajustes_json || fat.ajustesJson || {};
  const activeEdits = normalizeDisputedHoursMap(adj.disputed_hours || {});

  let disputeYear = new Date().getFullYear();
  let disputeMonth = new Date().getMonth();
  if (hours && hours.length > 0) {
    const sampleDate = hours.find((h: any) => h.data_trabalho)?.data_trabalho;
    if (sampleDate) {
      const parts = sampleDate.includes('T') ? sampleDate.split('T')[0].split('-') : sampleDate.split('-');
      if (parts.length >= 2) {
        disputeYear = parseInt(parts[0]);
        disputeMonth = parseInt(parts[1]) - 1;
      }
    }
  }
  
  const periodStr = `${MONTH_NAMES_PT[disputeMonth]} / ${disputeYear}`;
  
  const workersMap = new Map<string, {
    workerId: string;
    workerName: string;
    horasDiarias: Record<string, number>;
  }>();

  let totalHorasCalculadas = 0;
  let totalValorCalculado = 0;

  const groupedMap = new Map<string, { wId: string; dateKey: string; hours: number; rate: number; name: string }>();
  hours.forEach(h => {
    const wId = h.worker_id;
    if (!wId) return;
    const dKey = h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho;
    const key = `${wId}_${dKey}`;
    const name = h.worker?.nome || h.worker_nome || 'Colaborador';
    
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { wId, dateKey: dKey, hours: 0, rate: Number(h.tarifa_faturada || 0), name });
    }
    groupedMap.get(key)!.hours += Number(h.horas_totais || 0);
  });

  groupedMap.forEach((gVal, key) => {
    if (!workersMap.has(gVal.wId)) {
      workersMap.set(gVal.wId, {
        workerId: gVal.wId,
        workerName: gVal.name,
        horasDiarias: {}
      });
    }
    const wObj = workersMap.get(gVal.wId)!;
    const hoursVal = getDisputedHourValue(activeEdits, gVal.wId, gVal.dateKey, gVal.hours);
    
    wObj.horasDiarias[gVal.dateKey] = hoursVal;
    totalHorasCalculadas += hoursVal;
    totalValorCalculado += hoursVal * gVal.rate;
  });

  const reducoes = Number(adj.reducoes || 0);
  const incrementos = Number(adj.incrementos || 0);
  const ivaPct = Number(adj.iva_pct || 0);
  const finalNetValue = (totalValorCalculado + incrementos - reducoes) * (1 + ivaPct / 100);

  const groupedWorkers = Array.from(workersMap.values());
  const cycleStartDay = fat.client?.billing_cycle_start_day || 1;
  const daysArray = getBillingCycleDays(cycleStartDay, disputeYear, disputeMonth);

  const obraTitle = adj.obra
    ? `OBRA: ${adj.obra.toUpperCase()}`
    : 'OBRA: TODAS AS OBRAS';

  const tablesToRender = [
    {
      title: obraTitle,
      workers: groupedWorkers,
      totalHoras: totalHorasCalculadas,
      totalValor: totalValorCalculado
    }
  ];

  tablesToRender.forEach((table) => {
    const workers = table.workers;
    const firstPageLimit = 13;
    const subsequentPageLimit = 16;
    
    let currentIndex = 0;
    let tablePageNum = 1;
    
    while (currentIndex < workers.length || tablePageNum === 1) {
      const isFirstPage = tablePageNum === 1;
      const limit = isFirstPage ? firstPageLimit : subsequentPageLimit;
      const chunk = workers.slice(currentIndex, currentIndex + limit);
      currentIndex += limit;
      
      const pageDiv = document.createElement('div');
      pageDiv.className = 'pdf-page-hours-export';
      pageDiv.style.width = '1120px';
      pageDiv.style.height = '792px';
      pageDiv.style.padding = '40px';
      pageDiv.style.boxSizing = 'border-box';
      pageDiv.style.background = '#ffffff';
      pageDiv.style.position = 'relative';
      pageDiv.style.display = 'flex';
      pageDiv.style.flexDirection = 'column';
      
      let headerHtml = '';
      if (isFirstPage) {
        headerHtml = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">Relatório de Horas</h2>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Cliente: <strong>${clientName}</strong> | Período: <strong>${periodStr}</strong></p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 13px; color: #64748b; margin: 0;">Total de Horas: <strong style="color: #1e293b; font-size: 16px;">${totalHorasCalculadas.toFixed(2)}h</strong></p>
              <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Faturamento Base: <strong style="color: #1e293b; font-size: 14px;">€ ${totalValorCalculado.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
              ${reducoes > 0 ? `<p style="font-size: 11px; color: #e11d48; margin: 2px 0 0 0; font-weight: 700;">Desconto (${adj.reducoes_desc || 'EPIs'}): - € ${reducoes.toFixed(2)}</p>` : ''}
              ${incrementos > 0 ? `<p style="font-size: 11px; color: #16a34a; margin: 2px 0 0 0; font-weight: 700;">Acréscimo (${adj.incrementos_desc || 'Adicional'}): + € ${incrementos.toFixed(2)}</p>` : ''}
              <p style="font-size: 13px; color: #15803d; margin: 4px 0 0 0; font-weight: 800;">Total Final a Faturar: <strong style="color: #15803d; font-size: 16px;">€ ${finalNetValue.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
            </div>
          </div>
          <div style="text-align: center; font-weight: 800; font-size: 13px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 8px; color: #334155; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
            ${table.title}
          </div>
        `;
      } else {
        headerHtml = `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
            <span style="font-size: 12px; font-weight: 700; color: #475569;">Relatório de Horas — ${clientName} (${table.title})</span>
            <span style="font-size: 11px; color: #64748b;">Período: ${periodStr}</span>
          </div>
        `;
      }
      
      let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: auto;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0; width: 180px;">Trabalhador</th>
      `;
      
      daysArray.forEach(dInfo => {
        const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
        const dayOfWeek = cellDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const label = weekdays[dayOfWeek];
        
        let headerColor = '#64748b';
        let headerBg = '';
        if (isSunday) {
          headerColor = '#e11d48';
          headerBg = 'background-color: #ffe4e6;';
        } else if (isSaturday) {
          headerColor = '#d97706';
          headerBg = 'background-color: #fef3c7;';
        }
        
        tableHtml += `
          <th style="text-align: center; padding: 6px 1px; min-width: 22px; ${headerBg} border-right: 1px solid #e2e8f0;">
            <div style="font-size: 7px; text-transform: uppercase; color: ${headerColor}; font-weight: 700; line-height: 1;">${label}</div>
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 2px; line-height: 1;">${String(dInfo.day).padStart(2, '0')}</div>
          </th>
        `;
      });
      
      tableHtml += `
              <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569; width: 60px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      chunk.forEach(w => {
        const workerTotal = daysArray.reduce((sum, dInfo) => sum + (w.horasDiarias[dInfo.dateStr] || 0), 0);
        tableHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap;">${w.workerName}</td>
        `;
        
        daysArray.forEach(dInfo => {
          const dateKey = dInfo.dateStr;
          const hoursVal = w.horasDiarias[dateKey] || 0;
          
          const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
          const dayOfWeek = cellDate.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          
          let cellStyle = 'color: #94a3b8;';
          let cellBg = '';
          if (isSunday) {
            cellBg = 'background-color: #fff1f2;';
          } else if (isSaturday) {
            cellBg = 'background-color: #fffbeb;';
          }
          if (hoursVal > 0) {
            cellStyle = 'font-weight: 700; color: #0f172a;';
          }
          
          tableHtml += `
            <td style="text-align: center; padding: 6px 1px; ${cellBg} border-right: 1px solid #e2e8f0; ${cellStyle}">
              ${hoursVal > 0 ? hoursVal : '-'}
            </td>
          `;
        });
        
        tableHtml += `
            <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #1e293b;">${workerTotal.toFixed(2)}h</td>
          </tr>
        `;
      });
      
      tableHtml += `
          </tbody>
      `;
      
      const isLastChunk = currentIndex >= workers.length;
      if (isLastChunk) {
        tableHtml += `
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: 750; border-top: 2px solid #e2e8f0;">
              <td style="padding: 8px 10px; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0;">Total ${table.title}</td>
        `;
        
        daysArray.forEach(dInfo => {
          const dayTotal = workers.reduce((sum, w) => sum + (w.horasDiarias[dInfo.dateStr] || 0), 0);
          tableHtml += `
            <td style="text-align: center; padding: 6px 1px; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0;">
              ${dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
            </td>
          `;
        });
        
        tableHtml += `
              <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #0f172a;">${table.totalHoras.toFixed(2)}h</td>
            </tr>
          </tfoot>
        `;
      }
      
      tableHtml += `
        </table>
      `;
      
      const footerHtml = `
        <div style="margin-top: auto; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 5px;">
          <span>MCS - Gestão Comercial</span>
          <span>Página ${tablePageNum}</span>
        </div>
      `;
      
      pageDiv.innerHTML = headerHtml + tableHtml + footerHtml;
      container.appendChild(pageDiv);
      
      tablePageNum++;
    }
  });

  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const pageElements = container.querySelectorAll('.pdf-page-hours-export');
    
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          if (document.fonts) {
            document.fonts.forEach(font => clonedDoc.fonts.add(font));
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      if (i > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }
    
    document.body.removeChild(container);
    return pdf;
  } catch (error) {
    console.error("Erro ao gerar PDF de horas:", error);
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    return null;
  }
}
