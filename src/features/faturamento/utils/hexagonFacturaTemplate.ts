import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const HEXAGON_EMPRESA_ID = '2c944db5-f1d0-4789-a562-8cfa1c0155b7';
export const HEXAGON_DEFAULT_LOGO_URL = '/logos/hexagon-logo-main.png';

export function resolveHexagonLogoUrl(rawUrl?: string | null): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://mcs.gestaologinpro.com';
  const mainLogoFullUrl = `${origin}/logos/hexagon-logo-main.png`;

  if (!rawUrl) return mainLogoFullUrl;
  const trimmed = String(rawUrl).trim();
  if (!trimmed) return mainLogoFullUrl;
  if (trimmed.startsWith('data:')) return trimmed;

  // Replace white-emblem dark-background logo (logo-hexagon.png) with green+copper white-paper logo
  if (trimmed.includes('logo-hexagon.png') || trimmed.endsWith('/logos/hexagon-logo-main.png')) {
    return mainLogoFullUrl;
  }
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  return trimmed;
}

export const DEFAULT_HEXAGON_DIRECT_DESCRIPTION =
  'Prestación de servicios comerciales, administrativos, ayudas con buscas de alojamientos, alquileres de coches, compra de epis y herramientas.';

export type HexagonIvaMode =
  | 'exento_intracomunitario'
  | 'iva_incluido'
  | 'iva_general_extra'
  | 'isp_0';

export interface DirectInvoiceLineItem {
  id: string;
  descricao: string;
  subdescricao?: string;
  quantidade: number;
  unidade?: string;
  valorUnitario: number;
  desconto?: number;
}

export interface DirectInvoiceCalculationResult {
  ivaMode: HexagonIvaMode;
  ivaPct: number;
  baseImponible: number;
  cuotaIva: number;
  totalFactura: number;
  claveRegimenLabel: string;
  defaultNotaLegal: string;
  normalizedItems: Array<{
    descricao: string;
    subdescricao?: string;
    quantidade: number;
    unidade: string;
    precoUnitarioBase: number;
    descontoBase: number;
    ivaPct: number;
    subtotalBase: number;
  }>;
}

