import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { WORKERS_HOLERITES_QUERY_KEY } from '@/features/holerites/hooks/useWorkersForHolerites';
import { toast } from 'sonner';

export interface UpdateTarifaPayload {
    workerId: string;
    tarifa: number;
}

export function useImportTarifas() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payloads: UpdateTarifaPayload[]) => {
            // Because Supabase JS doesn't have a simple bulk update for distinct rows without an RPC,
            // we will update them one by one in a Promise.all, which is fine for a few hundred rows.
            const promises = payloads.map(p =>
                supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .upsert({ worker_id: p.workerId, tarifa_hora: p.tarifa }, { onConflict: 'worker_id' })
            );

            const results = await Promise.all(promises);

            // Check for errors
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                console.error('Errors updating tariffs:', errors.map(e => e.error));
                throw new Error(`Falha ao atualizar ${errors.length} tarifas.`);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: [WORKERS_HOLERITES_QUERY_KEY] });
            toast.success(`Tarifas atualizadas com sucesso (${variables.length} trabalhadores).`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao importar tarifas.');
        }
    });
}
