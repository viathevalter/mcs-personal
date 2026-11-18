import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { PickingOrder } from '../types';

function detectCompanyTemplate(empresaNome?: string | null) {
  const norm = (empresaNome || '').toUpperCase();
  if (norm.includes('TRIANGULO') || norm.includes('TRIÂNGULO') || norm.includes('KOTRIK')) {
    return {
      key: 'TRIANGULO',
      title: 'CONTROL DE ENTREGA DE DOTACIÓN',
      code: 'FM-TRI-ALM-025',
      version: 'Revisión: 000',
      companyHeader: 'TRIANGULO MATIZADO UNIPESSOAL',
      accentRgb: [30, 58, 138] as [number, number, number],
      legalText:
        'El trabajador recibe los siguientes equipos de protección individual y/o dotación y se compromete a utilizarlos de manera apropiada y a señalar a su supervisor cualquier defecto o daño que perjudique su funcionamiento normal. En caso de presentarse un desgaste o daño previo al tiempo legal para su nueva entrega, el trabajador deberá devolver el equipo para su respectivo reemplazo.',
    };
  }
  if (norm.includes('WISE')) {
    return {
      key: 'WISE',
      title: 'FORMATO PARA LA ENTREGA INDIVIDUAL DE DOTACIÓN',
      code: 'FM-WI-ALM-01',
      version: 'Revisión: 002',
      companyHeader: 'WISE SERVICES',
      accentRgb: [13, 148, 136] as [number, number, number],
      legalText:
        'Por medio de la presente certifico que he recibido las dotaciones correspondientes al periodo de ejecución programado del proyecto y elementos adicionales de protección individual (EPIS). Soy responsable del cuidado y buen uso de DOTACION Y EPIS, de acuerdo con las indicaciones recibidas el día de la entrega.',
    };
  }
  if (norm.includes('STOCCO')) {
    return {
      key: 'STOCCO',
      title: 'FORMATO PARA LA ENTREGA INDIVIDUAL DE DOTACIÓN',
      code: 'FGOP-001',
      version: 'Versión 2.0',
      companyHeader: 'STOCCO',
      accentRgb: [220, 38, 38] as [number, number, number],
      legalText:
        'Confirmo haber recibido los equipos de dotación y protección personal (EPIS) asignados para mi función dentro del proyecto. Acepto expresamente el compromiso de: utilizarlos exclusivamente en el entorno laboral designado, respetar las normas de seguridad establecidas en el lugar de trabajo y mantenerlos limpios y guardarlos según las instrucciones del empleador.',
    };
  }
  if (norm.includes('HEXAGON')) {
    return {
      key: 'HEXAGON',
      title: 'JUSTIFICANTE DE LA ENTREGA DE EQUIPOS DE PROTECCIÓN INDIVIDUAL Y DOTACION',
      code: 'GP-009',
      version: 'VERSION 1',
      companyHeader: 'HEXAGON',
      accentRgb: [22, 101, 52] as [number, number, number],
      legalText:
        'El trabajador arriba identificado recibe de su empresa, los Equipos de Protección Individual, en buen estado de conservación, obligatorios en su puesto de trabajo, para dar cumplimiento a lo marcado en la Ley de Prevención de Riesgos Laborales. Además, cada trabajador es conocedor de la obligatoriedad de su uso durante su permanencia en la obra y deberá responsabilizarse del correcto cuidado de los equipos entregados.',
    };
  }
  return {
    key: 'LUMINOUS',
    title: 'JUSTIFICANTE DE LA ENTREGA DE EQUIPOS DE PROTECCIÓN INDIVIDUAL Y DOTACION',
    code: 'GP-009',
    version: 'VERSION 1',
    companyHeader: empresaNome ? empresaNome.toUpperCase() : 'LUMINOUS',
    accentRgb: [202, 138, 4] as [number, number, number],
    legalText:
      'El trabajador arriba identificado recibe de su empresa, los Equipos de Protección Individual, en buen estado de conservación, obligatorios en su puesto de trabajo, para dar cumplimiento a lo marcado en la Ley de Prevención de Riesgos Laborales. Además, cada trabajador es conocedor de la obligatoriedad de su uso durante su permanencia en la obra y deberá responsabilizarse del correcto cuidado de los equipos entregados.',
  };
}

