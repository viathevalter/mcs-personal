import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface BankAccountRow {
    worker_id: string;
    worker_nome: string;
    worker_codigo: string;
    cliente_nome: string | null;
    contratante: string | null;
    iban: string | null;
    banco: string | null;
}

export const useAllBankAccounts = (empresaId?: string) => {
    return useQuery({
        // include empresa_id to refetch on switch
        queryKey: ['all-bank-accounts', empresaId],
        queryFn: async (): Promise<BankAccountRow[]> => {
            let query = supabase
                .schema('core_personal')
                .from('workers')
                .select(`
                    id,
                    nome,
                    cod_colab,
                    cliente_nombre,
                    contratante,
                    worker_beneficios_settings (
                        iban,
                        banco
                    )
                `);

            if (empresaId) {
                query = query.eq('empresa_id', empresaId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching bank accounts:", error);
                throw error;
            }

            return (data || []).map((row: any) => {
                // worker_beneficios_settings is an array of matched rows because it's a 1-to-many relationship in Postgrest unless specified,
                // but we know it's a 1-to-1 logically or 0-to-1.
                const settings = Array.isArray(row.worker_beneficios_settings)
                    ? row.worker_beneficios_settings[0]
                    : row.worker_beneficios_settings;

                return {
                    worker_id: row.id,
                    worker_nome: row.nome || 'N/A',
                    worker_codigo: row.cod_colab || 'N/A',
                    cliente_nome: row.cliente_nombre,
                    contratante: row.contratante,
                    iban: settings?.iban || null,
                    banco: settings?.banco || null
                };
            });
        }
    });
};
