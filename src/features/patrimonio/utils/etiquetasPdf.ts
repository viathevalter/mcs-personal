import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { AtivoPatrimonio } from '../types/patrimonio';

export interface OpcoesEtiqueta {
    formato: 'termica_40x20' | 'termica_50x30' | 'a4_grade';
    empresaCabecalho?: string;
    incluirDescricao?: boolean;
}

/**
 * Gera PDF de etiqueta(s) patrimoniais
 */
export async function gerarEtiquetasPdf(
    ativos: AtivoPatrimonio[],
    opcoes: OpcoesEtiqueta = { formato: 'termica_40x20', empresaCabecalho: 'MCS / KR INDUSTRIAL' }
): Promise<jsPDF> {
    const baseUrl = window.location.origin;

    if (opcoes.formato === 'termica_40x20') {
        // Formato individual 40mm x 20mm (1 página por ativo para impressoras de etiqueta térmicas)
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [20, 40], // Altura x Largura (20mm x 40mm)
        });

        for (let i = 0; i < ativos.length; i++) {
            const ativo = ativos[i];
            if (i > 0) doc.addPage([20, 40], 'landscape');

            const urlConsulta = `${baseUrl}/patrimonio/${ativo.codigo_patrimonial}`;
            const qrDataUrl = await QRCode.toDataURL(urlConsulta, {
                margin: 0,
                width: 120,
                errorCorrectionLevel: 'M',
            });

            // Moldura externa fina
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.rect(0.5, 0.5, 39, 19);

            // Cabeçalho da Empresa
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(15, 23, 42); // slate-900
            const empresa = (opcoes.empresaCabecalho || ativo.empresa_proprietaria || 'MCS INDUSTRIAL').toUpperCase();
            doc.text(empresa.substring(0, 22), 2, 3.5);

            // QR Code à esquerda (13x13 mm)
            doc.addImage(qrDataUrl, 'PNG', 2, 4.5, 13, 13);

            // Textos à direita do QR Code
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(2, 132, 199); // sky-600
            doc.text(`PAT: ${ativo.codigo_patrimonial}`, 16.5, 7.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(4.8);
            doc.setTextColor(51, 65, 85);

            const descLinha1 = (ativo.descricao || '').substring(0, 18);
            const descLinha2 = (ativo.marca ? `${ativo.marca} ${ativo.modelo || ''}` : '').substring(0, 18);
            doc.text(descLinha1, 16.5, 10.5);
            if (descLinha2) {
                doc.text(descLinha2, 16.5, 13.5);
            }

            const idComplemento = ativo.imei ? `IMEI: ${ativo.imei.slice(-6)}` : ativo.numero_serie ? `SN: ${ativo.numero_serie.slice(-8)}` : ativo.categoria;
            doc.setFontSize(4.2);
            doc.setTextColor(100, 116, 139);
            doc.text(idComplemento.substring(0, 20), 16.5, 16.5);
        }

        return doc;
    } else if (opcoes.formato === 'termica_50x30') {
        // Formato 50mm x 30mm
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [30, 50],
        });

        for (let i = 0; i < ativos.length; i++) {
            const ativo = ativos[i];
            if (i > 0) doc.addPage([30, 50], 'landscape');

            const urlConsulta = `${baseUrl}/patrimonio/${ativo.codigo_patrimonial}`;
            const qrDataUrl = await QRCode.toDataURL(urlConsulta, {
                margin: 0,
                width: 150,
                errorCorrectionLevel: 'M',
            });

            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.roundedRect(1, 1, 48, 28, 1, 1);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(15, 23, 42);
            const empresa = (opcoes.empresaCabecalho || ativo.empresa_proprietaria || 'MCS INDUSTRIAL').toUpperCase();
            doc.text(empresa, 25, 4.5, { align: 'center' });

            doc.setDrawColor(226, 232, 240);
            doc.line(3, 6, 47, 6);

            // QR Code (18x18 mm)
            doc.addImage(qrDataUrl, 'PNG', 3, 7.5, 18, 18);

            // Informações
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(2, 132, 199);
            doc.text(`${ativo.codigo_patrimonial}`, 23, 11.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(30, 41, 59);
            const desc = (ativo.descricao || '').substring(0, 22);
            doc.text(desc, 23, 15.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(71, 85, 105);
            const modelo = [ativo.marca, ativo.modelo].filter(Boolean).join(' ').substring(0, 24);
            if (modelo) doc.text(modelo, 23, 19);

            const serial = ativo.imei ? `IMEI: ${ativo.imei}` : ativo.numero_serie ? `SN: ${ativo.numero_serie}` : `Cat: ${ativo.categoria}`;
            doc.text(serial.substring(0, 24), 23, 22.5);

            doc.setFontSize(4.5);
            doc.setTextColor(148, 163, 184);
            doc.text('CONSULTA PATRIMONIAL', 23, 25.5);
        }

        return doc;
    } else {
        // Grade A4 (Folha padrão com 4 colunas x 8 linhas = 32 etiquetas por folha)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const margemX = 10;
        const margemY = 12;
        const larguraEtiqueta = 45;
        const alturaEtiqueta = 22;
        const espacoX = 3;
        const espacoY = 3;
        const colunas = 4;
        const linhasPorPagina = 11;
        const totalPorPagina = colunas * linhasPorPagina;

        for (let i = 0; i < ativos.length; i++) {
            const pageIndex = Math.floor(i / totalPorPagina);
            const itemOnPage = i % totalPorPagina;

            if (i > 0 && itemOnPage === 0) {
                doc.addPage('a4', 'portrait');
            }

            const col = itemOnPage % colunas;
            const row = Math.floor(itemOnPage / colunas);

            const x = margemX + col * (larguraEtiqueta + espacoX);
            const y = margemY + row * (alturaEtiqueta + espacoY);

            const ativo = ativos[i];
            const urlConsulta = `${baseUrl}/patrimonio/${ativo.codigo_patrimonial}`;
            const qrDataUrl = await QRCode.toDataURL(urlConsulta, {
                margin: 0,
                width: 100,
                errorCorrectionLevel: 'M',
            });

            // Contorno
            doc.setDrawColor(210, 215, 220);
            doc.setLineWidth(0.2);
            doc.roundedRect(x, y, larguraEtiqueta, alturaEtiqueta, 1, 1);

            // Cabeçalho
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5);
            doc.setTextColor(15, 23, 42);
            const empresa = (opcoes.empresaCabecalho || ativo.empresa_proprietaria || 'MCS INDUSTRIAL').toUpperCase();
            doc.text(empresa.substring(0, 24), x + 1.5, y + 3.2);

            // QR code (14x14 mm)
            doc.addImage(qrDataUrl, 'PNG', x + 1.5, y + 4.5, 14, 14);

            // Textos
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(2, 132, 199);
            doc.text(`PAT: ${ativo.codigo_patrimonial}`, x + 16.5, y + 7.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(51, 65, 85);
            doc.text((ativo.descricao || '').substring(0, 20), x + 16.5, y + 11);
            
            const mm = [ativo.marca, ativo.modelo].filter(Boolean).join(' ').substring(0, 20);
            if (mm) doc.text(mm, x + 16.5, y + 14);

            const codExtra = ativo.imei ? `IMEI: ${ativo.imei.slice(-6)}` : ativo.numero_serie ? `SN: ${ativo.numero_serie.slice(-8)}` : ativo.categoria;
            doc.setFontSize(4.2);
            doc.setTextColor(100, 116, 139);
            doc.text(codExtra.substring(0, 20), x + 16.5, y + 17);
        }

        return doc;
    }
}