export async function downloadActaEntregaPdf(order: PickingOrder): Promise<void> {
  const tpl = detectCompanyTemplate(order.empresa_nome);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  // Header Box
  doc.setDrawColor(60);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, contentW, 22);
  doc.line(margin + 42, y, margin + 42, y + 22);
  doc.line(pageW - margin - 42, y, pageW - margin - 42, y + 22);

  // Company Title (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...tpl.accentRgb);
  doc.text(tpl.companyHeader, margin + 21, y + 12, { align: 'center', maxWidth: 38 });

  // Form Title (Center)
  doc.setTextColor(20);
  doc.setFontSize(10);
  doc.text(tpl.title, pageW / 2, y + 9, { align: 'center', maxWidth: contentW - 88 });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PROCESO DE GESTIÓN DE ALMACÉN', pageW / 2, y + 18, { align: 'center' });

  // Code / Version (Right)
  doc.setFontSize(8);
  doc.text(`Código: ${tpl.code}`, pageW - margin - 40, y + 6);
  doc.text(tpl.version, pageW - margin - 40, y + 12);
  doc.text(`Orden: ${order.order_number}`, pageW - margin - 40, y + 18);

  y += 26;

  // Metadata Grid
  const rows = [
    ['EMPRESA:', order.empresa_nome || '-', 'NÚMERO PEDIDO:', order.pedido_codigo || '-'],
    ['CLIENTE FINAL:', order.client_nome || '-', 'TIPO SOLICITUD:', order.request_type],
    ['TRABAJADOR:', order.worker_nome, 'IDENTIFICACIÓN:', order.worker_identificacion || '-'],
    ['CARGO / PERFIL:', order.job_function_name || '-', 'FECHA INICIO / PREP.:', order.expected_start_date || new Date(order.created_at).toLocaleDateString('es-ES')],
  ];

  doc.setFontSize(8);
  for (const r of rows) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, 32, 7, 'FD');
    doc.rect(margin + 32, y, contentW / 2 - 32, 7, 'S');
    doc.rect(margin + contentW / 2, y, 34, 7, 'FD');
    doc.rect(margin + contentW / 2 + 34, y, contentW / 2 - 34, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(r[0], margin + 2, y + 4.8);
    doc.text(r[2], margin + contentW / 2 + 2, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.text(String(r[1]).substring(0, 34), margin + 34, y + 4.8);
    doc.text(String(r[3]).substring(0, 28), margin + contentW / 2 + 36, y + 4.8);
    y += 7;
  }

  y += 5;

  // Legal Commitment Text
  doc.setFontSize(8);
  doc.setTextColor(40);
  const splitLegal = doc.splitTextToSize(tpl.legalText, contentW);
  doc.text(splitLegal, margin, y);
  y += splitLegal.length * 4 + 4;

  // Items Table Header
  doc.setFillColor(...tpl.accentRgb);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.rect(margin, y, contentW, 7.5, 'F');
  doc.text('ARTÍCULO / DESCRIPCIÓN', margin + 3, y + 5);
  doc.text('TALLA / UND', margin + 105, y + 5, { align: 'center' });
  doc.text('CANTIDAD', margin + 140, y + 5, { align: 'center' });
  doc.text('ESTADO', margin + 168, y + 5, { align: 'center' });
  y += 7.5;

  const items = order.items || [];
  doc.setTextColor(20);
  doc.setFont('helvetica', 'normal');

  if (items.length === 0) {
    doc.rect(margin, y, contentW, 8);
    doc.text('Sin artículos registrados en la orden.', margin + 4, y + 5.5);
    y += 8;
  } else {
    for (const item of items) {
      doc.setDrawColor(180);
      doc.rect(margin, y, contentW, 7);
      doc.line(margin + 88, y, margin + 88, y + 7);
      doc.line(margin + 124, y, margin + 124, y + 7);
      doc.line(margin + 154, y, margin + 154, y + 7);

      doc.setFontSize(8);
      doc.text(item.item_name, margin + 3, y + 4.8);
      const tallaDisplay =
        item.size_code && item.size_code !== 'UNICO'
          ? item.size_code
          : '1';
      doc.text(tallaDisplay, margin + 106, y + 4.8, { align: 'center' });
      doc.text(String(item.quantity_picked > 0 ? item.quantity_picked : item.quantity_requested), margin + 139, y + 4.8, { align: 'center' });
      doc.text(order.status === 'PENDENTE' ? 'PENDIENTE' : 'EJECUTADA', margin + 168, y + 4.8, { align: 'center' });
      y += 7;
    }
  }

  y += 5;

  // Observations
  doc.setDrawColor(60);
  doc.rect(margin, y, contentW, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OBSERVACIONES:', margin + 2, y + 4.5);
  doc.setFont('helvetica', 'normal');
  if (order.observations) {
    const obsLines = doc.splitTextToSize(order.observations, contentW - 4);
    doc.text(obsLines.slice(0, 2), margin + 2, y + 9.5);
  }
  y += 18;

  // Signature Footer
  doc.rect(margin, y, contentW, 28);
  doc.line(margin + contentW / 2, y, margin + contentW / 2, y + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA DEL TRABAJADOR:', margin + 3, y + 5);
  doc.text('FECHA DE RECEPCIÓN / ACTA:', margin + contentW / 2 + 3, y + 5);

  if (order.signature_data_url) {
    try {
      doc.addImage(order.signature_data_url, 'PNG', margin + 10, y + 7, 50, 18);
    } catch {
      // fallback if invalid data url
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.text(
    order.signed_at
      ? new Date(order.signed_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : `Elaboración: ${new Date().toLocaleDateString('es-ES')}`,
    margin + contentW / 2 + 3,
    y + 13
  );
  if (order.tracking_code) {
    doc.text(`Seguimiento (${order.delivery_method || 'NACEX'}): ${order.tracking_code}`, margin + contentW / 2 + 3, y + 20);
  }

  // QR code on bottom right corner for verification
  try {
    const qrDataUrl = await QRCode.toDataURL(`MCS-ALMACEN:${order.order_number}:${order.signature_token}`, { width: 120, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', pageW - margin - 20, y + 5, 18, 18);
  } catch {
    // ignore qr error
  }

  const safeWorker = order.worker_nome.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 24);
  doc.save(`ACTA_EPIS_${tpl.key}_${order.order_number}_${safeWorker}.pdf`);
}

export async function downloadEtiquetaSeparacaoPdf(order: PickingOrder): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 140] });
  const margin = 6;
  let y = 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MCS ALMACÉN - PACKING', margin, y);
  doc.setFontSize(9);
  doc.text(order.order_number, 94, y, { align: 'right' });
  y += 4;
  doc.line(margin, y, 94, y);
  y += 5;

  // QR Code
  const qrPayload = JSON.stringify({
    type: 'MCS_PICKING',
    id: order.id,
    order: order.order_number,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 180, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', 64, y, 28, 28);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TRABAJADOR:', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(order.worker_nome, 55), margin, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA / CLIENTE:', margin, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.empresa_nome || '-'}`, margin, y + 21);
  doc.text(doc.splitTextToSize(order.client_nome || '-', 55), margin, y + 25);

  y += 32;
  doc.line(margin, y, 94, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO: ${order.pedido_codigo || '-'}  |  CAM: ${order.camiseta_size || '-'}  |  PAN: ${order.pantalones_size || '-'}`, margin, y);
  y += 4;
  doc.line(margin, y, 94, y);
  y += 5;

  doc.setFontSize(8);
  doc.text('ARTÍCULOS A SEPARAR:', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  for (const item of order.items || []) {
    const line = `[ ] ${item.quantity_requested}x ${item.item_name} (${item.size_code})`;
    doc.text(line, margin, y);
    y += 4.5;
    if (y > 128) break;
  }

  if (order.tracking_code) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${order.delivery_method || 'NACEX'}: ${order.tracking_code}`, margin, 134);
  }

  doc.save(`ETIQUETA_${order.order_number}.pdf`);
}
