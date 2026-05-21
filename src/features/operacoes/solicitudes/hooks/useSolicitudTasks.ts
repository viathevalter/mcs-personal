import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTareaDetail } from '../types';

export function useSolicitudTasks(solicitudId: string | undefined) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitud-tasks', selectedEmpresaId, solicitudId],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (!solicitudId) throw new Error('ID não fornecido');

      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .select(`
          *,
          blocked_by_task:solicitud_tareas!blocked_by_task_id(id, title)
        `)
        .eq('solicitud_id', solicitudId)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error in useSolicitudTasks:', error);
        throw error;
      }
      return data as SolicitudTareaDetail[];
    },
    enabled: !!selectedEmpresaId && !!solicitudId,
  });
}
