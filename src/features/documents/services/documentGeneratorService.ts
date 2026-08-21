import { supabase } from '@/shared/supabase/client';
import createReport from 'docx-templates';
import JSZip from 'jszip';

export interface GeneratedDocument {
    id: string;
    empresa_id?: string;
    template_id?: string;
    target_type: 'client' | 'worker';
    client_id?: string;
    worker_id?: string;
    title: string;
    document_url: string;
    pdf_url?: string;
    signature_status: 'draft' | 'pending' | 'signed' | 'rejected';
    public_token: string;
    signature_url?: string;
    signed_at?: string;
    signed_by_name?: string;
    signed_ip?: string;
    custom_data?: any;
    created_at?: string;
    created_by?: string;
}

interface StyleContext {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: string | null;
    fontFamily: string | null;
    fontSize: number | null;
}

function rgbOrHexToWordColor(color: string): string | null {
    if (!color) return null;
    const hexMatch = color.match(/#?([0-9a-fA-F]{6})/);
    if (hexMatch) return hexMatch[1].toUpperCase();

    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
        return `${r}${g}${b}`.toUpperCase();
    }
    return null;
}

function fontSizeToHalfPoints(sizeStr: string): number | null {
    if (!sizeStr) return null;
    if (/^[1-7]$/.test(sizeStr.trim())) {
        const map: Record<string, number> = { '1': 20, '2': 24, '3': 28, '4': 32, '5': 36, '6': 48, '7': 72 };
        return map[sizeStr.trim()] || 24;
    }
    const pxMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*px/i);
    if (pxMatch) {
        const px = parseFloat(pxMatch[1]);
        return Math.round(px * 2); // 18px -> 36 half points
    }
    const ptMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*pt/i);
    if (ptMatch) {
        const pt = parseFloat(ptMatch[1]);
        return Math.round(pt * 2);
    }
    return null;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function convertHtmlToWordXml(html: string): string {
    if (!html) return '';

    // If pure text without tags
    if (!html.includes('<') && !html.includes('>')) {
        return escapeXml(html).replace(/\n/g, '</w:t><w:br/><w:t>');
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const root = doc.body.firstElementChild || doc.body;

        let runsXml = '';

        const traverse = (node: Node, parentStyle: StyleContext) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue || '';
                if (!text) return;

                // Build <w:rPr>
                let rPr = '';
                if (parentStyle.fontFamily) {
                    rPr += `<w:rFonts w:ascii="${parentStyle.fontFamily}" w:hAnsi="${parentStyle.fontFamily}" w:cs="${parentStyle.fontFamily}"/>`;
                }
                if (parentStyle.bold) {
                    rPr += '<w:b/>';
                }
                if (parentStyle.italic) {
                    rPr += '<w:i/>';
                }
                if (parentStyle.underline) {
                    rPr += '<w:u w:val="single"/>';
                }
                if (parentStyle.color) {
                    rPr += `<w:color w:val="${parentStyle.color}"/>`;
                }
                if (parentStyle.fontSize) {
                    rPr += `<w:sz w:val="${parentStyle.fontSize}"/>`;
                }

                const rPrTag = rPr ? `<w:rPr>${rPr}</w:rPr>` : '';
                runsXml += `<w:r>${rPrTag}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName.toLowerCase();

                const childStyle: StyleContext = { ...parentStyle };

                if (tagName === 'b' || tagName === 'strong') {
                    childStyle.bold = true;
                }
                if (tagName === 'i' || tagName === 'em') {
                    childStyle.italic = true;
                }
                if (tagName === 'u') {
                    childStyle.underline = true;
                }
                if (tagName === 'font') {
                    const colorAttr = el.getAttribute('color');
                    if (colorAttr) {
                        const parsedColor = rgbOrHexToWordColor(colorAttr);
                        if (parsedColor) childStyle.color = parsedColor;
                    }
                    const faceAttr = el.getAttribute('face');
                    if (faceAttr) {
                        childStyle.fontFamily = faceAttr.replace(/["']/g, '');
                    }
                    const sizeAttr = el.getAttribute('size');
                    if (sizeAttr) {
                        const parsedSize = fontSizeToHalfPoints(sizeAttr);
                        if (parsedSize) childStyle.fontSize = parsedSize;
                    }
                }

                const styleAttr = el.getAttribute('style');
                if (styleAttr) {
                    const styleColor = el.style.color;
                    if (styleColor) {
                        const parsedColor = rgbOrHexToWordColor(styleColor);
                        if (parsedColor) childStyle.color = parsedColor;
                    }
                    const styleFont = el.style.fontFamily;
                    if (styleFont) {
                        childStyle.fontFamily = styleFont.replace(/["']/g, '').split(',')[0].trim();
                    }
                    const styleSize = el.style.fontSize;
                    if (styleSize) {
                        const parsedSize = fontSizeToHalfPoints(styleSize);
                        if (parsedSize) childStyle.fontSize = parsedSize;
                    }
                    if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 700) {
                        childStyle.bold = true;
                    }
                    if (el.style.fontStyle === 'italic') {
                        childStyle.italic = true;
                    }
                    if (el.style.textDecoration?.includes('underline')) {
                        childStyle.underline = true;
                    }
                }

                if (tagName === 'br') {
                    runsXml += '<w:r><w:br/></w:r>';
                    return;
                }

                Array.from(node.childNodes).forEach(child => traverse(child, childStyle));

                if (tagName === 'p' || tagName === 'div' || tagName === 'li') {
                    runsXml += '<w:r><w:br/><w:br/></w:r>';
                }
            }
        };

        const baseStyle: StyleContext = {
            bold: false,
            italic: false,
            underline: false,
            color: null,
            fontFamily: null,
            fontSize: null
        };

        Array.from(root.childNodes).forEach(child => traverse(child, baseStyle));

        // Clean trailing breaks
        runsXml = runsXml.replace(/(?:<w:r><w:br\/><w:br\/><\/w:r>)+$/, '');

        // Break out of current <w:t>, insert new runs, and resume next <w:t>
        return `</w:t></w:r>${runsXml}<w:r><w:t>`;
    } catch (e) {
        console.warn('HTML to Word XML conversion fallback:', e);
        return escapeXml(html.replace(/<[^>]+>/g, '')).replace(/\n/g, '</w:t><w:br/><w:t>');
    }
}

export const documentGeneratorService = {
    async generateDocumentFromTemplate(params: {
        templateUrl: string;
        templateId?: string;
        title: string;
        targetType: 'client' | 'worker';
        clientId?: string;
        workerId?: string;
        dataMap: Record<string, string>;
    }): Promise<GeneratedDocument> {
        // 1. Fetch template binary
        const response = await fetch(params.templateUrl);
        if (!response.ok) {
            throw new Error(`Não foi possível baixar o modelo .docx da URL.`);
        }
        const templateBuffer = await response.arrayBuffer();

        // 1b. Direct Zip XML Pre-Processor (Reconstitutes split Word tags and replaces all {{placeholders}})
        let zipProcessedBuffer: ArrayBuffer = templateBuffer;
        try {
            const zip = await JSZip.loadAsync(templateBuffer);
            const xmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.xml'));

            for (const fileName of xmlFiles) {
                let xmlStr = await zip.files[fileName].async('string');

                // Reconstitute broken Word XML tags inside {{...}}
                xmlStr = xmlStr.replace(/\{\{(?:<[^>]+>|[^}])*\}\}/g, (m) => m.replace(/<[^>]+>/g, ''));

                // Perform direct replacement with styled WordprocessingML runs
                for (const [k, v] of Object.entries(params.dataMap)) {
                    const cleanK = k.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
                    // Skip signature placeholders so they remain in the .docx for signing
                    if (/firma|assinatura|image/i.test(cleanK) && !v) {
                        continue;
                    }

                    const rawVal = v || '';
                    const wordXmlValue = convertHtmlToWordXml(rawVal);

                    if (cleanK) {
                        const escapedK = cleanK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\{\\{\\s*${escapedK}\\s*\\}\\}`, 'gi');
                        xmlStr = xmlStr.replace(regex, wordXmlValue);
                    }
                }

                zip.file(fileName, xmlStr);
            }

            const uint8 = await zip.generateAsync({ type: 'uint8array' });
            zipProcessedBuffer = uint8.buffer as ArrayBuffer;
        } catch (zipErr) {
            console.warn("JSZip preprocessing error, continuing with docx-templates:", zipErr);
        }

        // 2. Prepare nested and flat variables map for docx-templates
        const cmdData: Record<string, any> = {
            cliente: {},
            trabalhador: {},
            empresa: {},
            geral: {}
        };

        for (const [k, v] of Object.entries(params.dataMap)) {
            const cleanKey = k.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
            cmdData[cleanKey] = v;

            if (cleanKey.includes('.')) {
                const [category, prop] = cleanKey.split('.');
                if (!cmdData[category]) cmdData[category] = {};
                cmdData[category][prop] = v;
            }
        }

        // Preserve signature placeholders in docx-templates
        const signaturePlaceholders = [
            'IMAGE FIRMA_CLIENTE',
            'IMAGE_FIRMA_CLIENTE',
            'IMAGE FIRMA_TRABALHADOR',
            'IMAGE_FIRMA_TRABALHADOR',
            'IMAGE FIRMA_EMPLEADO',
            'IMAGE_FIRMA_EMPLEADO',
            'assinatura_imagem',
            'imagem_assinatura',
            'trabalhador_assinatura_imagem',
            'FIRMA_CLIENTE',
            'FIRMA_TRABALHADOR',
            'FIRMA_EMPLEADO',
            'assinatura_cliente',
            'assinatura_trabalhador',
            'firma',
            'assinatura'
        ];

        for (const sigPh of signaturePlaceholders) {
            if (!cmdData[sigPh]) {
                cmdData[sigPh] = `{{${sigPh}}}`;
            }
        }

        // 3. Process with docx-templates
        let filledBuffer: Uint8Array;
        try {
            filledBuffer = await createReport({
                template: new Uint8Array(zipProcessedBuffer),
                data: cmdData,
                cmdDelimiter: ['{{', '}}'],
                processLineBreaks: true,
                failFast: false,
                errorHandler: (err: any, cmd?: string) => {
                    if (cmd && /firma|assinatura|image/i.test(cmd)) {
                        return `{{${cmd}}}`;
                    }
                    return '';
                }
            });
        } catch (err: any) {
            console.warn("docx-templates failed, using zip processed buffer:", err);
            filledBuffer = new Uint8Array(zipProcessedBuffer);
        }

        // 4. Upload generated document to Supabase Storage
        const fileName = `generated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.docx`;
        const filePath = `generated/${fileName}`;

        let usedBucket = 'generated-documents';
        let uploadRes = await supabase.storage
            .from(usedBucket)
            .upload(filePath, filledBuffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true
            });

        if (uploadRes.error) {
            // Fallback to 'documents' bucket
            const fallbackRes = await supabase.storage
                .from('documents')
                .upload(filePath, filledBuffer, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true
                });
            if (!fallbackRes.error) {
                usedBucket = 'documents';
            } else {
                throw new Error(`Erro ao fazer upload do documento gerado: ${uploadRes.error.message}`);
            }
        }

        const { data: publicUrlData } = supabase.storage
            .from(usedBucket)
            .getPublicUrl(filePath);

        const documentUrl = publicUrlData.publicUrl;

        // 5. Generate secure public signing token
        const publicToken = crypto.randomUUID();

        // 6. Save in public.generated_documents
        const { data: docRecord, error: dbError } = await supabase
            .from('generated_documents')
            .insert({
                template_id: params.templateId || null,
                target_type: params.targetType,
                client_id: params.clientId || null,
                worker_id: params.workerId || null,
                title: params.title,
                document_url: documentUrl,
                signature_status: 'pending',
                public_token: publicToken,
                custom_data: params.dataMap
            })
            .select('*')
            .single();

        if (dbError) {
            throw new Error(`Erro ao registrar documento gerado no banco: ${dbError.message}`);
        }

        return docRecord;
    },

    async listGeneratedDocuments(): Promise<GeneratedDocument[]> {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching generated documents:', error);
            return [];
        }

        return (data || []) as GeneratedDocument[];
    },

    async getByToken(token: string): Promise<GeneratedDocument | null> {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('public_token', token)
            .single();

        if (error) {
            console.error('Error fetching document by token:', error);
            return null;
        }

        return data as GeneratedDocument;
    },

    async submitSignature(token: string, payload: {
        signedByName: string;
        signatureDataUrl: string;
    }): Promise<GeneratedDocument> {
        // 1. Upload signature image to storage
        const base64Data = payload.signatureDataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const sigBlob = new Blob([byteArray], { type: 'image/png' });

        const sigFileName = `sig_${Date.now()}_${token.slice(0, 8)}.png`;
        const sigPath = `signatures/${sigFileName}`;

        let sigBucket = 'proposal-signatures';
        let sigUploadErr = (await supabase.storage
            .from(sigBucket)
            .upload(sigPath, sigBlob, {
                contentType: 'image/png',
                upsert: true
            })).error;

        if (sigUploadErr) {
            const fallbackRes = await supabase.storage
                .from('signatures')
                .upload(sigPath, sigBlob, {
                    contentType: 'image/png',
                    upsert: true
                });
            if (!fallbackRes.error) {
                sigUploadErr = null;
                sigBucket = 'signatures';
            }
        }

        let signatureUrl = payload.signatureDataUrl;
        if (!sigUploadErr) {
            const { data: sigPublicUrlData } = supabase.storage
                .from(sigBucket)
                .getPublicUrl(sigPath);
            signatureUrl = sigPublicUrlData.publicUrl;
        }

        // 2. Update record in database
        const { data, error } = await supabase
            .from('generated_documents')
            .update({
                signature_status: 'signed',
                signature_url: signatureUrl,
                signed_by_name: payload.signedByName,
                signed_at: new Date().toISOString()
            })
            .eq('public_token', token)
            .select('*')
            .single();

        if (error) {
            throw new Error(`Erro ao registrar assinatura: ${error.message}`);
        }

        return data as GeneratedDocument;
    },

    async deleteGeneratedDocument(id: string): Promise<void> {
        const { error } = await supabase
            .from('generated_documents')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Erro ao excluir documento: ${error.message}`);
        }
    }
};
