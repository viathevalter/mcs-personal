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

      const parentTaskIds = [...new Set((data || []).map((t: any) => t.blocked_by_task_id).filter(Boolean))];
      const { data: parentTasks } = parentTaskIds.length > 0
        ? await supabase.schema('core_operacoes').from('solicitud_tareas').select('id, title').in('id', parentTaskIds)
        : { data: [] };
      const parentTasksMap = new Map(parentTasks?.map(pt => [pt.id, pt]) || []);

      const mapped = (data || []).map((t: any) => ({
        ...t,
        blocked_by_task: t.blocked_by_task_id ? parentTasksMap.get(t.blocked_by_task_id) || null : null
      }));
      return mapped as SolicitudTareaDetail[];
    },
    enabled: !!selectedEmpresaId && !!solicitudId,
  });
}
