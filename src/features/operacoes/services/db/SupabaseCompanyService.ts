import { supabase } from '../supabaseClient';

export interface Company {
    id: number;
    nome_pbi: string;
}

export const supabaseCompanyService = {
    list: async (): Promise<Company[]> => {
        const { data, error } = await supabase
            .from('empresas')
            .select('id, nome_pbi')
            .order('nome_pbi');

        if (error) {
            console.error('Error listing companies:', error);
            return [];
        }

        return data || [];
    }
};
