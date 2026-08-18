/**
 * Gerador de PDF em Alta Fidelidade para Nóminas e Holerites
 * Suporta:
 * 1. Recibo de Vencimento Oficial de Portugal (Trabalhadores de Alta / Destacados)
 * 2. Demonstrativo Detalhado de Remuneração e Descontos (Alta Anexo)
 * 3. Demonstrativo de Serviços Prestados (Regularização)
 * 4. Exportação em Lote com compactação em ZIP (JSZip)
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { HoleriteAltaCalculado, HoleriteRegularizacaoCalculado } from './holeriteEngine';

function formatCurrency(val?: number | null): string {
    const num = Number(val || 0);
    return num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
}

function formatNumber(val?: number | null): string {
    const num = Number(val || 0);
    return num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizeFilename(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
}

/**
 * 1. Gera PDF do Trabalhador DE ALTA (Recibo Oficial + Demonstrativo Opcional)
 */
export function generateHoleriteAltaPdf(
    data: HoleriteAltaCalculado,
    options: { includeDetails?: boolean } = { includeDetails: true }
): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = 210;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm

    // ==========================================
    // PÁGINA 1: RECIBO DE VENCIMENTO OFICIAL
    // ==========================================
    let y = 14;

    // Cabeçalho - Caixa da Empresa
    doc.setDrawColor(40, 44, 52);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, 108, 26, 2, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 24, 33);
    doc.text(data.empresa.nome.toUpperCase(), margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIF: ${data.empresa.nif}`, margin + 4, y + 11);
    doc.text(data.empresa.endereco, margin + 4, y + 17);
    doc.text(`${data.empresa.codigoPostal} ${data.empresa.cidade}`, margin + 4, y + 22);

    // Cabeçalho - Título do Recibo (Direita)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RECIBO DE VENCIMENTO', pageWidth - margin, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 75, 85);
    doc.text('Normal', pageWidth - margin, y + 11, { align: 'right' });
    doc.text('ORIGINAL', pageWidth - margin, y + 15, { align: 'right' });
    doc.text(`De ${data.periodo.dataInicio}`, pageWidth - margin, y + 20, { align: 'right' });
    doc.text(`até ${data.periodo.dataFim}`, pageWidth - margin, y + 24, { align: 'right' });

    y += 32;

    // Dados do Trabalhador
    doc.setFontSize(8.5);
    doc.setTextColor(20, 24, 33);

    // Linha 1
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.worker.nome.toUpperCase(), margin + 14, y);

    // Linha 2
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Nº Contribuinte:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.nif, margin + 28, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Nº Mecanográfico:', margin + 80, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.numMecanografico, margin + 112, y);

    // Linha 3
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Nº Beneficiário:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.niss, margin + 28, y);

    // Linha 4
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Categoria/Profissão:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.categoria, margin + 35, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Vencimento:', margin + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(data.dadosProfissionais.vencimentoBaseConfig), pageWidth - margin, y, { align: 'right' });

    // Linha 5
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Tipo de Processamento:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.tipoProcessamento, margin + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Salário Hora:', margin + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(data.dadosProfissionais.salarioHoraCalculado), pageWidth - margin, y, { align: 'right' });

    // Linha 6
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Base do Processamento:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dadosProfissionais.baseProcessamento, margin + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Horas Semana:', margin + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.dadosProfissionais.horasSemana), pageWidth - margin, y, { align: 'right' });

    // Linha 7
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Companhia de Seguros:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.empresa.seguros || '-', margin + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Dias do Mês:', margin + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.dadosProfissionais.diasMes), pageWidth - margin, y, { align: 'right' });

    y += 8;

    // TABELA DE VERBAS OFICIAL
    // Cabeçalho da Tabela
    const colDescX = margin;
    const colDescW = 88;
    const colQtdX = colDescX + colDescW;
    const colQtdW = 18;
    const colUnitX = colQtdX + colQtdW;
    const colUnitW = 24;
    const colAbonosX = colUnitX + colUnitW;
    const colAbonosW = 26;
    const colDescontosX = colAbonosX + colAbonosW;
    const colDescontosW = 26;

    const rowH = 6.2;

    // Header Background
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.rect(margin, y, contentWidth, rowH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DESCRIÇÃO', colDescX + 3, y + 4.3);
    doc.text('QTD', colQtdX + colQtdW / 2, y + 4.3, { align: 'center' });
    doc.text('V.UNIT.', colUnitX + colUnitW - 3, y + 4.3, { align: 'right' });
    doc.text('ABONOS', colAbonosX + colAbonosW - 3, y + 4.3, { align: 'right' });
    doc.text('DESCONTOS', colDescontosX + colDescontosW - 3, y + 4.3, { align: 'right' });

    // Grid vertical lines header
    doc.line(colQtdX, y, colQtdX, y + rowH);
    doc.line(colUnitX, y, colUnitX, y + rowH);
    doc.line(colAbonosX, y, colAbonosX, y + rowH);
    doc.line(colDescontosX, y, colDescontosX, y + rowH);

    y += rowH;
    const tableStartY = y;

    // Linhas da Tabela
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    data.linhasOficiais.forEach((linha) => {
        doc.text(linha.descricao, colDescX + 3, y + 4.3);
        if (linha.qtd) {
            doc.text(String(linha.qtd), colQtdX + colQtdW / 2, y + 4.3, { align: 'center' });
        }
        if (linha.valorUnit) {
            doc.text(formatCurrency(linha.valorUnit), colUnitX + colUnitW - 3, y + 4.3, { align: 'right' });
        }
        if (linha.abonos !== undefined && linha.abonos !== null) {
            doc.text(formatCurrency(linha.abonos), colAbonosX + colAbonosW - 3, y + 4.3, { align: 'right' });
        }
        if (linha.descontos !== undefined && linha.descontos !== null) {
            doc.text(formatCurrency(linha.descontos), colDescontosX + colDescontosW - 3, y + 4.3, { align: 'right' });
        }

        y += rowH;
    });

    // Fechamento da grade da tabela de verbas
    const tableEndY = y;
    doc.rect(margin, tableStartY, contentWidth, tableEndY - tableStartY, 'S');
    doc.line(colQtdX, tableStartY, colQtdX, tableEndY);
    doc.line(colUnitX, tableStartY, colUnitX, tableEndY);
    doc.line(colAbonosX, tableStartY, colAbonosX, tableEndY);
    doc.line(colDescontosX, tableStartY, colDescontosX, tableEndY);

    // Linha de Subtotal da Tabela
    doc.setFillColor(250, 251, 252);
    doc.rect(margin, y, contentWidth, rowH, 'FD');
    doc.line(colAbonosX, y, colAbonosX, y + rowH);
    doc.line(colDescontosX, y, colDescontosX, y + rowH);

    doc.setFont('helvetica', 'bold');
    doc.text('Total', colUnitX + colUnitW - 3, y + 4.3, { align: 'right' });
    doc.text(formatCurrency(data.totais.totalAbonos), colAbonosX + colAbonosW - 3, y + 4.3, { align: 'right' });
    doc.text(formatCurrency(data.totais.totalDescontos), colDescontosX + colDescontosW - 3, y + 4.3, { align: 'right' });

    y += rowH + 18;

    // Caixa Resumo de Totais (Direita/Centro)
    const sumBoxW = 120;
    const sumBoxX = pageWidth - margin - sumBoxW;
    const sumColW = sumBoxW / 3;

    doc.setFillColor(245, 247, 250);
    doc.rect(sumBoxX, y, sumBoxW, 6, 'FD');
    doc.rect(sumBoxX, y + 6, sumBoxW, 7, 'S');

    doc.line(sumBoxX + sumColW, y, sumBoxX + sumColW, y + 13);
    doc.line(sumBoxX + sumColW * 2, y, sumBoxX + sumColW * 2, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Total Abonos', sumBoxX + sumColW / 2, y + 4.2, { align: 'center' });
    doc.text('Total Descontos', sumBoxX + sumColW * 1.5, y + 4.2, { align: 'center' });
    doc.text('Total a Receber', sumBoxX + sumColW * 2.5, y + 4.2, { align: 'center' });

    doc.setFontSize(9);
    doc.text(formatCurrency(data.totais.totalAbonos), sumBoxX + sumColW / 2, y + 11, { align: 'center' });
    doc.text(formatCurrency(data.totais.totalDescontos), sumBoxX + sumColW * 1.5, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(data.totais.totalAReceber), sumBoxX + sumColW * 2.5, y + 11, { align: 'center' });

    y += 24;

    // Declaração de Recebimento e Valor por Extenso
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 35, 45);
    doc.text(`O Valor de ${formatCurrency(data.totais.totalAReceber)} foi pago por Transferência Bancária.`, margin, y);

    y += 5;
    const declaracao = `Declaro que recebi a quantia constante neste recibo no valor de: ${data.totais.valorPorExtenso}.`;
    const splitDecl = doc.splitTextToSize(declaracao, contentWidth);
    doc.text(splitDecl, margin, y);

    y += splitDecl.length * 4.5 + 14;

    // Assinatura
    doc.setFont('helvetica', 'bold');
    doc.text('Assinatura:', margin, y);
    doc.line(margin + 22, y, margin + 140, y);

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 135);
    doc.text('Página   1  /  ' + (options.includeDetails ? '2' : '1'), margin, 285);
    doc.text(`Emitido por Kotrik MCS Platform • ${data.empresa.nome}`, pageWidth - margin, 285, { align: 'right' });

    // ==========================================
    // PÁGINA 2: DEMONSTRATIVO DETALHADO (ANEXO)
    // ==========================================
    if (options.includeDetails) {
        doc.addPage();
        y = 16;

        // Cabeçalho da Página 2
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 24, 33);
        doc.text('DEMONSTRATIVO DETALHADO DE REMUNERAÇÃO E DESCONTOS', margin, y);

        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 85, 95);
        doc.text('Abaixo está o descritivo de remuneração e descontos de forma detalhada para melhor compreensão.', margin, y);

        y += 6;
        doc.setDrawColor(220, 224, 230);
        doc.line(margin, y, pageWidth - margin, y);

        y += 8;

        // Mini Card do Trabalhador
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Colaborador:', margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(`${data.worker.nome.toUpperCase()} (${data.dadosProfissionais.numMecanografico})`, margin + 26, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.text('Período:', margin + 110, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(data.periodo.mesAnoTexto, margin + 125, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.text('Função:', margin + 4, y + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.dadosProfissionais.categoria, margin + 26, y + 12);

        doc.setFont('helvetica', 'bold');
        doc.text('Empresa:', margin + 110, y + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.empresa.nome, margin + 125, y + 12);

        y += 24;

        // Grid com duas colunas lado a lado: Remunerações vs Descontos
        const colTableW = (contentWidth - 6) / 2; // 88mm cada
        const leftTableX = margin;
        const rightTableX = margin + colTableW + 6;

        // TABELA ESQUERDA: REMUNERAÇÕES
        doc.setFillColor(15, 23, 42); // Black / Dark Header
        doc.rect(leftTableX, y, colTableW, 6.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Remunerações', leftTableX + 3, y + 4.4);
        doc.text('V. Hora', leftTableX + 38, y + 4.4, { align: 'right' });
        doc.text('Qte', leftTableX + 56, y + 4.4, { align: 'right' });
        doc.text('Valor', leftTableX + colTableW - 3, y + 4.4, { align: 'right' });

        let ly = y + 6.5;
        doc.setDrawColor(200, 205, 215);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 24, 33);

        // Linha 1: Horas Trabalhadas
        doc.rect(leftTableX, ly, colTableW, 6, 'S');
        doc.text('Horas Trabalhadas', leftTableX + 3, ly + 4.2);
        doc.text(formatNumber(data.detalhamento.tarifaHora), leftTableX + 38, ly + 4.2, { align: 'right' });
        doc.text(formatNumber(data.detalhamento.horasTrabalhadas), leftTableX + 56, ly + 4.2, { align: 'right' });
        doc.text(formatNumber(data.detalhamento.valorHoras), leftTableX + colTableW - 3, ly + 4.2, { align: 'right' });
        ly += 6;

        // Linha 2: Alojamento
        doc.rect(leftTableX, ly, colTableW, 6, 'S');
        doc.text('Alojamento / Moradia', leftTableX + 3, ly + 4.2);
        doc.text(data.detalhamento.alojamento > 0 ? formatNumber(data.detalhamento.alojamento) : '-', leftTableX + colTableW - 3, ly + 4.2, { align: 'right' });
        ly += 6;

        // Linha 3: Ajustes de Valor
        doc.rect(leftTableX, ly, colTableW, 6, 'S');
        doc.text('Ajustes de Valor / Bônus', leftTableX + 3, ly + 4.2);
        doc.text(data.detalhamento.ajustesPositivos > 0 ? formatNumber(data.detalhamento.ajustesPositivos) : '-', leftTableX + colTableW - 3, ly + 4.2, { align: 'right' });
        ly += 6;

        // Linha 4: Total Remunerações
        doc.setFillColor(241, 245, 249);
        doc.rect(leftTableX, ly, colTableW, 6.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.text('Total Remunerações', leftTableX + 3, ly + 4.4);
        doc.text(formatCurrency(data.detalhamento.totalRemuneracoes), leftTableX + colTableW - 3, ly + 4.4, { align: 'right' });

        // TABELA DIREITA: DESCONTOS
        doc.setFillColor(15, 23, 42); // Black / Dark Header
        doc.rect(rightTableX, y, colTableW, 6.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Descontos', rightTableX + 3, y + 4.4);
        doc.text('Qte', rightTableX + 54, y + 4.4, { align: 'right' });
        doc.text('Valor', rightTableX + colTableW - 3, y + 4.4, { align: 'right' });

        let ry = y + 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 24, 33);

        const descontosItens = [
            { label: 'Adiantamento', val: data.detalhamento.descontos.adiantamento },
            { label: 'Aluguel de Carros', val: data.detalhamento.descontos.aluguelCarros },
            { label: 'Taxas Bancárias', val: data.detalhamento.descontos.taxasBancarias },
            { label: 'Imposto / Retenções', val: data.detalhamento.descontos.imposto },
            { label: 'Descontos Adicionais', val: data.detalhamento.descontos.descontosAdicionais },
        ];

        descontosItens.forEach(item => {
            doc.rect(rightTableX, ry, colTableW, 5.5, 'S');
            doc.text(item.label, rightTableX + 3, ry + 3.8);
            doc.text(item.val > 0 ? formatNumber(item.val) : '-', rightTableX + colTableW - 3, ry + 3.8, { align: 'right' });
            ry += 5.5;
        });

        // Total Descontos Detalhados
        doc.setFillColor(254, 242, 242);
        doc.rect(rightTableX, ry, colTableW, 6.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text('Total Descontos', rightTableX + 3, ry + 4.4);
        doc.text(formatCurrency(data.detalhamento.descontos.totalDescontosDetalhados), rightTableX + colTableW - 3, ry + 4.4, { align: 'right' });

        y = Math.max(ly, ry) + 16;

        // Card Destaque Líquido Efetivo
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 101, 52);
        doc.text('LÍQUIDO EFETIVO APURADO NO PERÍODO:', margin + 6, y + 8.5);
        doc.setFontSize(11);
        doc.text(formatCurrency(data.detalhamento.liquidoReal), pageWidth - margin - 6, y + 8.5, { align: 'right' });

        y += 24;

        // Nota de Isenção / Rodapé Legal
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Este documento não faz parte do holerite oficial, e serve exclusivamente como demonstrativo detalhado de prestação/apuramento.', margin, y);

        // Rodapé
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 125, 135);
        doc.text('Página   2  /  2', margin, 285);
        doc.text(`Emitido por Kotrik MCS Platform • ${data.empresa.nome}`, pageWidth - margin, 285, { align: 'right' });
    }

    return doc;
}

/**
 * 2. Gera PDF do Trabalhador EM REGULARIZAÇÃO (Demonstrativo de Serviços Prestados)
 */
export function generateHoleriteRegularizacaoPdf(data: HoleriteRegularizacaoCalculado): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = 210;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2; // 174mm

    let y = 20;

    // Cabeçalho Centralizado com Estilo Premium
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 24, 33);
    doc.text(data.empresa.nome.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 85, 95);
    doc.text(`${data.empresa.endereco}, ${data.empresa.codigoPostal} ${data.empresa.cidade}  •  NIF: ${data.empresa.nif}`, pageWidth / 2, y, { align: 'center' });

    y += 8;
    doc.setDrawColor(220, 225, 235);
    doc.line(margin, y, pageWidth - margin, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Demonstrativo de Serviços Prestados', pageWidth / 2, y, { align: 'center' });

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${data.periodo.mesAnoTexto}        Data de Emissão: ${data.periodo.dataEmissao}`, pageWidth / 2, y, { align: 'center' });

    y += 12;

    // Card do Prestador
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Nome:', margin + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.worker.nome.toUpperCase(), margin + 20, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Serviço Prestado:', margin + 4, y + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.servicoPrestado, margin + 35, y + 10.5);

    y += 22;

    // SEÇÃO 1: DETALHAMENTO DE HORAS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Detalhamento de Horas', margin, y);

    y += 4;
    const tableW = contentWidth;
    const col1W = tableW * 0.50;
    const col2W = tableW * 0.25;
    const col3W = tableW * 0.25;

    // Header Horas
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, tableW, 6.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Descrição', margin + 3, y + 4.4);
    doc.text('Qte (Horas)', margin + col1W + col2W - 4, y + 4.4, { align: 'right' });
    doc.text('Valor Total (€)', margin + tableW - 4, y + 4.4, { align: 'right' });

    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 24, 33);

    // Linha Serviços / Horas
    doc.rect(margin, y, tableW, 6, 'S');
    doc.text(`Serviços Prestados (V. Hora: ${formatNumber(data.horas.tarifaHora)} €)`, margin + 3, y + 4.2);
    doc.text(formatNumber(data.horas.quantidadeHoras), margin + col1W + col2W - 4, y + 4.2, { align: 'right' });
    doc.text(formatNumber(data.horas.valorTotalHoras), margin + tableW - 4, y + 4.2, { align: 'right' });

    y += 6;

    // Linha Ajuda Alojamento (se existir)
    if (data.horas.ajudaAlojamento > 0) {
        doc.rect(margin, y, tableW, 6, 'S');
        doc.text('Ajuda Alojamento / Moradia', margin + 3, y + 4.2);
        doc.text('-', margin + col1W + col2W - 4, y + 4.2, { align: 'right' });
        doc.text(formatNumber(data.horas.ajudaAlojamento), margin + tableW - 4, y + 4.2, { align: 'right' });
        y += 6;
    }

    // Subtotal Bruto
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, tableW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Bruto', margin + 3, y + 4.4);
    doc.text(formatCurrency(data.horas.totalBruto), margin + tableW - 4, y + 4.4, { align: 'right' });

    y += 16;

    // SEÇÃO 2: DETALHAMENTO DE DESCONTOS E GASTOS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Detalhamento de Descontos e Gastos', margin, y);

    y += 4;
    const descTableW = contentWidth * 0.70;
    const descCol1W = descTableW * 0.60;
    const descCol2W = descTableW * 0.40;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, descTableW, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Descontos', margin + 3, y + 4.4);
    doc.text('Valor (€)', margin + descTableW - 4, y + 4.4, { align: 'right' });

    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 24, 33);

    const itensDesconto = [
        { label: 'Adiantamento', val: data.descontos.adiantamento },
        { label: 'Aluguel de Carros', val: data.descontos.aluguelCarros },
        { label: 'Taxas Bancárias', val: data.descontos.taxasBancarias },
        { label: 'Imposto', val: data.descontos.imposto },
        { label: 'Descontos Adicionais', val: data.descontos.descontosAdicionais },
    ];

    itensDesconto.forEach(item => {
        doc.rect(margin, y, descTableW, 5.5, 'S');
        doc.text(item.label, margin + 3, y + 3.8);
        doc.text(item.val > 0 ? formatNumber(item.val) : '-', margin + descTableW - 4, y + 3.8, { align: 'right' });
        y += 5.5;
    });

    // Subtotal Descontos
    doc.setFillColor(254, 242, 242);
    doc.rect(margin, y, descTableW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27);
    doc.text('Total Descontos', margin + 3, y + 4.4);
    doc.text(formatCurrency(data.descontos.totalDescontos), margin + descTableW - 4, y + 4.4, { align: 'right' });

    y += 18;

    // SEÇÃO 3: TOTAL LÍQUIDO E FORMA DE PAGAMENTO
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('Total Líquido Pago:', margin + 6, y + 7);
    doc.setFontSize(13);
    doc.text(formatCurrency(data.totalLiquido), margin + 48, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Forma de Pagamento: ${data.formaPagamento}       Moeda: ${data.moeda}`, margin + 6, y + 13.5);

    y += 30;

    // Rodapé Legal
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const notaLegal = 'Este documento é um comprovante de pagamento por serviços prestados e não constitui vínculo empregatício ou comprovação de renda.';
    const splitNota = doc.splitTextToSize(notaLegal, contentWidth);
    doc.text(splitNota, margin, y);

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 135);
    doc.text('Página   1  /  1', margin, 285);
    doc.text(`Emitido por Kotrik MCS Platform • ${data.empresa.nome}`, pageWidth - margin, 285, { align: 'right' });

    return doc;
}

/**
 * 3. Exportador em Lote com geração de arquivo ZIP contendo os PDFs individuais
 */
export async function generateHoleritesBatchZip(
    calculatedItems: Array<HoleriteAltaCalculado | HoleriteRegularizacaoCalculado>,
    mesReferencia: string,
    onProgress?: (current: number, total: number) => void
): Promise<Blob> {
    const zip = new JSZip();
    const total = calculatedItems.length;

    for (let i = 0; i < total; i++) {
        const item = calculatedItems[i];
        let doc: jsPDF;

        if (item.tipo === 'alta') {
            doc = generateHoleriteAltaPdf(item, { includeDetails: true });
        } else {
            doc = generateHoleriteRegularizacaoPdf(item);
        }

        const pdfBlob = doc.output('blob');
        const cod = item.worker.cod_colab || item.worker.id.substring(0, 5);
        const safeName = sanitizeFilename(item.worker.nome || 'trabalhador');
        const filename = `Holerite_${cod}_${safeName}_${mesReferencia}.pdf`;

        zip.file(filename, pdfBlob);

        if (onProgress) {
            onProgress(i + 1, total);
        }
    }

    return await zip.generateAsync({ type: 'blob' });
}
