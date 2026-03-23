import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface WorkerIban {
    id: string;
    worker_id: string;
    banco: string | null;
    iban: string | null;
    status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
    documento_url: string | null;
    observacoes: string | null;
    data_alteracao: string | null;
    changed_by: string | null;
    created_at: string;
    updated_at: string;
}

export function useWorkerIbans(workerId: string) {
    return useQuery({
        queryKey: ['worker_ibans', workerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .select('*')
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false });

            if (error) throw mapSupabaseError(error);
            return data as WorkerIban[];
        },
        enabled: !!workerId,
    });
}
