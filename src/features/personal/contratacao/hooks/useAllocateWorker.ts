import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

interface AllocateWorkerPayload {
  empresa_id?: string;
  pedido_item_id?: string;
  worker_id?: string;
  worker_name?: string;
  worker_document?: string;
  planned_start_date: string;
  planned_end_date?: string;
  solicitud_id?: string;
  solicitud_target_id?: string;
  notes?: string;
  camiseta?: string;
  pantalones?: string;
  licencia_conducir?: string;
  movil?: string;
  tarifa_acordada?: number;
  job_function_id?: string;
  job_function_name?: string;
}

export const useAllocateWorker = () => {
  const { selectedEmpresaId } = useEmpresa();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocateWorkerPayload) => {
      const targetEmpresaId = payload.empresa_id || selectedEmpresaId;
      if (!targetEmpresaId) throw new Error('Nenhuma empresa selecionada');

      const { data, error } = await supabase.schema('core_personal').rpc('alocar_trabalhador_em_vaga', {
        payload: {
          empresa_id: targetEmpresaId,
          ...payload
        }
      });

      if (error) {
        console.error('Erro ao alocar trabalhador:', error);
        throw error;
      }

      // Automatically sync the agreed hourly rate by competence month (without overwriting previous months)
      const effectiveWorkerId = payload.worker_id || (data as any)?.worker_id || (data as any)?.id;
      if (effectiveWorkerId && payload.tarifa_acordada && payload.tarifa_acordada > 0) {
        try {
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const mesInicio = payload.planned_start_date && /^\d{4}-\d{2}/.test(payload.planned_start_date)
            ? payload.planned_start_date.slice(0, 7)
            : currentMonth;

          const { data: prevSetting } = await supabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .select('tarifa_hora')
            .eq('worker_id', effectiveWorkerId)
            .maybeSingle();

          const tarifaAnterior = Number(prevSetting?.tarifa_hora || 0);

          const { data: authData } = await supabase.auth.getUser();
          const actorEmail = authData?.user?.email || 'Contratação';

          await supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .upsert(
              {
                worker_id: effectiveWorkerId,
                tarifa_hora: payload.tarifa_acordada,
                mes_inicio: mesInicio,
                aprovado_por_nome: 'Contratação Inicial',
                aprovado_em: now.toISOString()
              },
              { onConflict: 'worker_id,mes_inicio' }
            );

          if (mesInicio <= currentMonth) {
            await supabase
              .schema('core_personal')
              .from('worker_beneficios_settings')
              .upsert({ worker_id: effectiveWorkerId, tarifa_hora: payload.tarifa_acordada }, { onConflict: 'worker_id' });
          }

          await supabase
            .schema('core_personal')
            .from('worker_tariff_audit_logs')
            .insert({
              worker_id: effectiveWorkerId,
              tarifa_anterior: tarifaAnterior,
              tarifa_nova: payload.tarifa_acordada,
              mes_vigencia: mesInicio,
              alterado_por_nome: actorEmail,
              autorizado_por_nome: 'Contratação Inicial',
              motivo: payload.notes ? `Contratação Inicial: ${payload.notes}` : 'Tarifa definida na alocação (Contratação Inicial)'
            });
        } catch (tariffSyncErr) {
          console.warn('Could not auto-sync tariff to worker_beneficios_settings:', tariffSyncErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Trabalhador alocado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['worker_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido_items'] });
      queryClient.invalidateQueries({ queryKey: ['inactive_workers'] });
      queryClient.invalidateQueries({ queryKey: ['active_pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido_allocations'] });
      queryClient.invalidateQueries({ queryKey: ['workers-tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['workers_holerites'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao alocar: ${error.message || 'Erro desconhecido'}`);
    }
  });
};
