import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { WORKERS_HOLERITES_QUERY_KEY } from '@/features/holerites/hooks/useWorkersForHolerites';
import { toast } from 'sonner';

export interface UpdateWorkerTariffParams {
    workerId: string;
    tarifa: number;
    mesVigencia?: string;
}

export function useUpdateWorkerTariff() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ workerId, tarifa, mesVigencia }: UpdateWorkerTariffParams) => {
            const now = new Date();
            const nowIso = now.toISOString();
            const currentMonth = mesVigencia || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const { data: prevSetting } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .select('tarifa_hora')
                .eq('worker_id', workerId)
                .maybeSingle();

            const prevTarifa = Number(prevSetting?.tarifa_hora || 0);

            const { error } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .upsert(
                    { worker_id: workerId, tarifa_hora: tarifa, updated_at: nowIso },
                    { onConflict: 'worker_id' }
                );

            if (error) {
                throw error;
            }

            // Record schedule and audit log so past months preserve previous tariff
            await supabase
                .schema('core_personal')
                .from('worker_tariff_schedules')
                .upsert(
                    {
                        worker_id: workerId,
                        tarifa_hora: tarifa,
                        mes_inicio: currentMonth,
                        aprovado_por_nome: 'Cadastro de Tarifas',
                        aprovado_em: nowIso
                    },
                    { onConflict: 'worker_id,mes_inicio' }
                );

            if (prevTarifa > 0 && Math.abs(prevTarifa - tarifa) > 0.005) {
                await supabase
                    .schema('core_personal')
                    .from('worker_tariff_audit_logs')
                    .insert({
                        worker_id: workerId,
                        tarifa_anterior: prevTarifa,
                        tarifa_nova: tarifa,
                        mes_vigencia: currentMonth,
                        alterado_por_nome: 'Cadastro de Tarifas',
                        autorizado_por_nome: 'Cadastro de Tarifas',
                        motivo: `Atualização de tarifa a partir de ${currentMonth}`,
                        created_at: nowIso
                    });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['workers-tariffs'] });
            queryClient.invalidateQueries({ queryKey: [WORKERS_HOLERITES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['worker-beneficios'] });
            queryClient.invalidateQueries({ queryKey: ['effective-tariffs-month'] });
            toast.success('Tarifa atualizada com sucesso.');
        },
        onError: (error: any) => {
            console.error('Error updating worker tariff:', error);
            const errMsg = error?.message || 'Erro desconhecido';
            toast.error(`Falha ao atualizar tarifa: ${errMsg}`);
        }
    });
}
