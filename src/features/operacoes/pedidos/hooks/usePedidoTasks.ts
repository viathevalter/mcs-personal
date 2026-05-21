import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTarea } from '../types';

export function usePedidoTasks(solicitudIds: string[]) {
  const { selectedEmpresaId } = useEmpresa();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pedidoTasks', solicitudIds, selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId || solicitudIds.length === 0) return [];

      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .select(`
          *,
          dependent_on_task:solicitud_tareas!blocked_by_task_id(title)
        `)
        .in('solicitud_id', solicitudIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error in usePedidoTasks:', error);
        throw error;
      }
      return (data || []) as unknown as SolicitudTarea[];
    },
    enabled: !!selectedEmpresaId && solicitudIds.length > 0,
  });

  const iniciarTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { data, error } = await supabase.rpc('iniciar_tarefa', { p_tarefa_id: tarefaId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidoTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pedidoSolicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedidoTimeline'] });
    }
  });

  const concluirTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { data, error } = await supabase.rpc('concluir_tarefa', { p_tarefa_id: tarefaId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidoTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pedidoSolicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedidoTimeline'] });
    }
  });

  return {
    ...query,
    iniciarTarefa: iniciarTarefa.mutateAsync,
    isIniciando: iniciarTarefa.isPending,
    concluirTarefa: concluirTarefa.mutateAsync,
    isConcluindo: concluirTarefa.isPending,
  };
}
