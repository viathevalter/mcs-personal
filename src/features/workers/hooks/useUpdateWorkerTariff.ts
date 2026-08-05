import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { WORKERS_HOLERITES_QUERY_KEY } from '@/features/holerites/hooks/useWorkersForHolerites';
import { toast } from 'sonner';

export interface UpdateWorkerTariffParams {
    workerId: string;
    tarifa: number;
}

export function useUpdateWorkerTariff() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ workerId, tarifa }: UpdateWorkerTariffParams) => {
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .upsert(
                    { worker_id: workerId, tarifa_hora: tarifa }, 
                    { onConflict: 'worker_id' }
                );

            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['workers-tariffs'] });
            queryClient.invalidateQueries({ queryKey: [WORKERS_HOLERITES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['worker-beneficios'] });
            toast.success('Tarifa atualizada com sucesso.');
        },
        onError: (error: any) => {
            console.error('Error updating worker tariff:', error);
            const errMsg = error?.message || 'Erro desconhecido';
            toast.error(`Falha ao atualizar tarifa: ${errMsg}`);
        }
    });
}
