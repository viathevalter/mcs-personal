import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { GeneratedDocument } from './documentGeneratorService';

export const pdfExportService = {
    /**
     * Downloads a generated document as PDF.
     * If signed, attaches the formal digital signature seal block at the bottom before exporting.
     */
    async downloadDocumentAsPdf(document: GeneratedDocument): Promise<void> {
        // 1. Fetch .docx binary
        const response = await fetch(document.document_url);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar o arquivo do documento.`);
        }
        const blob = await response.blob();

        // 2. Create offscreen container
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

            // 4. If signed, append signature block
            if (document.signature_status === 'signed') {
                const sigBlock = document.createElement('div');
                sigBlock.style.marginTop = '40px';
                sigBlock.style.padding = '20px';
                sigBlock.style.border = '2px solid #10b981';
                sigBlock.style.borderRadius = '12px';
                sigBlock.style.backgroundColor = '#f0fdf4';
                sigBlock.style.pageBreakInside = 'avoid';

                const formattedDate = document.signed_at
                    ? new Date(document.signed_at).toLocaleString('pt-BR')
                    : new Date().toLocaleString('pt-BR');

                sigBlock.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 10px; margin-bottom: 12px;">
                        <span style="font-weight: bold; color: #047857; font-size: 14px;">TERMO DE ASSINATURA DIGITAL (OCT)</span>
                        <span style="font-size: 11px; color: #059669;">VALIDADO E VERIFICADO</span>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        ${document.signature_url ? `<img src="${document.signature_url}" style="max-height: 70px; max-width: 220px; object-contain: contain; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #ffffff;" />` : ''}
                        <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                            <p style="margin: 0;"><strong>Assinado por:</strong> ${document.signed_by_name || 'N/A'}</p>
                            <p style="margin: 0;"><strong>Data e Hora:</strong> ${formattedDate}</p>
                            <p style="margin: 0; font-family: monospace; font-size: 10px; color: #64748b;"><strong>Token Audit:</strong> ${document.public_token}</p>
                        </div>
                    </div>
                `;
                container.appendChild(sigBlock);
            }

            // 5. Capture HTML to Canvas
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // 6. Generate PDF with jsPDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // Clean PDF filename
            const cleanTitle = (document.title || 'documento')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .toLowerCase();
            const pdfName = document.signature_status === 'signed'
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
