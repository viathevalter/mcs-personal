import { jsPDF } from 'jspdf';
import {
  type TermoResponsabilidadeAlojamento,
  CLAUSULAS_TERMO_ALOJAMENTO,
  CHECKLIST_ITEMS_CATALOG,
  type EstadoConservacion
} from '../services/termoResponsabilidadeService';

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawPageHeader(doc: jsPDF, termo: TermoResponsabilidadeAlojamento, pageNum: number) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top dark corporate banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent gold/blue stripe
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Left: Company & Dept
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((termo.empresa_contratante || 'GRUPO MCS').toUpperCase(), 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('DEPARTAMENTO DE LOGÍSTICA CORPORATIVA • GESTIÓN DE ALOJAMIENTOS Y PATRIMONIO', 14, 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TÉRMINO DE RESPONSABILIDAD EN LA ASIGNACIÓN DE ALOJAMIENTO', 14, 23.5);

  // Right: Code, Date & Status badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`CÓDIGO: ${termo.codigo_termo || 'TR-ALOJ-0001'}`, pageWidth - 14, 10, { align: 'right' });

  const ciudadFecha = `${termo.alojamento_cidade || 'España'}, ${termo.data_emissao || new Date().toISOString().split('T')[0]}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Lugar y Fecha: ${ciudadFecha}  |  Pág. ${pageNum}`, pageWidth - 14, 15.5, { align: 'right' });

  // Status pill
  const isSigned = termo.status === 'ASSINADO' || termo.status === 'COM_INCIDENCIAS' || Boolean(termo.worker_assinatura_url);
  const hasIncidencias = termo.status === 'COM_INCIDENCIAS' || termo.tem_avarias;

  if (isSigned && hasIncidencias) {
    doc.setFillColor(217, 119, 6); // Amber-600
  } else if (isSigned) {
    doc.setFillColor(5, 150, 105); // Emerald-600
  } else {
    doc.setFillColor(71, 85, 105); // Slate-600
  }
  doc.roundedRect(pageWidth - 62, 18.5, 48, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  const statusLabel = isSigned
    ? hasIncidencias
      ? 'FIRMADO CON INCIDENCIAS'
      : 'FIRMADO Y VERIFICADO'
    : 'PENDIENTE DE FIRMA';
  doc.text(statusLabel, pageWidth - 38, 22.8, { align: 'center' });
}

function drawPageFooter(doc: jsPDF, termo: TermoResponsabilidadeAlojamento) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Documento Corporativo Oficial — ${termo.codigo_termo} • Trabajador: ${termo.worker_nome} (${termo.worker_codigo || 'S/C'}) • Alojamiento: ${termo.alojamento_nome}`,
    14,
    pageHeight - 7.5
  );
  doc.text(
    `Token de Auditoría: ${(termo.token || '').slice(0, 16).toUpperCase()}`,
    pageWidth - 14,
    pageHeight - 7.5,
    { align: 'right' }
  );
}

function drawEstadoBadge(doc: jsPDF, estado: EstadoConservacion, x: number, y: number) {
  const w = 18;
  const h = 5;
  if (estado === 'BUENA') {
    doc.setFillColor(220, 252, 231); // green-100
    doc.setDrawColor(134, 239, 172);
    doc.setTextColor(21, 128, 61);
  } else if (estado === 'REGULAR') {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(252, 211, 77);
    doc.setTextColor(180, 83, 9);
  } else if (estado === 'MALA') {
    doc.setFillColor(254, 226, 226); // red-100
    doc.setDrawColor(252, 165, 165);
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.setTextColor(100, 116, 139);
  }
  doc.roundedRect(x, y, w, h, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const label = estado === 'NA' ? 'N/A' : estado;
  doc.text(label, x + w / 2, y + 3.5, { align: 'center' });
}

export async function generateTermoAlojamentoPdfDocument(
  termo: TermoResponsabilidadeAlojamento
): Promise<{ doc: jsPDF; blob: Blob; fileName: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let pageNum = 1;

  drawPageHeader(doc, termo, pageNum);
  drawPageFooter(doc, termo);

  let y = 35;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      pageNum += 1;
      drawPageHeader(doc, termo, pageNum);
      drawPageFooter(doc, termo);
      y = 35;
    }
  };

  // =========================================================================
  // BOX 1: IDENTIFICACIÓN DEL TRABAJADOR Y ASIGNACIÓN OPERATIVA
  // =========================================================================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setFillColor(30, 58, 138); // Blue-900 header bar
  doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('1. IDENTIFICACIÓN DEL TRABAJADOR Y VINCULACIÓN OPERATIVA', 18, y + 4.5);

  const b1Y = y + 11.5;
  doc.setFontSize(7.5);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nombre del Trabajador:', 18, b1Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${termo.worker_nome} (${termo.worker_codigo || 'S/C'})`, 50, b1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Documento (DNI/NIE/Pasaporte):', 122, b1Y);
  doc.setTextColor(15, 23, 42);
  doc.text(termo.worker_documento || 'Pendiente de informar', 166, b1Y);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cargo / Función:', 18, b1Y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(termo.worker_cargo || 'Especialista Operativo', 50, b1Y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Empresa Contratante:', 122, b1Y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(termo.empresa_contratante || 'GRUPO MCS', 166, b1Y + 6);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cliente / Obra Asignada:', 18, b1Y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const clienteObraStr = [termo.cliente_nome, termo.obra_nome].filter(Boolean).join(' — ') || 'Operación Logística Activa';
  doc.text(clienteObraStr.slice(0, 48), 50, b1Y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Pedido / Fecha Check-in:', 122, b1Y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${termo.pedido_codigo || 'Directo'}  •  Entrada: ${termo.data_checkin || termo.data_emissao}`, 166, b1Y + 12);

  y += 32;

  // =========================================================================
  // BOX 2: DATOS DEL ALOJAMIENTO, DIRECCIÓN Y RÉGIMEN DE SUMINISTROS (CONTAS)
  // =========================================================================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 35, 2, 2, 'FD');

  doc.setFillColor(15, 118, 110); // Teal-700 header bar
  doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('2. DATOS DEL ALOJAMIENTO ASIGNADO Y CONTROL DE SUMINISTROS (CUENTAS DEL INMUEBLE)', 18, y + 4.5);

  const b2Y = y + 11.5;
  doc.setFontSize(7.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Unidad / Inmueble:', 18, b2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`[${termo.alojamento_codigo || 'AL-01'}] ${termo.alojamento_nome}`, 45, b2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Habitación / Cama No.:', 122, b2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(termo.cama_identificador || 'Habitación Asignada', 155, b2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Dirección Exacta:', 18, b2Y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const fullAddr = [termo.alojamento_endereco, termo.alojamento_cidade, termo.alojamento_provincia]
    .filter(Boolean)
    .join(', ');
  doc.text(fullAddr.slice(0, 62), 45, b2Y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Llaves / Mandos:', 122, b2Y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Llaves: ${termo.quantidade_llaves || '1 juego'} | Mandos: ${termo.quantidade_mandos || '1'}`,
    155,
    b2Y + 5.5
  );

  // Suministros row
  const sum = termo.suministros_info || {};
  const activeSupplies = [
    sum.agua !== false ? 'Agua Potable' : null,
    sum.luz !== false ? 'Electricidad (Luz)' : null,
    sum.gas !== false ? 'Gas / Termo' : null,
    sum.internet !== false ? 'Internet Wi-Fi' : null,
    sum.calefaccion !== false ? 'Calefacción / Clima' : null,
    sum.cocina !== false ? 'Cocina Equipada' : null,
    sum.lavadora !== false ? 'Lavadora' : null,
    sum.limpieza ? 'Limpieza Áreas Comunes' : null
  ].filter(Boolean);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Suministros Activos:', 18, b2Y + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(activeSupplies.join('  •  '), 45, b2Y + 11.5);

  // Warning box inside Box 2 about conscious utility accounts
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(17, b2Y + 14, pageWidth - 34, 7.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'CONTROL DE SUMINISTROS Y CUENTAS: Las cuentas de Agua, Luz, Gas e Internet son monitorizadas mensualmente por Logística. El uso abusivo, derroche (dejar calefacción/aire encendido sin ocupantes) o daño a equipos será imputado conforme a la Cláusula 4.',
    20,
    b2Y + 18.8
  );

  y += 39;

  // =========================================================================
  // SECTION 3: DECLARACIÓN Y CLÁUSULAS DE RESPONSABILIDAD (1 A 8)
  // =========================================================================
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('3. TÉRMINOS, REGLAS DE CONVIVENCIA Y COMPROMISOS DE RESPONSABILIDAD', 18, y + 4.5);

  y += 9.5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const introLine = `Por medio del presente documento, yo ${termo.worker_nome}, identificado(a) con documento No. ${termo.worker_documento || '________________'}, declaro haber recibido en asignación el alojamiento arriba detallado, bajo los siguientes términos y compromisos de cumplimiento obligatorio:`;
  const introWrapped = doc.splitTextToSize(introLine, pageWidth - 30);
  doc.text(introWrapped, 15, y);
  y += introWrapped.length * 3.5 + 2;

  CLAUSULAS_TERMO_ALOJAMENTO.forEach(cl => {
    const fullClauseText = `${cl.numero}. ${cl.tituloEs.toUpperCase()}: ${cl.textoEs}`;
    const lines = doc.splitTextToSize(fullClauseText, pageWidth - 32);
    const blockH = lines.length * 3.3 + 2.2;
    ensureSpace(blockH + 2);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y - 2.5, pageWidth - 28, blockH, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, 16, y + 0.5);
    y += blockH + 1.2;
  });

  // Observaciones Generales box
  ensureSpace(16);
  y += 1;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(14, y, pageWidth - 28, 13, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Observaciones Generales del Estado de Entrega / Recepción:', 17, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const obsText =
    termo.observacoes_gerais && termo.observacoes_gerais.trim().length > 0
      ? termo.observacoes_gerais
      : 'Sin observaciones adicionales reportadas en la entrega general.';
  const obsLines = doc.splitTextToSize(obsText, pageWidth - 34);
  doc.text(obsLines.slice(0, 2), 17, y + 8.5);

  y += 17;

  // =========================================================================
  // SECTION 4: CUESTIONARIO / CHECK-LIST DETALLADO POR ÁREAS
  // =========================================================================
  ensureSpace(35);
  doc.setFillColor(30, 58, 138); // Blue-900
  doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    '4. ACTA DE INSPECCIÓN Y CONDICIÓN DE CONSERVACIÓN DEL INMUEBLE (CHECK-LIST POR ÁREAS)',
    18,
    y + 4.5
  );
  y += 8.5;

  const areasOrder: Array<{
    key: 'HABITACION' | 'AREAS_COMUNES' | 'EQUIPOS_DISPONIBLES' | 'BANOS';
    title: string;
  }> = [
    { key: 'HABITACION', title: 'ÁREA 1: HABITACIÓN / DORMITORIO ASIGNADO' },
    { key: 'AREAS_COMUNES', title: 'ÁREA 2: ÁREAS COMUNES (PASILLOS, SALA-COMEDOR, COCINA Y LAVADO)' },
    { key: 'EQUIPOS_DISPONIBLES', title: 'ÁREA 3: EQUIPOS Y ELECTRODOMÉSTICOS DISPONIBLES' },
    { key: 'BANOS', title: 'ÁREA 4: BAÑOS E INSTALACIONES SANITARIAS' }
  ];

  const allPhotosToEmbed: Array<{ itemLabel: string; estado: string; url: string; obs?: string }> = [];

  for (const area of areasOrder) {
    const items = CHECKLIST_ITEMS_CATALOG.filter(i => i.areaKey === area.key);
    ensureSpace(16);

    // Area Subheader
    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 5.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(area.title, 17, y + 4);
    doc.text('CONDICIÓN', 138, y + 4, { align: 'center' });
    doc.text('OBSERVACIONES / DETALLE', 152, y + 4);
    y += 5.8;

    for (const item of items) {
      const ans = termo.checklist_respostas?.[item.id] || {
        estado: 'BUENA' as EstadoConservacion,
        observacao: '',
        fotos: []
      };

      let itemDesc = item.labelEs;
      if (item.allowEspecificacion && ans.especificacion) {
        itemDesc += ` (${ans.especificacion})`;
      }
      if (item.allowMandosCount) {
        itemDesc += ` [Cant. Mandos: ${termo.quantidade_mandos || '1'} | Llaves: ${termo.quantidade_llaves || '1'}]`;
      }

      const descLines = doc.splitTextToSize(itemDesc, 108);
      const obsDetail = [
        ans.observacao || '',
        ans.fotos && ans.fotos.length > 0 ? `[${ans.fotos.length} foto(s) adjunta(s)]` : ''
      ]
        .filter(Boolean)
        .join(' ');
      const obsLinesItem = doc.splitTextToSize(obsDetail || '—', 44);
      const maxLines = Math.max(descLines.length, obsLinesItem.length, 1);
      const rowH = Math.max(6.8, maxLines * 3.4 + 2.4);

      ensureSpace(rowH + 2);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageWidth - 28, rowH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(descLines, 16.5, y + 3.8);

      drawEstadoBadge(doc, ans.estado, 129, y + (rowH - 5) / 2);

      doc.setFont('helvetica', ans.observacao ? 'bold' : 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(ans.estado === 'MALA' ? 185 : 71, ans.estado === 'MALA' ? 28 : 85, ans.estado === 'MALA' ? 28 : 105);
      doc.text(obsLinesItem, 150, y + 3.8);

      if (Array.isArray(ans.fotos) && ans.fotos.length > 0) {
        ans.fotos.forEach(fUrl => {
          allPhotosToEmbed.push({
            itemLabel: item.labelEs.slice(0, 55),
            estado: ans.estado,
            url: fUrl,
            obs: ans.observacao
          });
        });
      }

      y += rowH;
    }
    y += 2.5;
  }

  // Also include general photos if any
  if (Array.isArray(termo.fotos_gerais) && termo.fotos_gerais.length > 0) {
    termo.fotos_gerais.forEach(fUrl => {
      allPhotosToEmbed.push({
        itemLabel: 'Registro Fotográfico General del Alojamiento',
        estado: termo.tem_avarias ? 'REGULAR' : 'BUENA',
        url: fUrl,
        obs: termo.observacoes_gerais
      });
    });
  }

  // =========================================================================
  // SECTION 5: ANEXO FOTOGRÁFICO DE INSPECCIÓN (IF PHOTOS EXIST)
  // =========================================================================
  if (allPhotosToEmbed.length > 0) {
    ensureSpace(50);
    doc.setFillColor(180, 83, 9); // Amber-700
    doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `5. ANEXO DE EVIDENCIAS FOTOGRÁFICAS CAPTURADAS EN EL CHECK-IN (${allPhotosToEmbed.length} FOTO/S)`,
      18,
      y + 4.5
    );
    y += 9;

    const colW = (pageWidth - 32) / 2;
    const cardH = 46;
    let colIdx = 0;

    for (const photoItem of allPhotosToEmbed.slice(0, 8)) {
      if (colIdx === 0) {
        ensureSpace(cardH + 4);
      }
      const xPos = 14 + colIdx * (colW + 4);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(xPos, y, colW, cardH, 1.5, 1.5, 'FD');

      const dataUrl = await loadImageAsDataUrl(photoItem.url);
      if (dataUrl) {
        try {
          const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, format, xPos + 2, y + 2, 38, 34);
        } catch {
          doc.setFontSize(6.5);
          doc.text('[Imagen adjunta en servidor]', xPos + 5, y + 18);
        }
      } else {
        doc.setFontSize(6.5);
        doc.text('[Evidencia digital almacenada]', xPos + 4, y + 18);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(`[${photoItem.estado}] ${photoItem.itemLabel}`, colW - 44);
      doc.text(titleLines.slice(0, 3), xPos + 42, y + 6);

      if (photoItem.obs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        const obsP = doc.splitTextToSize(`Obs: ${photoItem.obs}`, colW - 44);
        doc.text(obsP.slice(0, 4), xPos + 42, y + 18);
      }

      colIdx += 1;
      if (colIdx >= 2) {
        colIdx = 0;
        y += cardH + 3;
      }
    }
    if (colIdx === 1) {
      y += cardH + 3;
    }
  }

  // =========================================================================
  // SECTION 6: CONFORMIDAD Y FIRMAS ELECTRÓNICAS (EMPRESA Y TRABAJADOR)
  // =========================================================================
  ensureSpace(54);
  y += 2;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y, pageWidth - 28, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFORMIDAD, CIENCIA Y FIRMA ELECTRÓNICA DE LAS PARTES', 18, y + 4.5);
  y += 8.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'En señal de conformidad, lectura íntegra y aceptación expresa de todas las cláusulas y del estado del alojamiento reflejado en este check-list, se firma el presente documento:',
    14,
    y + 2
  );
  y += 5;

  const boxW = (pageWidth - 32) / 2;
  const sigBoxH = 34;

  // Left Box: POR LA EMPRESA
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, boxW, sigBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('POR LA EMPRESA / LOGÍSTICA', 14 + boxW / 2, y + 5, { align: 'center' });

  if (termo.empresa_assinatura_url) {
    const empSigData = await loadImageAsDataUrl(termo.empresa_assinatura_url);
    if (empSigData) {
      try {
        doc.addImage(empSigData, 'PNG', 14 + (boxW - 58) / 2, y + 7, 58, 18);
      } catch {}
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(22, y + 26, 14 + boxW - 8, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(termo.empresa_representante_nome || 'Coordinación de Logística', 14 + boxW / 2, y + 29.5, {
    align: 'center'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`Entidad: ${termo.empresa_contratante || 'GRUPO MCS'}`, 14 + boxW / 2, y + 32.5, {
    align: 'center'
  });

  // Right Box: POR EL TRABAJADOR
  const rightX = 14 + boxW + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, boxW, sigBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('POR EL TRABAJADOR (FIRMA ELECTRÓNICA)', rightX + boxW / 2, y + 5, { align: 'center' });

  if (termo.worker_assinatura_url) {
    const workerSigData = await loadImageAsDataUrl(termo.worker_assinatura_url);
    if (workerSigData) {
      try {
        doc.addImage(workerSigData, 'PNG', rightX + (boxW - 54) / 2, y + 6.5, 54, 18.5);
      } catch {}
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Pendiente de firma electrónica del trabajador', rightX + boxW / 2, y + 16, { align: 'center' });
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(rightX + 8, y + 26, rightX + boxW - 8, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${termo.worker_nome} (${termo.worker_codigo || 'S/C'})`, rightX + boxW / 2, y + 29.5, {
    align: 'center'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  const sigAudit = termo.assinado_em
    ? `DNI/NIE: ${termo.worker_documento || 'Verificado'} • Firmado: ${new Date(termo.assinado_em).toLocaleString('es-ES')} • IP: ${termo.assinatura_ip || 'Verificada'}`
    : `DNI/NIE/Pasaporte: ${termo.worker_documento || '_________________________'}`;
  doc.text(sigAudit, rightX + boxW / 2, y + 32.5, { align: 'center' });

  const fileName = `Termino_Responsabilidad_${termo.alojamento_codigo || 'ALOJ'}_${(termo.worker_nome || 'Trabajador').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const blob = doc.output('blob');

  return { doc, blob, fileName };
}

export async function downloadTermoAlojamentoPdf(termo: TermoResponsabilidadeAlojamento): Promise<void> {
  const { doc, fileName } = await generateTermoAlojamentoPdfDocument(termo);
  doc.save(fileName);
}
