import { supabase } from '@/shared/supabase/client';
import createReport from 'docx-templates';

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

        // 2. Prepare nested and flat variables map for docx-templates
        const cmdData: Record<string, any> = {
            cliente: {},
            trabalhador: {},
            empresa: {},
            geral: {}
        };

        for (const [key, val] of Object.entries(params.dataMap)) {
            const cleanKey = key.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
            const valueStr = val || '';

            cmdData[cleanKey] = valueStr;
            cmdData[key] = valueStr;

            if (cleanKey.includes('.')) {
                const [category, ...rest] = cleanKey.split('.');
                const prop = rest.join('.');
                if (!cmdData[category] || typeof cmdData[category] !== 'object') {
                    cmdData[category] = {};
                }
                cmdData[category][prop] = valueStr;
                if (!cmdData[prop]) {
                    cmdData[prop] = valueStr;
                }
            }
        }

        const dataResolver = (query?: string) => {
            if (!query) return cmdData;
            const clean = query.trim();
            if (clean.includes('.')) {
                const [parent, child] = clean.split('.');
                if (cmdData[parent] && typeof cmdData[parent] === 'object' && cmdData[parent][child] !== undefined) {
                    return cmdData[parent][child];
                }
            }
            return cmdData[clean] ?? params.dataMap[clean] ?? params.dataMap[`{{${clean}}}`] ?? '';
        };

        let outputUint8Array: Uint8Array;
        try {
            outputUint8Array = await createReport({
                template: new Uint8Array(templateBuffer),
                data: dataResolver as any,
                cmdDelimiter: ['{{', '}}'],
                failFast: false
            });
        } catch (reportErr) {
            console.warn("docx-templates failed, returning original template as fallback:", reportErr);
            outputUint8Array = new Uint8Array(templateBuffer);
        }

        // 3. Upload generated document to Supabase storage
        const fileName = `generated_${Date.now()}_${Math.random().toString(36).substring(7)}.docx`;
        const filePath = `generated/${fileName}`;
        const blob = new Blob([outputUint8Array], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        const { error: uploadErr } = await supabase.storage
            .from('generated-documents')
            .upload(filePath, blob, { upsert: true });

        if (uploadErr) {
            throw new Error(`Erro ao salvar documento gerado no storage: ${uploadErr.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from('generated-documents')
            .getPublicUrl(filePath);

        const docUrl = publicUrlData.publicUrl;

        // 4. Save metadata to generated_documents table
        const { data, error } = await supabase
            .from('generated_documents')
            .insert({
                template_id: params.templateId || null,
                target_type: params.targetType,
                client_id: params.clientId || null,
                worker_id: params.workerId || null,
                title: params.title,
                document_url: docUrl,
                signature_status: 'pending',
                custom_data: params.dataMap
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async listGeneratedDocuments(): Promise<GeneratedDocument[]> {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching generated_documents:', error);
            return [];
        }
        return data || [];
    },

    async getByToken(token: string): Promise<GeneratedDocument | null> {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('public_token', token)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async submitSignature(token: string, params: {
        signedByName: string;
        signatureDataUrl: string;
    }): Promise<GeneratedDocument> {
        // Upload signature image to storage
        let signatureUrl = params.signatureDataUrl;
        if (params.signatureDataUrl.startsWith('data:image')) {
            const base64Data = params.signatureDataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            const fileName = `sig_${token}_${Date.now()}.png`;
            const filePath = `signatures/${fileName}`;

            const { error: sigUploadErr } = await supabase.storage
                .from('generated-documents')
                .upload(filePath, blob, { upsert: true });

            if (!sigUploadErr) {
                const { data: pubUrl } = supabase.storage.from('generated-documents').getPublicUrl(filePath);
                signatureUrl = pubUrl.publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('generated_documents')
            .update({
                signature_status: 'signed',
                signature_url: signatureUrl,
                signed_by_name: params.signedByName,
                signed_at: new Date().toISOString()
            })
            .eq('public_token', token)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteGeneratedDocument(id: string): Promise<void> {
        const { error } = await supabase.from('generated_documents').delete().eq('id', id);
        if (error) throw error;
    }
};
