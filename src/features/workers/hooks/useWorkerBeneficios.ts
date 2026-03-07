import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerBeneficiosSettings } from '@/shared/types/corePersonal';

export const BENEFICIOS_QUERY_KEY = 'worker-beneficios';

export function useWorkerBeneficios(workerId: string) {
    return useQuery({
        queryKey: [BENEFICIOS_QUERY_KEY, workerId],
        queryFn: async (): Promise<WorkerBeneficiosSettings | null> => {
            if (!workerId) return null;

            const { data, error } = await supabase
                .from('core_personal.worker_beneficios_settings')
                .select('*')
                .eq('worker_id', workerId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching worker beneficios:', error);
                throw error;
            }

            return data as WorkerBeneficiosSettings | null;
        },
        enabled: !!workerId,
    });
}
