import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { GeneratedDocument } from './documentGeneratorService';

export const pdfExportService = {
    /**
     * Downloads a generated document as PDF with perfect symmetric margins,
     * exact list numbering, and multi-page A4 pagination.
     * Uses an isolated iframe to prevent CSS counter leaks (e.g. 2.1 turning into 2.6)
     * and eliminates wrapper padding displacement.
     */
    async downloadDocumentAsPdf(docItem: GeneratedDocument): Promise<void> {
        // 1. Fetch .docx binary
        const response = await fetch(docItem.document_url);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar o arquivo do documento.`);
        }
        const blob = await response.blob();

        // 2. Create isolated hidden iframe to isolate CSS counters and ensure exact A4 layout
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '794px'; // 210mm at 96 DPI
        iframe.style.height = '1123px'; // 297mm at 96 DPI
        iframe.style.border = 'none';
        iframe.style.zIndex = '-9999';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                throw new Error('Não foi possível inicializar ambiente isolado de renderização.');
            }

            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <style>
                        * { box-sizing: border-box; }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                            width: 794px !important;
                            font-family: Arial, sans-serif;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .docx-wrapper {
                            padding: 0 !important;
                            background: #ffffff !important;
                            margin: 0 !important;
                            width: 794px !important;
                            display: block !important;
                        }
                        section.docx {
                            margin: 0 auto !important;
                            box-shadow: none !important;
                            width: 794px !important;
                            box-sizing: border-box !important;
                            background: #ffffff !important;
                        }
                    </style>
                </head>
                <body>
                    <div id="pdf-render-root" style="width: 794px; background: #ffffff; margin: 0; padding: 0;"></div>
                </body>
                </html>
            `);
            iframeDoc.close();

            const container = iframeDoc.getElementById('pdf-render-root')!;

            // 3. Render .docx into HTML inside isolated iframe
            await renderAsync(blob, container, null, {
                inWrapper: false,
                ignoreWidth: false,
                ignoreHeight: false,
                breakPages: true
            });

            // Ensure all sections have clean margins & background
            const sections = Array.from(container.querySelectorAll('section.docx')) as HTMLElement[];
            sections.forEach(sec => {
                sec.style.margin = '0 auto';
                sec.style.boxShadow = 'none';
                sec.style.backgroundColor = '#ffffff';
                sec.style.width = '794px';
                sec.style.boxSizing = 'border-box';
            });

            // 4. If signed, replace placeholder inside document and append signature block
            if (docItem.signature_status === 'signed') {
                if (docItem.signature_url) {
                    const signaturePatterns = [
                        /\{\{\s*IMAGE\s+FIRMA_CLIENTE_?\s*\}\}/gi,
                        /\{\{\s*IMAGE_FIRMA_CLIENTE_?\s*\}\}/gi,
                        /\{\{\s*IMAGE\s+FIRMA_TRABALHADOR_?\s*\}\}/gi,
                        /\{\{\s*IMAGE_FIRMA_TRABALHADOR_?\s*\}\}/gi,
                        /\{\{\s*IMAGE\s+FIRMA_EMPLEADO_?\s*\}\}/gi,
                        /\{\{\s*IMAGE_FIRMA_EMPLEADO_?\s*\}\}/gi,
                        /\{\{\s*assinatura_imagem\s*\}\}/gi,
                        /\{\{\s*imagem_assinatura\s*\}\}/gi,
                        /\{\{\s*trabalhador_assinatura_imagem\s*\}\}/gi,
                        /\{\{\s*FIRMA_CLIENTE\s*\}\}/gi,
                        /\{\{\s*FIRMA_TRABALHADOR\s*\}\}/gi,
                        /\{\{\s*FIRMA_EMPLEADO\s*\}\}/gi,
                        /\{\{\s*assinatura_cliente\s*\}\}/gi,
                        /\{\{\s*assinatura_trabalhador\s*\}\}/gi,
                        /\{\{\s*firma\s*\}\}/gi,
                        /\{\{\s*assinatura\s*\}\}/gi
                    ];

                    const imgTag = `<img src="${docItem.signature_url}" style="max-height: 80px; max-width: 240px; display: inline-block; vertical-align: middle; margin: 4px 0;" alt="Assinatura" />`;

                    const walkTextNodes = (node: Node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            let text = node.nodeValue || '';
                            let modified = false;
                            for (const pattern of signaturePatterns) {
                                if (pattern.test(text)) {
                                    text = text.replace(pattern, '###SIG_IMG###');
                                    modified = true;
                                }
                            }

                            if (modified && node.parentNode) {
                                const span = iframeDoc.createElement('span');
                                span.innerHTML = text.split('###SIG_IMG###').join(imgTag);
                                node.parentNode.replaceChild(span, node);
                            }
                        } else {
                            const children = Array.from(node.childNodes);
                            children.forEach(walkTextNodes);
                        }
                    };

                    walkTextNodes(container);

                    let html = container.innerHTML;
                    let htmlModified = false;
                    for (const pattern of signaturePatterns) {
                        if (pattern.test(html)) {
                            html = html.replace(pattern, imgTag);
                            htmlModified = true;
                        }
                    }
                    if (htmlModified) {
                        container.innerHTML = html;
                    }
                }

                const sigBlock = iframeDoc.createElement('div');
                sigBlock.style.margin = '40px 30px 20px 30px';
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

            // Wait a moment for iframe rendering
            await new Promise(r => setTimeout(r, 250));

            // 5. Generate Multi-page A4 PDF using height slicing loop
            const canvas = await html2canvas(container, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794
            });

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

            // Subsequent pages (Page 2, 3, 4, ..., N)
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
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }
    }
};
