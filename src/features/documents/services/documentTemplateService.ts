import { supabase } from '@/shared/supabase/client';

export interface DocumentTemplate {
    id: string;
    empresa_id?: string;
    name: string;
    target_type: 'client' | 'worker';
    description?: string;
    file_url: string;
    variables?: string[];
    created_at?: string;
    created_by?: string;
}

export const documentTemplateService = {
    async listTemplates(targetType?: 'client' | 'worker'): Promise<DocumentTemplate[]> {
        let query = supabase.from('document_templates').select('*').order('created_at', { ascending: false });
        if (targetType) {
            query = query.eq('target_type', targetType);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching document_templates:', error);
            return [];
        }
        return data || [];
    },

    async uploadTemplateFile(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop() || 'docx';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        const { error: uploadErr } = await supabase.storage
            .from('document-templates')
            .upload(filePath, file, { upsert: true });

        if (uploadErr) {
            throw new Error(`Erro ao fazer upload do modelo: ${uploadErr.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from('document-templates')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    },

    async createTemplate(template: Omit<DocumentTemplate, 'id' | 'created_at'>): Promise<DocumentTemplate> {
        const { data, error } = await supabase
            .from('document_templates')
            .insert(template)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase.from('document_templates').delete().eq('id', id);
        if (error) throw error;
    }
};
