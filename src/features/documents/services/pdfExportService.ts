import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { GeneratedDocument } from './documentGeneratorService';

/**
 * Traverses paragraphs in the rendered DOCX container and injects exact
 * hierarchical numbers (1.1, 2.1, 3.1, 4.1), guaranteeing that sub-clause
 * counters always reset to 1 at every new main clause heading.
 */
function applyDirectDomNumbering(container: HTMLElement, doc: Document) {
    // 1. Disable browser CSS pseudo-element counters to eliminate numbering bugs
    const style = doc.createElement('style');
    style.innerHTML = `
        p[class*="num-"]::before, 
        p[class*="docx-num-"]::before,
        p[class*="num-"]:before, 
        p[class*="docx-num-"]:before {
            display: none !important;
            content: "" !important;
        }
    `;
    container.appendChild(style);

    // 2. Track hierarchical counters per numbering definition
    const counters: Record<string, number[]> = {};

    const paragraphs = Array.from(
        container.querySelectorAll('p[class*="num-"], p[class*="docx-num-"]')
    ) as HTMLElement[];

    for (const p of paragraphs) {
        const classList = Array.from(p.classList);
        let numId = 'default';
        let level = -1;

        for (const cls of classList) {
            const match = cls.match(/(?:docx-)?num-(\d+)-(\d+)/);
            if (match) {
                numId = match[1];
                level = parseInt(match[2], 10);
                break;
            }
        }

        if (level === -1) continue;

        if (!counters[numId]) {
            counters[numId] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        }

        // Increment current level
        counters[numId][level]++;

        // Reset all subordinate levels to 0
        for (let l = level + 1; l < counters[numId].length; l++) {
            counters[numId][l] = 0;
        }

        // Build prefix string
        let prefix = '';
        if (level === 0) {
            prefix = `${counters[numId][0]}. `;
        } else if (level === 1) {
            prefix = `${counters[numId][0]}.${counters[numId][1]}. `;
        } else if (level === 2) {
            prefix = `${counters[numId][0]}.${counters[numId][1]}.${counters[numId][2]}. `;
        }

        if (prefix) {
            const numSpan = doc.createElement('span');
            numSpan.className = 'docx-fixed-num-prefix';
            numSpan.style.fontWeight = 'bold';
            numSpan.style.marginRight = '6px';
            numSpan.innerText = prefix;
            p.insertBefore(numSpan, p.firstChild);
        }
    }
}

