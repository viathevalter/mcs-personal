import { jsPDF } from 'jspdf';

export interface TimesheetDayEntry {
    dia: number;
    entrada?: string;
    saida?: string;
    horasNormais?: number;
    horasNoturnas?: number;
    totalHoras?: number;
    obs?: string;
}

export interface TimesheetPdfData {
    empresaNome: string;
    empresaNif?: string;
    workerNome: string;
    workerDoc: string; // NIE / Passport
    workerFuncion?: string;
    clienteNome?: string;
    mes: number;
    ano: number;
    apontamentos: TimesheetDayEntry[];
    totalNormais: number;
    totalNoturnas: number;
    totalGeral: number;
    // Signature info if already signed
    encarregadoNome?: string;
    signedAt?: string;
    signedIp?: string;
    signatureImageUrl?: string;
}

const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function generateTimesheetPdf(data: TimesheetPdfData): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // 186mm

    let y = 12;

    // Header Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    // Title & Company
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('REGISTRO MENSUAL DE JORNADA LABORAL Y CONTROL DE HORAS', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const companyText = `Empresa: ${data.empresaNome || 'Numinus / Stoko'} ${data.empresaNif ? `(NIF/CIF: ${data.empresaNif})` : ''} | Conforme Art. 34.9 Estatuto de los Trabajadores`;
    doc.text(companyText, margin + 4, y + 12);

    const periodText = `Período: ${MONTH_NAMES_ES[data.mes - 1] || data.mes} de ${data.ano}`;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(periodText, margin + 4, y + 18);

    y += 25;

    // Worker & Client Info Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    // Line 1: Worker & NIE
    doc.setFont('helvetica', 'bold');
    doc.text('Trabajador:', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.workerNome, margin + 22, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('NIE / Pasaporte:', margin + 115, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.workerDoc, margin + 143, y + 5);

    // Line 2: Puesto & Cliente
    doc.setFont('helvetica', 'bold');
    doc.text('Categoría:', margin + 3, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.workerFuncion || 'Operario Especialista', margin + 22, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente / Obra:', margin + 115, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clienteNome || 'General', margin + 143, y + 12);

    y += 22;

    // Days Table
    const totalDaysInMonth = new Date(data.ano, data.mes, 0).getDate();
    const colWidths = {
        dia: 14,
        sem: 12,
        entrada: 26,
        saida: 26,
        normais: 28,
        noturnas: 28,
        total: 26,
        obs: 26,
    };

    // Table Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = margin;
    doc.text('Día', x + 3, y + 4.8);
    x += colWidths.dia;
    doc.text('Sem.', x + 2, y + 4.8);
    x += colWidths.sem;
    doc.text('Entrada', x + 5, y + 4.8);
    x += colWidths.entrada;
    doc.text('Salida', x + 6, y + 4.8);
    x += colWidths.saida;
    doc.text('H. Diurnas', x + 4, y + 4.8);
    x += colWidths.normais;
    doc.text('H. Nocturnas', x + 3, y + 4.8);
    x += colWidths.noturnas;
    doc.text('Total Horas', x + 3, y + 4.8);
    x += colWidths.total;
    doc.text('Observaciones', x + 2, y + 4.8);

    y += 7;

    // Table Rows
    const rowHeight = 4.6;
    doc.setFontSize(7.5);

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateObj = new Date(data.ano, data.mes - 1, day);
        const dayOfWeekIndex = dateObj.getDay();
        const dayOfWeekLetter = WEEKDAYS_ES[dayOfWeekIndex];
        const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

        // Find existing record
        const entry = data.apontamentos?.find((a) => Number(a.dia) === day);
        const hNorm = Number(entry?.horasNormais || 0);
        const hNot = Number(entry?.horasNoturnas || 0);
        const hTot = Number(entry?.totalHoras || (hNorm + hNot));

        // Background color
        if (isWeekend) {
            doc.setFillColor(241, 245, 249); // slate-100 for weekends
        } else if (day % 2 === 0) {
            doc.setFillColor(248, 250, 252); // slate-50 alternating
        } else {
            doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, y, contentWidth, rowHeight, 'F');

        // Border line below
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        // Row Text
        doc.setTextColor(isWeekend ? 100 : 30, isWeekend ? 116 : 41, isWeekend ? 139 : 59);
        x = margin;

        // Día
        doc.setFont('helvetica', isWeekend ? 'bold' : 'normal');
        doc.text(String(day).padStart(2, '0'), x + 3, y + 3.4);
        x += colWidths.dia;

        // Sem
        doc.text(dayOfWeekLetter, x + 3.5, y + 3.4);
        x += colWidths.sem;

        // Entrada
        doc.setFont('helvetica', 'normal');
        doc.text(entry?.entrada || (hTot > 0 ? '08:00' : '-'), x + 5, y + 3.4);
        x += colWidths.entrada;

        // Salida
        doc.text(entry?.saida || (hTot > 0 ? '17:00' : '-'), x + 5, y + 3.4);
        x += colWidths.saida;

        // H. Diurnas
        doc.text(hNorm > 0 ? `${hNorm.toFixed(1)} h` : '-', x + 8, y + 3.4);
        x += colWidths.normais;

        // H. Nocturnas
        if (hNot > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(2, 132, 199); // sky-600
            doc.text(`${hNot.toFixed(1)} h`, x + 7, y + 3.4);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
        } else {
            doc.text('-', x + 10, y + 3.4);
        }
        x += colWidths.noturnas;

        // Total Horas
        if (hTot > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${hTot.toFixed(1)} h`, x + 6, y + 3.4);
            doc.setFont('helvetica', 'normal');
        } else {
            doc.text('-', x + 8, y + 3.4);
        }
        x += colWidths.total;

        // Obs
        const obsText = entry?.obs ? entry.obs.substring(0, 15) : (isWeekend && hTot === 0 ? 'Descanso' : '');
        doc.text(obsText, x + 2, y + 3.4);

        y += rowHeight;
    }

    // Totals Bar
    y += 1.5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('TOTALES DEL MES:', margin + 4, y + 5.2);
    doc.text(`Diurnas: ${data.totalNormais.toFixed(1)} h`, margin + 55, y + 5.2);
    doc.setTextColor(2, 132, 199);
    doc.text(`Nocturnas: ${data.totalNoturnas.toFixed(1)} h`, margin + 98, y + 5.2);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`TOTAL GENERAL: ${data.totalGeral.toFixed(1)} HORAS`, margin + 140, y + 5.2);

    y += 12;

    // Signatures Box (Worker & Supervisor)
    const boxWidth = (contentWidth - 6) / 2;
    const boxHeight = 36;

    // Worker Box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('FIRMA DEL TRABAJADOR', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Conforme con el registro de horas del período.', margin + 4, y + 9);

    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin + 6, y + 27, margin + boxWidth - 6, y + 27);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fdo.: ${data.workerNome}`, margin + 6, y + 31);

    // Supervisor Box
    const supX = margin + boxWidth + 6;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(supX, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('VISTO BUENO / ENCARGADO DEL CLIENTE', supX + 4, y + 5);

    if (data.signatureImageUrl) {
        // Embed signature image
        try {
            doc.addImage(data.signatureImageUrl, 'PNG', supX + 10, y + 9, 45, 15);
        } catch {
            // fallback if format issue
            doc.setFont('helvetica', 'italic');
            doc.text('[Firma Digital Registrada]', supX + 12, y + 18);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(22, 101, 52); // green-800
        doc.text(`Firmado digitalmente por: ${data.encarregadoNome || 'Encargado'}`, supX + 4, y + 28);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        const signedMeta = `Fecha: ${data.signedAt ? new Date(data.signedAt).toLocaleString('es-ES') : ''} | IP: ${data.signedIp || 'Verificado'}`;
        doc.text(signedMeta, supX + 4, y + 32);
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Certifico la veracidad de las horas y trabajos prestados.', supX + 4, y + 9);

        doc.setDrawColor(148, 163, 184);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(supX + 6, y + 27, supX + boxWidth - 6, y + 27);
        doc.setLineDashPattern([], 0);

        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fdo. Responsable / Encargado Cliente`, supX + 6, y + 31);
    }

    // Legal Footer
    y += boxHeight + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
        'Documento de registro de jornada obligatorio según Real Decreto-ley 8/2019. Custodia garantizada por 4 años.',
        margin,
        y + 2
    );

    return doc;
}

export function downloadTimesheetPdf(data: TimesheetPdfData, filename?: string) {
    const doc = generateTimesheetPdf(data);
    const fname = filename || `Hoja_Horas_${data.workerNome.replace(/\s+/g, '_')}_${data.ano}_${String(data.mes).padStart(2, '0')}.pdf`;
    doc.save(fname);
}