export function round2(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

export function getDefaultNotaLegalForMode(mode: HexagonIvaMode, ivaPct = 21): string {
  switch (mode) {
    case 'exento_intracomunitario':
      return '«Entrega intracomunitaria exenta por aplicación de lo previsto en el art. 25.1 de la Ley 37/1992 del IVA y el art. 6.1.j del Real Decreto 1619/2012 de 30 de noviembre».';
    case 'iva_incluido':
      return `Operación sujeta al Tipo General de IVA (${ivaPct}% - Art. 90 Ley 37/1992). Importe total acordado con IVA incluido y desglosado en factura.`;
    case 'iva_general_extra':
      return `Operación sujeta al Tipo General de IVA (${ivaPct}% - Art. 90 Ley 37/1992).`;
    case 'isp_0':
      return '«Operación con Inversión del Sujeto Pasivo de acuerdo al artículo 84.Uno.2º.f) de la Ley 37/1992 del Impuesto sobre el Valor Añadido (IVA)».';
    default:
      return '';
  }
}

export function getClaveRegimenForMode(mode: HexagonIvaMode): string {
  switch (mode) {
    case 'exento_intracomunitario':
      return '02 - Op. Intracomunitaria Exenta';
    case 'iva_incluido':
      return '01 - Régimen General (IVA Incl.)';
    case 'iva_general_extra':
      return '01 - Régimen General';
    case 'isp_0':
      return '14 - Inv. Sujeto Pasivo (ISP)';
    default:
      return '01 - Régimen General';
  }
}

export function computeDirectInvoiceTotals(params: {
  items?: DirectInvoiceLineItem[];
  singleDescription?: string;
  singleSubdescription?: string;
  singleQuantity?: number;
  singleAmount?: number;
  ivaMode?: HexagonIvaMode;
  customIvaPct?: number;
  incrementos?: number;
  reducoes?: number;
}): DirectInvoiceCalculationResult {
  const mode: HexagonIvaMode = params.ivaMode || 'exento_intracomunitario';
  const effectiveIvaPct =
    mode === 'exento_intracomunitario' || mode === 'isp_0'
      ? 0
      : params.customIvaPct !== undefined && params.customIvaPct > 0
        ? Number(params.customIvaPct)
        : 21;

  const rawItems: DirectInvoiceLineItem[] =
    params.items && params.items.length > 0
      ? params.items
      : [
          {
            id: '1',
            descricao: params.singleDescription || DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
            subdescricao: params.singleSubdescription || '',
            quantidade: params.singleQuantity !== undefined && params.singleQuantity > 0 ? Number(params.singleQuantity) : 1,
            unidade: 'ud',
            valorUnitario: Number(params.singleAmount || 0),
            desconto: 0,
          },
        ];

  const incrementos = Number(params.incrementos || 0);
  const reducoes = Number(params.reducoes || 0);

  const rawLinesTotal = rawItems.reduce((acc, item) => {
    const qty = Number(item.quantidade || 1);
    const price = Number(item.valorUnitario || 0);
    const disc = Number(item.desconto || 0);
    return acc + Math.max(0, qty * price - disc);
  }, 0);

  const rawGrandInput = Math.max(0, rawLinesTotal + incrementos - reducoes);

  let baseImponible = 0;
  let cuotaIva = 0;
  let totalFactura = 0;

  if (mode === 'iva_incluido') {
    totalFactura = round2(rawGrandInput);
    baseImponible = round2(totalFactura / (1 + effectiveIvaPct / 100));
    cuotaIva = round2(totalFactura - baseImponible);
  } else if (mode === 'iva_general_extra') {
    baseImponible = round2(rawGrandInput);
    cuotaIva = round2(baseImponible * (effectiveIvaPct / 100));
    totalFactura = round2(baseImponible + cuotaIva);
  } else {
    // exento_intracomunitario or isp_0
    baseImponible = round2(rawGrandInput);
    cuotaIva = 0;
    totalFactura = baseImponible;
  }

  const divisor = mode === 'iva_incluido' ? 1 + effectiveIvaPct / 100 : 1;

  const normalizedItems = rawItems.map((item, idx) => {
    const qty = Number(item.quantidade || 1);
    const rawUnit = Number(item.valorUnitario || 0);
    const rawDisc = Number(item.desconto || 0);
    const rawLineGross = Math.max(0, qty * rawUnit - rawDisc);
    const subtotalBase = round2(rawLineGross / divisor);
    const descontoBase = round2(rawDisc / divisor);
    const precoUnitarioBase = qty > 0 ? round2((subtotalBase + descontoBase) / qty) : subtotalBase;

    return {
      descricao: item.descricao || DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
      subdescricao: item.subdescricao || '',
      quantidade: qty,
      unidade: item.unidade || 'ud',
      precoUnitarioBase,
      descontoBase,
      ivaPct: effectiveIvaPct,
      subtotalBase:
        idx === rawItems.length - 1 && rawItems.length === 1 && incrementos === 0 && reducoes === 0
          ? baseImponible
          : subtotalBase,
    };
  });

  return {
    ivaMode: mode,
    ivaPct: effectiveIvaPct,
    baseImponible,
    cuotaIva,
    totalFactura,
    claveRegimenLabel: getClaveRegimenForMode(mode),
    defaultNotaLegal: getDefaultNotaLegalForMode(mode, effectiveIvaPct),
    normalizedItems,
  };
}

export function isHexagonOrDirectSpanishFatura(fat: any, targetEmpresa?: any): boolean {
  const adj = fat?.ajustes_json || fat?.ajustesJson || {};
  if (adj?.template_modelo === 'hexagon_es' || adj?.sem_horas === true || adj?.tipo_fatura === 'direta') {
    return true;
  }
  const empId = fat?.empresa_id || fat?.empresaId || targetEmpresa?.id;
  if (empId === HEXAGON_EMPRESA_ID) return true;

  const code = String(targetEmpresa?.codigo || fat?.empresa?.codigo || '').toUpperCase();
  if (code === 'HEX') return true;

  const empName = String(
    targetEmpresa?.legal_name ||
      targetEmpresa?.legalName ||
      targetEmpresa?.nome ||
      fat?.empresaLegalName ||
      fat?.empresaNome ||
      fat?.empresa?.legal_name ||
      fat?.empresa?.nome ||
      ''
  ).toLowerCase();

  return empName.includes('hexagon');
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMoneyEs(value: number): string {
  return Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

let cachedLogoDataUrl: Record<string, string> = {};

export async function preloadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (cachedLogoDataUrl[url]) return cachedLogoDataUrl[url];

  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = typeof reader.result === 'string' ? reader.result : null;
        if (res) cachedLogoDataUrl[url] = res;
        resolve(res);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface HexagonFacturaHtmlParams {
  fat: any;
  targetEmpresa?: any;
  clientName?: string;
  emissionDateStr: string;
  vencimentoDateStr: string;
  totalHoras?: number;
  baseImponible: number;
  cuotaIva: number;
  ivaPct: number;
  totalFactura: number;
  logoSrc?: string | null;
}

export function extractHexagonFinancialsFromFatura(
  fat: any,
  computedHoursBaseVal = 0,
  computedTotalHoras = 0
): {
  isSemHoras: boolean;
  ivaMode: HexagonIvaMode;
  ivaPct: number;
  baseImponible: number;
  cuotaIva: number;
  totalFactura: number;
  totalHoras: number;
  incrementos: number;
  incrementosDesc: string;
  reducoes: number;
  reducoesDesc: string;
  notaLegalIva: string;
  claveRegimenLabel: string;
  items: DirectInvoiceCalculationResult['normalizedItems'];
} {
  const adj = fat?.ajustes_json || fat?.ajustesJson || {};
  const isSemHoras = Boolean(adj.sem_horas || adj.tipo_fatura === 'direta');
  const incrementos = Number(adj.incrementos || 0);
  const incrementosDesc = adj.incrementos_desc || adj.incrementosDesc || 'Incremento Adicional';
  const reducoes = Number(adj.reducoes || 0);
  const reducoesDesc = adj.reducoes_desc || adj.reducoesDesc || 'Reducción Comercial';

  if (isSemHoras) {
    const ivaMode: HexagonIvaMode =
      adj.iva_mode ||
      (Number(adj.iva_pct || 0) > 0 ? 'iva_incluido' : 'exento_intracomunitario');
    const customIvaPct =
      adj.iva_pct !== undefined ? Number(adj.iva_pct) : adj.ivaPct !== undefined ? Number(adj.ivaPct) : 0;

    const calc = computeDirectInvoiceTotals({
      items: Array.isArray(adj.itens_manuais) && adj.itens_manuais.length > 0 ? adj.itens_manuais : undefined,
      singleDescription: adj.descricao_servico || adj.descricaoServico || DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
      singleSubdescription: adj.detalhes_apontamentos || '',
      singleQuantity: adj.quantidade !== undefined ? Number(adj.quantidade) : 1,
      singleAmount:
        adj.valor_digitado !== undefined
          ? Number(adj.valor_digitado)
          : adj.total_valor_base !== undefined
            ? Number(adj.total_valor_base)
            : Number(fat?.total_valor || 0),
      ivaMode,
      customIvaPct,
      incrementos,
      reducoes,
    });

    // Respect stored overrides if explicitly edited in Tracking
    const baseImponible =
      adj.total_valor_base !== undefined && !adj.valor_digitado
        ? round2(Number(adj.total_valor_base) + incrementos - reducoes)
        : calc.baseImponible;
    const ivaPct = calc.ivaPct;
    const cuotaIva =
      adj.iva_valor !== undefined && !adj.valor_digitado
        ? round2(Number(adj.iva_valor))
        : calc.cuotaIva;
    const totalFactura =
      adj.total_valor !== undefined && !adj.valor_digitado
        ? round2(Number(adj.total_valor))
        : calc.totalFactura;

    return {
      isSemHoras: true,
      ivaMode,
      ivaPct,
      baseImponible,
      cuotaIva,
      totalFactura,
      totalHoras: 0,
      incrementos,
      incrementosDesc,
      reducoes,
      reducoesDesc,
      notaLegalIva: adj.nota_legal_iva || calc.defaultNotaLegal,
      claveRegimenLabel: calc.claveRegimenLabel,
      items: calc.normalizedItems,
    };
  }

  // Hour-based Hexagon invoice
  const ivaPct = Number(adj.iva_pct !== undefined ? adj.iva_pct : adj.ivaPct || 0);
  const rawBase =
    computedHoursBaseVal > 0
      ? computedHoursBaseVal
      : Number(adj.total_valor_base || fat?.total_valor_base || fat?.totalValor || 0);
  const baseImponible = round2(rawBase + incrementos - reducoes);
  const cuotaIva = round2(baseImponible * (ivaPct / 100));
  const totalFactura = round2(baseImponible + cuotaIva);
  const ivaMode: HexagonIvaMode =
    adj.iva_mode || (ivaPct > 0 ? 'iva_general_extra' : 'isp_0');

  const desc = adj.descricao_servico || adj.descricaoServico || 'Prestación de Servicios Industriales';
  const totalH = computedTotalHoras > 0 ? computedTotalHoras : Number(adj.total_horas || fat?.total_horas || fat?.totalHoras || 0);

  return {
    isSemHoras: false,
    ivaMode,
    ivaPct,
    baseImponible,
    cuotaIva,
    totalFactura,
    totalHoras: totalH,
    incrementos,
    incrementosDesc,
    reducoes,
    reducoesDesc,
    notaLegalIva: adj.nota_legal_iva || getDefaultNotaLegalForMode(ivaMode, ivaPct),
    claveRegimenLabel: getClaveRegimenForMode(ivaMode),
    items: [
      {
        descricao: desc,
        subdescricao: totalH > 0 ? `Total horas validadas en período: ${formatMoneyEs(totalH)} h` : '',
        quantidade: 1,
        unidade: 'servicio',
        precoUnitarioBase: round2(rawBase),
        descontoBase: 0,
        ivaPct,
        subtotalBase: round2(rawBase),
      },
    ],
  };
}

export function buildHexagonFacturaHtml(params: HexagonFacturaHtmlParams): string {
  const { fat, targetEmpresa, clientName, emissionDateStr, vencimentoDateStr, logoSrc } = params;
  const adj = fat?.ajustes_json || fat?.ajustesJson || {};

  const extracted = extractHexagonFinancialsFromFatura(
    fat,
    params.baseImponible,
    params.totalHoras || 0
  );

  const isSemHoras = extracted.isSemHoras;
  const baseImponible = params.baseImponible !== undefined ? params.baseImponible : extracted.baseImponible;
  const cuotaIva = params.cuotaIva !== undefined ? params.cuotaIva : extracted.cuotaIva;
  const ivaPct = params.ivaPct !== undefined ? params.ivaPct : extracted.ivaPct;
  const totalFactura = params.totalFactura !== undefined ? params.totalFactura : extracted.totalFactura;
  const verifactuEnabled = Boolean(adj.verifactu_enabled === true);

  // Issuer (Hexagon) details
  const empLegalName =
    targetEmpresa?.legal_name ||
    targetEmpresa?.legalName ||
    fat?.empresaLegalName ||
    'HEXAGON MONTAJES INDUSTRIALES, S.L.';
  const rawEmpNif =
    targetEmpresa?.tax_id || targetEmpresa?.taxId || fat?.empresaTaxId || 'B05688197';
  const empNifDisplay = rawEmpNif.startsWith('ES') ? `${rawEmpNif.slice(2)} (${rawEmpNif})` : `${rawEmpNif} (ES${rawEmpNif})`;
  const empAddress =
    targetEmpresa?.address_line ||
    targetEmpresa?.addressLine ||
    fat?.empresaAddressLine ||
    'CL. ARCHIVERO DIMAS PEREZ, 2';
  const empPostalCity =
    [
      targetEmpresa?.postal_code || targetEmpresa?.postalCode || fat?.empresaPostalCode || '16400',
      targetEmpresa?.city || fat?.empresaCity || 'TARANCÓN (CUENCA)',
    ]
      .filter(Boolean)
      .join(' ') || '16400 TARANCÓN (CUENCA)';
  const empEmail =
    targetEmpresa?.email || fat?.empresaEmail || 'adm@montajeshexagon.com';

  // Document Number
  const rawDocNum =
    fat?.fatura_numero ||
    fat?.faturaNumero ||
    adj?.fatura_numero_manual ||
    `HEX-${new Date().getFullYear()}/${String(targetEmpresa?.next_invoice_number || targetEmpresa?.nextInvoiceNumber || 1).padStart(4, '0')}`;
  const cleanDocNum = String(rawDocNum).replace(/^Factura\s*(n[º°]\s*)?/i, '').trim() || rawDocNum;

  // Client details
  const clientObj = fat?.client || {};
  const destLegalName =
    clientObj.legal_name ||
    clientObj.razon_social ||
    clientObj.nombre_comercial ||
    clientObj.trade_name ||
    fat?.clientLegalName ||
    fat?.clientName ||
    clientName ||
    'CLIENTE';
  const destTaxId =
    clientObj.tax_id ||
    clientObj.taxId ||
    clientObj.cif_nif ||
    fat?.taxId ||
    adj?.cliente_nif ||
    'N/A';
  const destAddress =
    clientObj.address_line ||
    fat?.clientAddressLine ||
    adj?.cliente_morada ||
    '—';
  const destPostalCity = [
    clientObj.postal_code || fat?.clientPostalCode || adj?.cliente_cp,
    clientObj.city || fat?.clientCity || adj?.cliente_cidade,
  ]
    .filter(Boolean)
    .join(' ');
  const destCountry =
    clientObj.countryName ||
    clientObj.country ||
    clientObj.country_name ||
    fat?.clientCountryName ||
    clientObj.province ||
    fat?.clientProvince ||
    adj?.cliente_pais ||
    'España';
  const destEmail =
    clientObj.billingEmail ||
    clientObj.billing_email ||
    clientObj.clientEmail ||
    clientObj.email ||
    fat?.billingEmail ||
    fat?.clientEmail ||
    '';

  const obraName = adj?.obra && adj.obra !== 'SIN OBRA' && adj.obra !== 'Sem Obra' ? String(adj.obra) : '';
  const periodoLabel = adj?.periodo_referencia_label || '';

  // Bank / Payment details
  const ibanRaw =
    adj?.iban ||
    targetEmpresa?.bank_details ||
    targetEmpresa?.bankDetails ||
    targetEmpresa?.iban ||
    fat?.empresaBankDetails ||
    fat?.empresaIban ||
    '';
  const bicRaw = adj?.bic || '';
  const formaPagamento =
    adj?.forma_pagamento ||
    adj?.condicoes_pagamento ||
    'Transferencia Bancaria';

  const effectiveLogoUrl = resolveHexagonLogoUrl(
    logoSrc ||
      targetEmpresa?.invoice_logo_url ||
      targetEmpresa?.invoiceLogoUrl ||
      fat?.empresaInvoiceLogoUrl ||
      HEXAGON_DEFAULT_LOGO_URL
  );

  const itemsRowsHtml = extracted.items
    .map((item, index) => {
      const qtyStr = formatMoneyEs(item.quantidade);
      const unitPriceStr = `${formatMoneyEs(item.precoUnitarioBase)} €`;
      const discStr = formatMoneyEs(item.descontoBase || 0);
      const ivaStr = `${formatMoneyEs(item.ivaPct)}%`;
      const lineBaseStr = `${formatMoneyEs(item.subtotalBase)} €`;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 1 ? 'background: #f8fafc;' : 'background: #ffffff;'}">
          <td style="padding: 11px 10px; text-align: center; font-family: 'JetBrains Mono', monospace; color: #475569; font-size: 10.5px;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 11px 12px; color: #0f172a; line-height: 1.45;">
            <div style="font-weight: 700; font-size: 11px; color: #0f172a; white-space: pre-line;">${escapeHtml(item.descricao)}</div>
            ${
              item.subdescricao
                ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 4px; white-space: pre-line;">${escapeHtml(item.subdescricao)}</div>`
                : ''
            }
          </td>
          <td style="padding: 11px 10px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #1e293b;">${qtyStr}</td>
          <td style="padding: 11px 10px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #1e293b;">${unitPriceStr}</td>
          <td style="padding: 11px 8px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #64748b;">${discStr}</td>
          <td style="padding: 11px 10px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #1e293b;">${ivaStr}</td>
          <td style="padding: 11px 12px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 11px; color: #0f172a;">${lineBaseStr}</td>
        </tr>
      `;
    })
    .join('');

  const incRowHtml =
    extracted.incrementos > 0
      ? `
        <tr style="border-bottom: 1px solid #e2e8f0; color: #047857; background: #f0fdf4;">
          <td style="padding: 9px 10px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px;">+</td>
          <td style="padding: 9px 12px; font-weight: 600; font-size: 10.5px;">${escapeHtml(extracted.incrementosDesc)}</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">1,00</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">${formatMoneyEs(extracted.incrementos)} €</td>
          <td style="padding: 9px 8px; text-align: right; font-family: 'JetBrains Mono', monospace;">0,00</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">${formatMoneyEs(ivaPct)}%</td>
          <td style="padding: 9px 12px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700;">${formatMoneyEs(extracted.incrementos)} €</td>
        </tr>
      `
      : '';

  const redRowHtml =
    extracted.reducoes > 0
      ? `
        <tr style="border-bottom: 1px solid #e2e8f0; color: #be123c; background: #fff1f2;">
          <td style="padding: 9px 10px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px;">-</td>
          <td style="padding: 9px 12px; font-weight: 600; font-size: 10.5px;">${escapeHtml(extracted.reducoesDesc)}</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">1,00</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">-${formatMoneyEs(extracted.reducoes)} €</td>
          <td style="padding: 9px 8px; text-align: right; font-family: 'JetBrains Mono', monospace;">0,00</td>
          <td style="padding: 9px 10px; text-align: right; font-family: 'JetBrains Mono', monospace;">${formatMoneyEs(ivaPct)}%</td>
          <td style="padding: 9px 12px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700;">-${formatMoneyEs(extracted.reducoes)} €</td>
        </tr>
      `
      : '';

  return `
    <div style="width: 800px; min-height: 1130px; height: 1130px; background: #ffffff; padding: 40px 44px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border-top: 8px solid #183935; font-family: 'Inter', Arial, Helvetica, sans-serif; color: #0f172a; position: relative; font-variant-ligatures: none;">
      <div>
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
          <div style="display: flex; flex-direction: column; gap: 6px; max-width: 440px;">
            ${
              effectiveLogoUrl
                ? `<img src="${escapeHtml(effectiveLogoUrl)}" crossorigin="anonymous" alt="Hexagon" style="height: 52px; max-width: 220px; object-fit: contain; object-position: left center;" />`
                : `<div style="font-size: 22px; font-weight: 900; color: #183935; letter-spacing: 0.04em;">HEXAGON</div>`
            }
            <span style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.15em; color: #c88d65; text-transform: uppercase;">
              Montajes Industriales &amp; Servicios · España &amp; UE
            </span>
            <div style="font-size: 10px; color: #475569; line-height: 1.45; margin-top: 2px;">
              <strong style="color: #0f172a;">${escapeHtml(empLegalName)}</strong> · NIF: <strong>${escapeHtml(rawEmpNif)}</strong><br/>
              ${escapeHtml(empAddress)} · ${escapeHtml(empPostalCity)} — España<br/>
              ${escapeHtml(empEmail)}
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 16px;">
            <div style="text-align: right;">
              <div style="display: inline-block; background: #183935; color: #ffffff; font-size: 8.5px; font-weight: 700; padding: 3px 10px 6px 10px; line-height: 1.1; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">
                Factura Oficial · Original
              </div>
              <div style="font-size: 23px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.1;">
                FACTURA
              </div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #c88d65; margin-top: 3px;">
                Nº ${escapeHtml(cleanDocNum)}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 8px; line-height: 1.55;">
                Fecha Expedición: <strong style="color: #0f172a;">${escapeHtml(emissionDateStr)}</strong><br/>
                ${
                  periodoLabel
                    ? `Período Ref.: <strong style="color: #0f172a;">${escapeHtml(periodoLabel)}</strong><br/>`
                    : ''
                }
                Fecha Vencimiento: <strong style="color: #0f172a;">${escapeHtml(vencimentoDateStr)}</strong>
              </div>
            </div>

            ${
              verifactuEnabled && adj?.verifactu_qr_data_url
                ? `
                  <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #f8fafc; display: flex; flex-direction: column; align-items: center; width: 128px; text-align: center;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #0f172a; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px;">QR Tributario</div>
                    <img src="${escapeHtml(adj.verifactu_qr_data_url)}" style="width: 96px; height: 96px; background: #fff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 4px;" />
                    <div style="font-size: 8.5px; font-weight: 800; color: #183935; margin-top: 4px;">VERI*FACTU</div>
                  </div>
                `
                : ''
            }
          </div>
        </div>

        <!-- PARTIES & FISCAL METADATA GRID -->
        <div style="display: grid; grid-template-columns: 1.15fr 0.85fr 1.15fr; gap: 14px; margin: 20px 0;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 13px 15px; font-size: 10.5px; line-height: 1.5;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #c88d65; margin-bottom: 5px;">
              Emisor / Prestador
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
              ${escapeHtml(empLegalName)}
            </div>
            <div style="color: #475569;">
              <strong>NIF / IVA:</strong> ${escapeHtml(empNifDisplay)}<br/>
              ${escapeHtml(empAddress)}<br/>
              ${escapeHtml(empPostalCity)} — España<br/>
              <strong>Contacto:</strong> ${escapeHtml(empEmail)}
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 13px 15px; font-size: 10px; line-height: 1.45;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #c88d65; margin-bottom: 5px;">
              Datos Fiscales &amp; Control
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3.5px 0; border-bottom: 1px dashed #e2e8f0;">
              <span style="color: #64748b; font-weight: 600;">Factura Nº:</span>
              <span style="color: #0f172a; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${escapeHtml(cleanDocNum)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3.5px 0; border-bottom: 1px dashed #e2e8f0;">
              <span style="color: #64748b; font-weight: 600;">Tipo Factura:</span>
              <span style="color: #0f172a; font-weight: 700;">F1 (Ordinaria)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3.5px 0; border-bottom: 1px dashed #e2e8f0; gap: 6px;">
              <span style="color: #64748b; font-weight: 600; white-space: nowrap;">Régimen:</span>
              <span style="color: #0f172a; font-weight: 700; text-align: right; font-size: 9.5px;">${escapeHtml(extracted.claveRegimenLabel)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3.5px 0;">
              <span style="color: #64748b; font-weight: 600;">Moneda:</span>
              <span style="color: #0f172a; font-weight: 700;">EUR (€)</span>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 13px 15px; font-size: 10.5px; line-height: 1.5;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #c88d65; margin-bottom: 5px;">
              Cliente / Destinatario
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
              ${escapeHtml(destLegalName)}
            </div>
            <div style="color: #475569;">
              <strong>NIF / IVA:</strong> ${escapeHtml(destTaxId)}<br/>
              ${escapeHtml(destAddress)}<br/>
              ${escapeHtml([destPostalCity, destCountry].filter(Boolean).join(' — '))}
              ${destEmail ? `<br/><strong>Email:</strong> ${escapeHtml(destEmail)}` : ''}
            </div>
          </div>
        </div>

        ${
          obraName
            ? `
              <div style="background: linear-gradient(90deg, #183935 0%, #234f4a 100%); color: #ffffff; border-radius: 6px; padding: 9px 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; font-size: 10.5px;">
                <div><strong style="color: #e5a97c;">REFERENCIA / PROYECTO:</strong> ${escapeHtml(obraName)}</div>
                ${
                  !isSemHoras && extracted.totalHoras > 0
                    ? `<div><strong style="color: #e5a97c;">TOTAL HORAS:</strong> ${formatMoneyEs(extracted.totalHoras)} h</div>`
                    : ''
                }
              </div>
            `
            : ''
        }

        <!-- ITEMS TABLE -->
        <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin-bottom: 7px;">
          Detalle de Servicios Facturados
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 22px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #183935; color: #ffffff;">
              <th style="width: 42px; padding: 9px 10px; text-align: center; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Ítem</th>
              <th style="padding: 9px 12px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Descripción del Servicio / Concepto</th>
              <th style="width: 68px; padding: 9px 10px; text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Cant.</th>
              <th style="width: 96px; padding: 9px 10px; text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Precio Unit.</th>
              <th style="width: 62px; padding: 9px 8px; text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Dto.</th>
              <th style="width: 68px; padding: 9px 10px; text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">IVA (%)</th>
              <th style="width: 112px; padding: 9px 12px; text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Base Imp.</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            ${incRowHtml}
            ${redRowHtml}
          </tbody>
        </table>

        <!-- SUMMARY & BANK / TAX NOTES -->
        <div style="display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 22px; margin-bottom: 16px;">
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 13px 15px; background: #fcfcfd; font-size: 10px; line-height: 1.5; color: #475569;">
            <div style="font-size: 9.5px; font-weight: 800; color: #183935; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
              Información de Pago y Mención Fiscal IVA
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: #0f172a;">Forma de Pago:</strong> ${escapeHtml(formaPagamento)}<br/>
              ${
                ibanRaw
                  ? `<div style="margin-top: 4px; color: #0f172a; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; white-space: pre-line;">${escapeHtml(ibanRaw)}${bicRaw && !/bic|swift/i.test(String(ibanRaw)) ? `\nBIC / SWIFT: ${escapeHtml(bicRaw)}` : ''}</div>`
                  : `<span style="color: #64748b;">Titular: ${escapeHtml(empLegalName)}</span>`
              }
            </div>
            ${
              extracted.notaLegalIva
                ? `
                  <div style="border-top: 1px dashed #cbd5e1; padding-top: 7px; font-size: 9.5px; color: #334155; font-style: italic;">
                    <strong style="font-style: normal; color: #183935;">Mención IVA:</strong> ${escapeHtml(extracted.notaLegalIva)}
                  </div>
                `
                : ''
            }
          </div>

          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; align-self: start;">
            ${
              !isSemHoras && extracted.totalHoras > 0
                ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 14px; font-size: 10.5px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <span style="color: #475569; font-weight: 600;">Total Horas Facturadas</span>
                    <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a;">${formatMoneyEs(extracted.totalHoras)} h</span>
                  </div>
                `
                : ''
            }
            <div style="display: flex; justify-content: space-between; padding: 9px 14px; font-size: 11px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
              <span style="color: #475569; font-weight: 600;">Base Imponible (Subtotal)</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a;">${formatMoneyEs(baseImponible)} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 9px 14px; font-size: 11px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
              <span style="color: #475569; font-weight: 600;">Cuota IVA (${formatMoneyEs(ivaPct)}% s/ ${formatMoneyEs(baseImponible)} €)</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a;">${formatMoneyEs(cuotaIva)} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 13px 14px; font-size: 14px; font-weight: 800; background: #183935; color: #ffffff;">
              <span>TOTAL FACTURA</span>
              <span style="font-family: 'JetBrains Mono', monospace; color: #e5a97c;">${formatMoneyEs(totalFactura)} €</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div>
        ${
          verifactuEnabled && adj?.verifactu_hash
            ? `
              <div style="border: 1px solid #cbd5e1; background: #f1f5f9; border-radius: 6px; padding: 9px 13px; font-size: 8.5px; color: #334155; display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 12px;">
                <div>
                  <strong style="color: #183935;">REGISTRO DE FACTURACIÓN VERI*FACTU (RD 1007/2023)</strong><br/>
                  <span>Huella SHA-256: <span style="font-family: 'JetBrains Mono', monospace; background: #e2e8f0; padding: 1px 5px; border-radius: 3px;">${escapeHtml(adj.verifactu_hash)}</span></span>
                </div>
                <div style="text-align: right;">
                  <span>Estado AEAT: <strong style="color: #059669;">${escapeHtml(adj.verifactu_status || 'REGISTRADA')}</strong></span>
                </div>
              </div>
            `
            : ''
        }
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b;">
          <span>${escapeHtml(empLegalName)} · NIF ${escapeHtml(rawEmpNif)} · ${escapeHtml(empPostalCity)}, España</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  `;
}

export async function renderHexagonFacturaPDF(params: HexagonFacturaHtmlParams): Promise<jsPDF | null> {
  const logoUrl = resolveHexagonLogoUrl(
    params.logoSrc ||
      params.targetEmpresa?.invoice_logo_url ||
      params.targetEmpresa?.invoiceLogoUrl ||
      params.fat?.empresaInvoiceLogoUrl ||
      HEXAGON_DEFAULT_LOGO_URL
  );

  const dataUrlLogo = await preloadImageAsDataUrl(logoUrl);
  const html = buildHexagonFacturaHtml({
    ...params,
    logoSrc: dataUrlLogo || logoUrl,
  });

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const targetEl = (container.firstElementChild as HTMLElement) || container;
    const canvas = await html2canvas(targetEl, {
      scale: 2.0,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 800,
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    return pdf;
  } catch (err) {
    console.error('Erro ao renderizar PDF executivo Hexagon:', err);
    return null;
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