export function replaceAllSignaturesInDom(
    container: HTMLElement,
    docDom: Document,
    docItem: GeneratedDocument
) {
    const clientSigUrl = docItem.signature_status === 'signed' ? docItem.signature_url : undefined;
    const companySigUrl =
        docItem.company_signature_url ||
        docItem.custom_data?.company_signature_url;
    const companySignerName =
        docItem.company_signed_by_name ||
        docItem.custom_data?.company_signed_by_name;
    const companySignerRole =
        docItem.company_signed_role ||
        docItem.custom_data?.company_signed_role;

    const clientPatterns = [
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

    const companyPatterns = [
        /\{\{\s*IMAGE\s+FIRMA_EMPRESA_?\s*\}\}/gi,
        /\{\{\s*IMAGE_FIRMA_EMPRESA_?\s*\}\}/gi,
        /\{\{\s*IMAGE\s+FIRMA_PRESTADORA_?\s*\}\}/gi,
        /\{\{\s*IMAGE_FIRMA_PRESTADORA_?\s*\}\}/gi,
        /\{\{\s*FIRMA_EMPRESA\s*\}\}/gi,
        /\{\{\s*FIRMA_PRESTADORA\s*\}\}/gi,
        /\{\{\s*empresa_assinatura_imagem\s*\}\}/gi,
        /\{\{\s*assinatura_empresa\s*\}\}/gi
    ];

    // If Company signed, also replace any static embedded signature image inside the Prestadora table cell
    if (companySigUrl) {
        const tableCells = Array.from(container.querySelectorAll('td')) as HTMLElement[];
        for (const td of tableCells) {
            const cellText = td.innerText || '';
            if (cellText.includes('_____') || /PRESTADORA|Nombre:|Cargo:/i.test(cellText)) {
                const imgs = Array.from(td.querySelectorAll('img')) as HTMLImageElement[];
                for (const img of imgs) {
                    if (img.src !== clientSigUrl) {
                        img.src = companySigUrl;
                        img.style.maxHeight = '80px';
                        img.style.maxWidth = '240px';
                        img.style.objectFit = 'contain';
                    }
                }
            }
        }
    }

    const clientImgTag = clientSigUrl
        ? `<img src="${clientSigUrl}" style="max-height: 80px; max-width: 240px; display: inline-block; vertical-align: middle; margin: 4px 0;" alt="Assinatura Cliente" />`
        : '';

    const companyImgTag = companySigUrl
        ? `<img src="${companySigUrl}" style="max-height: 80px; max-width: 240px; display: inline-block; vertical-align: middle; margin: 4px 0;" alt="Assinatura Empresa" />`
        : '';

    const walkTextNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.nodeValue || '';
            let modified = false;

            if (clientSigUrl) {
                for (const pattern of clientPatterns) {
                    if (pattern.test(text)) {
                        text = text.replace(pattern, '###CLIENT_SIG_IMG###');
                        modified = true;
                    }
                }
            }

            if (companySigUrl) {
                for (const pattern of companyPatterns) {
                    if (pattern.test(text)) {
                        text = text.replace(pattern, '###COMPANY_SIG_IMG###');
                        modified = true;
                    }
                }
            }

            if (companySignerName && /\{\{\s*NOMBRE_FIRMANTE_PRESTADORA\s*\}\}/i.test(text)) {
                text = text.replace(/\{\{\s*NOMBRE_FIRMANTE_PRESTADORA\s*\}\}/gi, companySignerName);
                modified = true;
            }
            if (companySignerRole && /\{\{\s*CARGO_FIRMANTE_PRESTADORA\s*\}\}/i.test(text)) {
                text = text.replace(/\{\{\s*CARGO_FIRMANTE_PRESTADORA\s*\}\}/gi, companySignerRole);
                modified = true;
            }

            if (modified && node.parentNode) {
                const span = docDom.createElement('span');
                let finalHtml = text;
                if (clientSigUrl) {
                    finalHtml = finalHtml.split('###CLIENT_SIG_IMG###').join(clientImgTag);
                }
                if (companySigUrl) {
                    finalHtml = finalHtml.split('###COMPANY_SIG_IMG###').join(companyImgTag);
                }
                span.innerHTML = finalHtml;
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

    if (clientSigUrl) {
        for (const pattern of clientPatterns) {
            if (pattern.test(html)) {
                html = html.replace(pattern, clientImgTag);
                htmlModified = true;
            }
        }
    }
    if (companySigUrl) {
        for (const pattern of companyPatterns) {
            if (pattern.test(html)) {
                html = html.replace(pattern, companyImgTag);
                htmlModified = true;
            }
        }
    }
    if (htmlModified) {
        container.innerHTML = html;
    }
}

export const pdfExportService = {
    /**
     * Downloads a generated document as PDF with:
     * 1. Multi-page smart pagination (no text/paragraphs sliced in half)
     * 2. Top and bottom margins on EVERY page (printer-safe)
     * 3. Perfect symmetric left and right margins
     * 4. Exact multi-level clause numbering reset (1.1, 2.1, 3.1, 4.1) via Direct DOM Numbering
     * 5. Bilateral Electronic Signature Audit Certificate (Cliente + Empresa)
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
                        p, h1, h2, h3, h4, h5, h6, table, tr, li, .sig-block {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
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

            // 4. Apply Direct DOM Numbering (1.1, 2.1, 3.1, 4.1) guaranteeing reset at each clause
            applyDirectDomNumbering(container, iframeDoc);

            // Ensure all sections have clean margins & background
            const sections = Array.from(container.querySelectorAll('section.docx')) as HTMLElement[];
            sections.forEach(sec => {
                sec.style.margin = '0 auto';
                sec.style.boxShadow = 'none';
                sec.style.backgroundColor = '#ffffff';
                sec.style.width = '794px';
                sec.style.boxSizing = 'border-box';
            });

            // 5. Replace placeholders and static signature images inside document
            replaceAllSignaturesInDom(container, iframeDoc, docItem);

            const isClientSigned = docItem.signature_status === 'signed';
            const companySigUrl = docItem.company_signature_url || docItem.custom_data?.company_signature_url;
            const isCompanySigned = docItem.company_signature_status === 'signed' || !!companySigUrl;

            // Append Bilateral OCT Digital Signature Certificate Block if either party signed
            if (isClientSigned || isCompanySigned) {
                const sigBlock = iframeDoc.createElement('div');
                sigBlock.className = 'sig-block';
                sigBlock.style.margin = '36px 30px 20px 30px';
                sigBlock.style.padding = '20px';
                sigBlock.style.border = '2px solid #10b981';
                sigBlock.style.borderRadius = '12px';
                sigBlock.style.backgroundColor = '#f0fdf4';
                sigBlock.style.pageBreakInside = 'avoid';

                const clientFormattedDate = docItem.signed_at
                    ? new Date(docItem.signed_at).toLocaleString('pt-BR')
                    : new Date().toLocaleString('pt-BR');

                const companySignedAtRaw = docItem.company_signed_at || docItem.custom_data?.company_signed_at;
                const companyFormattedDate = companySignedAtRaw
                    ? new Date(companySignedAtRaw).toLocaleString('pt-BR')
                    : new Date().toLocaleString('pt-BR');

                const companySignerName =
                    docItem.company_signed_by_name ||
                    docItem.custom_data?.company_signed_by_name ||
                    'Representante da Empresa';

                const companySignerRole =
                    docItem.company_signed_role ||
                    docItem.custom_data?.company_signed_role ||
                    'La Prestadora';

                sigBlock.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 10px; margin-bottom: 14px;">
                        <span style="font-weight: bold; color: #047857; font-size: 13px;">CERTIFICADO DE ASSINATURA ELETRÔNICA (OCT)</span>
                        <span style="font-size: 10px; font-weight: bold; color: #059669; background: #d1fae5; padding: 3px 8px; border-radius: 6px;">VALIDADO E VERIFICADO</span>
                    </div>
                    <div style="display: grid; grid-template-columns: ${isClientSigned && isCompanySigned ? '1fr 1fr' : '1fr'}; gap: 16px;">
                        ${isClientSigned ? `
                        <div style="background: #ffffff; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 8px;">
                                Assinatura Eletrônica — ${docItem.target_type === 'worker' ? 'Trabalhador' : 'Contratante / Cliente'}
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                ${docItem.signature_url ? `<img src="${docItem.signature_url}" style="max-height: 60px; max-width: 150px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #ffffff;" />` : ''}
                                <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                                    <p style="margin: 0;"><strong>Assinado por:</strong> ${docItem.signed_by_name || 'N/A'}</p>
                                    <p style="margin: 0;"><strong>Data/Hora:</strong> ${clientFormattedDate}</p>
                                    <p style="margin: 0; font-family: monospace; font-size: 9px; color: #64748b;"><strong>Token:</strong> ${docItem.public_token}</p>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        ${isCompanySigned ? `
                        <div style="background: #ffffff; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 8px;">
                                Assinatura Eletrônica — Empresa / Prestadora
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                ${companySigUrl ? `<img src="${companySigUrl}" style="max-height: 60px; max-width: 150px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #ffffff;" />` : ''}
                                <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                                    <p style="margin: 0;"><strong>Assinado por:</strong> ${companySignerName}</p>
                                    <p style="margin: 0;"><strong>Cargo:</strong> ${companySignerRole}</p>
                                    <p style="margin: 0;"><strong>Data/Hora:</strong> ${companyFormattedDate}</p>
                                    <p style="margin: 0; font-family: monospace; font-size: 9px; color: #64748b;"><strong>Hash Empresa:</strong> OCT-EMP-${docItem.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                container.appendChild(sigBlock);
            }

            // 6. Smart Page Break Spacer Insertion:
            const PAGE_HEIGHT = 1123;
            const TOP_MARGIN = 50;
            const BOTTOM_MARGIN = 50;
            const PRINTABLE_HEIGHT = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;

            const blockElements = Array.from(
                container.querySelectorAll('p, table, h1, h2, h3, h4, h5, h6, ul, ol, .sig-block')
            ) as HTMLElement[];

            let currentPageTop = 0;

            for (let i = 0; i < blockElements.length; i++) {
                const el = blockElements[i];
                if (el.closest('table') && el.tagName.toLowerCase() !== 'table') continue;

                const elTop = el.offsetTop;
                const elHeight = el.offsetHeight;

                if ((elTop + elHeight) - currentPageTop > PRINTABLE_HEIGHT && (elTop - currentPageTop) > 60) {
                    const spacer = iframeDoc.createElement('div');
                    const neededGap = (currentPageTop + PAGE_HEIGHT) - elTop + TOP_MARGIN;
                    spacer.style.height = `${Math.max(neededGap, 20)}px`;
                    spacer.style.width = '100%';
                    spacer.style.display = 'block';
                    spacer.className = 'page-break-spacer';

                    el.parentNode?.insertBefore(spacer, el);
                    currentPageTop += PAGE_HEIGHT;
                }
            }

            await new Promise(r => setTimeout(r, 250));

            // 7. Capture HTML to Canvas (High clarity scale 1.5)
            const canvas = await html2canvas(container, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794
            });

            // 8. Generate Multi-page A4 PDF with top and bottom margins on EVERY page
            const imgData = canvas.toDataURL('image/jpeg', 0.82);
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfPageHeight;

            while (heightLeft > 0) {
                position -= pdfPageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfPageHeight;
            }

            const cleanTitle = (docItem.title || 'documento')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .toLowerCase();
            const pdfName = (isClientSigned || isCompanySigned)
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
