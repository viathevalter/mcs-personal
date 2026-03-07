import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerBeneficiosSettings } from '@/shared/types/corePersonal';
import { BENEFICIOS_QUERY_KEY } from './useWorkerBeneficios';
import { toast } from 'sonner';

export function useUpdateWorkerBeneficios() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vars: WorkerBeneficiosSettings) => {
            const { error } = await supabase
                .from('core_personal.worker_beneficios_settings')
                .upsert({
                    worker_id: vars.worker_id,
                    iban: vars.iban,
                    tarifa_hora: vars.tarifa_hora,
                    recebe_auxilio_moradia: vars.recebe_auxilio_moradia,
                    auxilio_moradia_base: vars.auxilio_moradia_base,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'worker_id'
                });

            if (error) throw error;
            return vars;
        },
        onSuccess: (_, vars) => {
            toast.success('Benefícios guardados corretamente.');
            queryClient.invalidateQueries({ queryKey: [BENEFICIOS_QUERY_KEY, vars.worker_id] });
        },
        onError: (error) => {
            console.error('Error updating beneficios:', error);
            toast.error('Erro ao guardar os benefícios.');
        }
    });
}
