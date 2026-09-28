import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { STATUS_CONFIG } from '../types/patrimonio';

export function exportarPatrimoniosExcel(ativos: AtivoPatrimonio[], nomeArquivo: string = 'activos_patrimonio_mcs') {
    const dados = ativos.map(a => ({
        'Código Patrimonial': a.codigo_patrimonial,
        'Descripción': a.descricao,
        'Categoría': a.categoria,
        'Subcategoría': a.subcategoria || '',
        'Marca': a.marca || '',
        'Modelo': a.modelo || '',
        'Estado': STATUS_CONFIG[a.status]?.label || a.status,
        'Responsable Actual': a.responsavel_nome || 'Disponible en Almacén',
        'Coordinador': a.coordenador_nome || '',
        'Proyecto / Obra': a.projeto || '',
        'Ubicación': a.localizacao || '',
        'Fecha Entrega': a.data_entrega ? new Date(a.data_entrega).toLocaleDateString('es-ES') : '',
        'Previsión Devolución': a.previsao_devolucao || '',
        'Número de Serie': a.numero_serie || '',
        'IMEI': a.imei || '',
        'Matrícula': a.matricula || '',
        'Color': a.cor || '',
        'Empresa Propietaria': a.empresa_proprietaria || '',
        'Centro de Coste': a.centro_custo || '',
        'Fecha Compra': a.data_compra || '',
        'Proveedor': a.fornecedor || '',
        'Nº Factura': a.numero_fatura || '',
        'Valor Adquisición (€)': a.valor_aquisicao || 0,
        'Garantía (Meses)': a.garantia_meses || 0,
        'Fecha Fin Garantía': a.data_fim_garantia || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activos y Patrimonio');

    // Auto-ajustar largura das colunas
    const max_widths = Object.keys(dados[0] || {}).map(key => ({
        wch: Math.max(key.length, 14),
    }));
    worksheet['!cols'] = max_widths;

    XLSX.writeFile(workbook, `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportarPatrimoniosCsv(ativos: AtivoPatrimonio[], nomeArquivo: string = 'activos_patrimonio_mcs') {
    const headers = [
        'Código',
        'Descripción',
        'Categoría',
        'Marca',
        'Modelo',
        'Estado',
        'Responsable',
        'Proyecto',
        'Ubicación',
        'Nº Serie/IMEI',
        'Empresa',
        'Valor (€)',
    ];

    const rows = ativos.map(a => [
        `"${a.codigo_patrimonial}"`,
        `"${(a.descricao || '').replace(/"/g, '""')}"`,
        `"${a.categoria || ''}"`,
        `"${a.marca || ''}"`,
        `"${a.modelo || ''}"`,
        `"${STATUS_CONFIG[a.status]?.label || a.status}"`,
        `"${a.responsavel_nome || 'Disponible'}"`,
        `"${a.projeto || ''}"`,
        `"${a.localizacao || ''}"`,
        `"${a.imei || a.numero_serie || a.matricula || ''}"`,
        `"${a.empresa_proprietaria || ''}"`,
        a.valor_aquisicao || 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportarPatrimoniosPdf(ativos: AtivoPatrimonio[], titulo: string = 'Informe General de Activos y Patrimonio') {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const marginX = 14;
    let currentY = 18;

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('MCS INDUSTRIAL • CONTROL DE ACTIVOS Y PATRIMONIO', marginX, currentY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${titulo} • Emitido el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, marginX, currentY + 5);

    currentY += 14;

    // Tabela
    const headers = ['Código', 'Descripción / Modelo', 'Categoría', 'Estado', 'Responsable Actual', 'Proyecto', 'Nº Serie / IMEI', 'Empresa'];
    const colWidths = [26, 62, 32, 28, 44, 30, 32, 28];

    // Cabeçalho da tabela
    doc.setFillColor(30, 41, 59);
    doc.rect(marginX, currentY, 270, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let currentX = marginX + 2;
    headers.forEach((h, idx) => {
        doc.text(h, currentX, currentY + 4.8);
        currentX += colWidths[idx];
    });

    currentY += 7;

    // Linhas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    ativos.forEach((ativo, index) => {
        if (currentY > 190) {
            doc.addPage('a4', 'landscape');
            currentY = 20;

            // Redesenha cabeçalho
            doc.setFillColor(30, 41, 59);
            doc.rect(marginX, currentY, 270, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            let cx = marginX + 2;
            headers.forEach((h, idx) => {
                doc.text(h, cx, currentY + 4.8);
                cx += colWidths[idx];
            });
            currentY += 7;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
        }

        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(marginX, currentY, 270, 6.5, 'F');
        }

        doc.setTextColor(15, 23, 42);
        let rowX = marginX + 2;

        const serialOuImei = ativo.imei || ativo.numero_serie || ativo.matricula || '-';
        const cols = [
            ativo.codigo_patrimonial,
            `${ativo.descricao} ${ativo.marca ? `(${ativo.marca} ${ativo.modelo || ''})` : ''}`.substring(0, 38),
            ativo.categoria.substring(0, 20),
            STATUS_CONFIG[ativo.status]?.label || ativo.status,
            (ativo.responsavel_nome || 'Disponible').substring(0, 24),
            (ativo.projeto || '-').substring(0, 18),
            serialOuImei.substring(0, 20),
            (ativo.empresa_proprietaria || 'MCS').substring(0, 16),
        ];

        cols.forEach((colText, idx) => {
            doc.text(colText, rowX, currentY + 4.5);
            rowX += colWidths[idx];
        });

        currentY += 6.5;
    });

    // Rodapé com contagem
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total de registros: ${ativos.length}`, marginX, currentY);

    doc.save(`activos_informe_${new Date().toISOString().slice(0, 10)}.pdf`);
}
