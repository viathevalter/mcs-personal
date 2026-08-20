import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { GeneratedDocument } from './documentGeneratorService';

export const pdfExportService = {
    /**
     * Downloads a generated document as PDF.
     * If signed, attaches the formal digital signature seal block at the bottom before exporting.
     */
    async downloadDocumentAsPdf(docItem: GeneratedDocument): Promise<void> {
        // 1. Fetch .docx binary
        const response = await fetch(docItem.document_url);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar o arquivo do documento.`);
        }
        const blob = await response.blob();

        // 2. Create offscreen container using global document DOM
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '800px';
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#0f172a';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.padding = '30px';
        container.style.boxSizing = 'border-box';
        document.body.appendChild(container);

        try {
            // 3. Render .docx into HTML
            await renderAsync(blob, container);

            // 4. If signed, replace placeholder inside document and append signature block
            if (docItem.signature_status === 'signed') {
                if (docItem.signature_url) {
                    const placeholders = [
                        '{{IMAGE FIRMA_CLIENTE}}_',
                        '{{IMAGE FIRMA_CLIENTE}}',
                        '{{IMAGE_FIRMA_CLIENTE}}',
                        '{{IMAGE FIRMA_TRABALHADOR}}_',
                        '{{IMAGE FIRMA_TRABALHADOR}}',
                        '{{IMAGE_FIRMA_TRABALHADOR}}',
                        '{{IMAGE FIRMA_EMPLEADO}}',
                        '{{IMAGE_FIRMA_EMPLEADO}}',
                        '{{assinatura_imagem}}',
                        '{{imagem_assinatura}}',
                        '{{trabalhador_assinatura_imagem}}',
                        '{{FIRMA_CLIENTE}}',
                        '{{FIRMA_TRABALHADOR}}',
                        '{{FIRMA_EMPLEADO}}'
                    ];

                    const walkTextNodes = (node: Node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            let text = node.nodeValue || '';
                            let matched = false;
                            for (const ph of placeholders) {
                                if (text.includes(ph)) {
                                    matched = true;
                                    break;
                                }
                            }

                            if (matched && node.parentNode) {
                                const span = document.createElement('span');
                                let html = text;
                                for (const ph of placeholders) {
                                    const imgTag = `<img src="${docItem.signature_url}" style="max-height: 80px; max-width: 240px; display: inline-block; vertical-align: middle; margin: 4px 0;" alt="Assinatura" />`;
                                    html = html.split(ph).join(imgTag);
                                }
                                span.innerHTML = html;
                                node.parentNode.replaceChild(span, node);
                            }
                        } else {
                            const children = Array.from(node.childNodes);
                            children.forEach(walkTextNodes);
                        }
                    };

                    walkTextNodes(container);
                }

                const sigBlock = document.createElement('div');
                sigBlock.style.marginTop = '40px';
                sigBlock.style.padding = '20px';
                sigBlock.style.border = '2px solid #10b981';
                sigBlock.style.borderRadius = '12px';
                sigBlock.style.backgroundColor = '#f0fdf4';
                sigBlock.style.pageBreakInside = 'avoid';

                const formattedDate = docItem.signed_at
                    ? new Date(docItem.signed_at).toLocaleString('pt-BR')
                    : new Date().toLocaleString('pt-BR');

                sigBlock.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 10px; margin-bottom: 12px;">
                        <span style="font-weight: bold; color: #047857; font-size: 14px;">TERMO DE ASSINATURA DIGITAL (OCT)</span>
                        <span style="font-size: 11px; color: #059669;">VALIDADO E VERIFICADO</span>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        ${docItem.signature_url ? `<img src="${docItem.signature_url}" style="max-height: 70px; max-width: 220px; object-contain: contain; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #ffffff;" />` : ''}
                        <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                            <p style="margin: 0;"><strong>Assinado por:</strong> ${docItem.signed_by_name || 'N/A'}</p>
                            <p style="margin: 0;"><strong>Data e Hora:</strong> ${formattedDate}</p>
                            <p style="margin: 0; font-family: monospace; font-size: 10px; color: #64748b;"><strong>Token Audit:</strong> ${docItem.public_token}</p>
                        </div>
                    </div>
                `;
                container.appendChild(sigBlock);
            }

            // 5. Capture HTML to Canvas (High clarity scale 1.5)
            const canvas = await html2canvas(container, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // 6. Generate Compressed Multi-page A4 PDF with jsPDF (stream compression enabled)
            const imgData = canvas.toDataURL('image/jpeg', 0.82);
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Page 1
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;

            // Subsequent pages
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
            }

            // Clean PDF filename
            const cleanTitle = (docItem.title || 'documento')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .toLowerCase();
            const pdfName = docItem.signature_status === 'signed'
                ? `${cleanTitle}_assinado.pdf`
                : `${cleanTitle}.pdf`;

            pdf.save(pdfName);
        } finally {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    }
};
