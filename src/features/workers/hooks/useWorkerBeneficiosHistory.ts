import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerBeneficiosHistory } from '@/shared/types/corePersonal';

export const BENEFICIOS_HISTORY_QUERY_KEY = 'worker-beneficios-history';

export function useWorkerBeneficiosHistory(workerId: string) {
    return useQuery({
        queryKey: [BENEFICIOS_HISTORY_QUERY_KEY, workerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_history')
                .select(`
                    id,
                    worker_id,
                    changed_by,
                    change_type,
                    old_value,
                    new_value,
                    document_url,
                    created_at
                `)
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching worker beneficios history:', error);
                throw error;
            }

            return data as WorkerBeneficiosHistory[];
        },
        enabled: !!workerId,
    });
}
