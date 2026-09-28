import { jsPDF } from 'jspdf';
import type { AtivoPatrimonio } from '../types/patrimonio';

export interface TermoResponsabilidadeData {
    ativo: AtivoPatrimonio;
    funcionarioNome: string;
    funcionarioDoc?: string;
    coordenadorNome?: string;
    projeto?: string;
    localEntrega?: string;
    dataEntrega?: string;
    acessorios?: string;
    estadoEquipamento?: string;
    empresaNome?: string;
    observacoes?: string;
}

export function gerarTermoResponsabilidadePdf(data: TermoResponsabilidadeData): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const empresa = data.empresaNome || data.ativo.empresa_proprietaria || 'KR INDUSTRIAL / MCS';
    const primaryColor = [30, 41, 59]; // slate-800
    const accentColor = [2, 132, 199]; // sky-600
    const textColor = [51, 65, 85]; // slate-700
    const lightBg = [248, 250, 252]; // slate-50

    // Margens e posições
    const marginX = 20;
    let currentY = 22;

    // Cabeçalho
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, currentY - 5, 170, 1.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ACTA DE ENTREGA, RESPONSABILIDAD Y CUSTODIA DE EQUIPO', marginX, currentY + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${empresa.toUpperCase()} • CONTROL DE ACTIVOS Y PATRIMONIO`, marginX, currentY + 11);

    currentY += 20;

    // Caixa de Identificação do Ativo
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(marginX, currentY, 170, 36, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(marginX, currentY, 170, 36, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('1. DATOS DEL EQUIPO / ACTIVO ASIGNADO', marginX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const col1X = marginX + 4;
    const col2X = marginX + 90;

    doc.text(`Código Patrimonial: `, col1X, currentY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.ativo.codigo_patrimonial}`, col1X + 32, currentY + 14);
    doc.setFont('helvetica', 'normal');

    doc.text(`Categoría: ${data.ativo.categoria || '-'}`, col2X, currentY + 14);

    doc.text(`Descripción: ${data.ativo.descricao || '-'}`, col1X, currentY + 20);
    doc.text(`Marca/Modelo: ${[data.ativo.marca, data.ativo.modelo].filter(Boolean).join(' ') || '-'}`, col2X, currentY + 20);

    const extraIdent = data.ativo.imei
        ? `IMEI: ${data.ativo.imei}`
        : data.ativo.matricula
        ? `Matrícula: ${data.ativo.matricula}`
        : `Nº de Serie: ${data.ativo.numero_serie || 'No informado'}`;
    doc.text(extraIdent, col1X, currentY + 26);
    doc.text(`Color: ${data.ativo.cor || 'Estándar'}`, col2X, currentY + 26);

    doc.text(`Estado en el momento de entrega: ${data.estadoEquipamento || 'Excelente / Sin averías'}`, col1X, currentY + 32);

    currentY += 42;

    // Caixa do Funcionário e Entrega
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(marginX, currentY, 170, 32, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, currentY, 170, 32, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('2. BENEFICIARIO / TRABAJADOR RESPONSABLE DE LA CUSTODIA', marginX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    doc.text(`Trabajador: `, col1X, currentY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.funcionarioNome}`, col1X + 22, currentY + 14);
    doc.setFont('helvetica', 'normal');

    doc.text(`Documento (DNI/NIE/Pasaporte): ${data.funcionarioDoc || 'Registrado en RRHH'}`, col2X, currentY + 14);

    doc.text(`Proyecto / Centro: ${data.projeto || data.ativo.projeto || 'Taller General'}`, col1X, currentY + 20);
    doc.text(`Coordinador Responsable: ${data.coordenadorNome || 'Coordinación Operativa'}`, col2X, currentY + 20);

    doc.text(`Lugar de Entrega: ${data.localEntrega || 'Almacén / Oficina Central'}`, col1X, currentY + 26);
    doc.text(`Fecha: ${data.dataEntrega || new Date().toLocaleDateString('es-ES')}`, col2X, currentY + 26);

    currentY += 38;

    // Acessórios
    if (data.acessorios) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.roundedRect(marginX, currentY, 170, 16, 2, 2, 'F');
        doc.roundedRect(marginX, currentY, 170, 16, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('3. ACCESORIOS Y COMPONENTES ENTREGADOS', marginX + 4, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(`${data.acessorios}`, marginX + 4, currentY + 11);

        currentY += 22;
    }

    // Cláusulas e Termos Legais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CLÁUSULAS DE USO Y RESPONSABILIDAD LABORAL', marginX, currentY);

    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const clausulas = [
        '1. El trabajador declara haber recibido en perfecto estado de funcionamiento y conservación el bien especificado anteriormente, comprometiéndose a destinarlo exclusivamente al desempeño de sus funciones y actividades laborales para la empresa.',
        '2. El trabajador se compromete a velar diligentemente por la integridad física del equipo y sus respectivos accesorios, obligándose a comunicar de forma inmediata a la empresa cualquier daño, avería técnica, extravío, hurto o robo del mismo.',
        '3. En caso de negligencia grave, dolo, uso indebido, o extravío injustificado, el trabajador podrá responder de los gastos de reparación o reposición del bien dentro del marco legal establecido en el Estatuto de los Trabajadores y normativa laboral aplicable.',
        '4. Queda expresamente prohibida la cesión, préstamo, empeño o traslado del equipo a terceros ajenos a la relación laboral sin la previa y expresa autorización por escrito de la dirección de la empresa o coordinador responsable.',
        '5. El trabajador se obliga a restituir de inmediato el equipo en las mismas condiciones en que le fue entregado (salvo el desgaste normal y propio del uso profesional) con ocasión de la extinción o suspensión del contrato laboral, cambio de puesto o cuando la empresa lo requiera formalmente.',
    ];

    clausulas.forEach(c => {
        const lines = doc.splitTextToSize(c, 170);
        doc.text(lines, marginX, currentY);
        currentY += lines.length * 3.6 + 1.5;
    });

    currentY += 6;

    // Cidade e Data
    doc.setFontSize(9);
    doc.text(
        `Declaro haber recibido el material reseñado, hallándose en perfecto estado de uso, y conforme con las condiciones expresadas.`,
        marginX,
        currentY
    );
    currentY += 5;
    doc.text(`Fecha de firma: ______ / ______ / 20____`, marginX, currentY);

    currentY += 24;

    // Assinaturas
    const colAssinatura1 = marginX + 5;
    const colAssinatura2 = marginX + 95;

    doc.setDrawColor(100, 116, 139);
    doc.line(colAssinatura1, currentY, colAssinatura1 + 70, currentY);
    doc.line(colAssinatura2, currentY, colAssinatura2 + 70, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${data.funcionarioNome}`, colAssinatura1 + 35, currentY + 5, { align: 'center' });
    doc.text('TRABAJADOR / DEPOSITARIO', colAssinatura1 + 35, currentY + 9, { align: 'center' });

    doc.text(`${empresa.toUpperCase()}`, colAssinatura2 + 35, currentY + 5, { align: 'center' });
    doc.text('EMPRESA / COORDINACIÓN', colAssinatura2 + 35, currentY + 9, { align: 'center' });

    return doc;
}
