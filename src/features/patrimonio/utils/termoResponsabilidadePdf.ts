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
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TERMO DE RESPONSABILIDADE E ENTREGA DE EQUIPAMENTO', marginX, currentY + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${empresa.toUpperCase()} • CONTROLE PATRIMONIAL`, marginX, currentY + 11);

    currentY += 20;

    // Caixa de Identificação do Ativo
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(marginX, currentY, 170, 36, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(marginX, currentY, 170, 36, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('1. DADOS DO EQUIPAMENTO / BEM PATRIMONIAL', marginX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const col1X = marginX + 4;
    const col2X = marginX + 90;

    doc.text(`Código Patrimonial: `, col1X, currentY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.ativo.codigo_patrimonial}`, col1X + 32, currentY + 14);
    doc.setFont('helvetica', 'normal');

    doc.text(`Categoria: ${data.ativo.categoria || '-'}`, col2X, currentY + 14);

    doc.text(`Descrição: ${data.ativo.descricao || '-'}`, col1X, currentY + 20);
    doc.text(`Marca/Modelo: ${[data.ativo.marca, data.ativo.modelo].filter(Boolean).join(' ') || '-'}`, col2X, currentY + 20);

    const extraIdent = data.ativo.imei
        ? `IMEI: ${data.ativo.imei}`
        : data.ativo.matricula
        ? `Matrícula: ${data.ativo.matricula}`
        : `Nº de Série: ${data.ativo.numero_serie || 'Não informado'}`;
    doc.text(extraIdent, col1X, currentY + 26);
    doc.text(`Cor: ${data.ativo.cor || 'Padrão'}`, col2X, currentY + 26);

    doc.text(`Estado no ato de entrega: ${data.estadoEquipamento || 'Excelente / Sem avarias'}`, col1X, currentY + 32);

    currentY += 42;

    // Caixa do Funcionário e Entrega
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(marginX, currentY, 170, 32, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, currentY, 170, 32, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('2. BENEFICIÁRIO / RESPONSÁVEL PELA CUSTÓDIA', marginX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    doc.text(`Colaborador: `, col1X, currentY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.funcionarioNome}`, col1X + 22, currentY + 14);
    doc.setFont('helvetica', 'normal');

    doc.text(`Documento (DNI/NIE/Passaporte): ${data.funcionarioDoc || 'Registrado no RH'}`, col2X, currentY + 14);

    doc.text(`Projeto / Centro: ${data.projeto || data.ativo.projeto || 'Oficina Geral'}`, col1X, currentY + 20);
    doc.text(`Coordenador Responsável: ${data.coordenadorNome || 'Coordenação Operacional'}`, col2X, currentY + 20);

    doc.text(`Local da Entrega: ${data.localEntrega || 'Armazém / Escritório'}`, col1X, currentY + 26);
    doc.text(`Data: ${data.dataEntrega || new Date().toLocaleDateString('pt-BR')}`, col2X, currentY + 26);

    currentY += 38;

    // Acessórios
    if (data.acessorios) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.roundedRect(marginX, currentY, 170, 16, 2, 2, 'F');
        doc.roundedRect(marginX, currentY, 170, 16, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('3. ACESSÓRIOS E COMPONENTES ENTREGUES', marginX + 4, currentY + 5);

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
    doc.text('CLÁUSULAS DE UTILIZAÇÃO E RESPONSABILIDADE', marginX, currentY);

    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const clausulas = [
        '1. O colaborador declara ter recebido em perfeito estado de conservação e funcionamento o bem patrimonial acima especificado, comprometendo-se a utilizá-lo estritamente para o desempenho de suas atividades profissionais.',
        '2. O colaborador compromete-se a zelar pela integridade física do equipamento e seus respectivos acessórios, comunicando imediatamente à empresa qualquer dano, falha, extravio, furto ou roubo do mesmo.',
        '3. Em caso de negligência, dolo, má utilização ou extravio injustificado, o colaborador poderá ser responsabilizado pelas despesas de conserto ou reposição do bem nos limites da legislação vigente.',
        '4. É vedada a cessão, empréstimo, penhor ou transferência do equipamento a terceiros sem prévia autorização formal por escrito da diretoria ou coordenação.',
        '5. O colaborador obriga-se a restituir o equipamento nas mesmas condições em que o recebeu (salvo desgaste natural do uso) por ocasião da rescisão contratual, alteração de função ou quando for expressamente solicitado pela empresa.',
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
        `Declaro ter lido e concordado integralmente com todos os termos e condições deste termo.`,
        marginX,
        currentY
    );
    currentY += 5;
    doc.text(`Data de assinatura: ______ / ______ / 20____`, marginX, currentY);

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
    doc.text('RESPONSÁVEL / COLABORADOR', colAssinatura1 + 35, currentY + 9, { align: 'center' });

    doc.text(`${empresa.toUpperCase()}`, colAssinatura2 + 35, currentY + 5, { align: 'center' });
    doc.text('EMPRESA / COORDENAÇÃO', colAssinatura2 + 35, currentY + 9, { align: 'center' });

    return doc;
}
