import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

export function useSolicitudActions(solicitudId: string | undefined) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const invalidateQueries = (targetSolicitudId?: string) => {
    const sid = targetSolicitudId || solicitudId;
    if (sid) {
      queryClient.invalidateQueries({ queryKey: ['solicitud-tasks', selectedEmpresaId, sid] });
      queryClient.invalidateQueries({ queryKey: ['solicitud-timeline', selectedEmpresaId, sid] });
      queryClient.invalidateQueries({ queryKey: ['solicitud-detail', selectedEmpresaId, sid] });
    }
    queryClient.invalidateQueries({ queryKey: ['solicitudes', selectedEmpresaId] });
    queryClient.invalidateQueries({ queryKey: ['department-tasks', selectedEmpresaId] });
  };

  const startTask = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { data, error } = await supabase.schema('core_operacoes').rpc('iniciar_tarefa', {
        p_tarefa_id: tarefaId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success('Tarefa iniciada com sucesso');
      invalidateQueries(data?.solicitud_id);
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao iniciar tarefa', { description: error.message });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { data, error } = await supabase.schema('core_operacoes').rpc('concluir_tarefa', {
        p_tarefa_id: tarefaId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.solicitud_status === 'completed') {
        toast.success('Tarefa concluída!', { description: 'Todas as tarefas da solicitação foram finalizadas.' });
      } else if (data?.tarefas_desbloqueadas > 0) {
        toast.success('Tarefa concluída!', { description: `${data.tarefas_desbloqueadas} tarefas desbloqueadas.` });
      } else {
        toast.success('Tarefa concluída com sucesso');
      }
      invalidateQueries(data?.solicitud_id);
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao concluir tarefa', { description: error.message });
    },
  });

  return {
    startTask,
    completeTask,
  };
}
