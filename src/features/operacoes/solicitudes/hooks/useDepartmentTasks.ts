import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTareaDetail } from '../types';

export function useDepartmentTasks(departmentCodes: string[]) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['department-tasks', selectedEmpresaId, departmentCodes],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (!departmentCodes || departmentCodes.length === 0) return [];

      // Expand department codes to cover database inconsistencies with accents/variations
      const expandedCodes = departmentCodes.flatMap(code => {
        const upperCode = code.toUpperCase();
        if (upperCode === 'OPERACOES' || upperCode === 'OPERAÇÕES') {
          return ['OPERACOES', 'OPERAÇÕES'];
        }
        if (upperCode === 'LOGISTICA' || upperCode === 'LOGÍSTICA') {
          return ['LOGISTICA', 'LOGÍSTICA'];
        }
        if (upperCode === 'DOCUMENTACION' || upperCode === 'DOCUMENTACIÓN') {
          return ['DOCUMENTACION', 'DOCUMENTACIÓN', 'CONTRATOS'];
        }
        if (upperCode === 'RH' || upperCode === 'RECURSOS_HUMANOS') {
          return ['RH', 'RECURSOS_HUMANOS'];
        }
        return [code];
      });

      let query = supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .select(`
          *,
          department:departments!inner(id, name, code),
          solicitud:solicitudes_operativas!inner(
            id, codigo, title, status, priority, due_date, pedido_id, tipo, empresa_id, client_id
          ),
          assigned_user:mcs_users!assigned_to(id, email),
          blocked_by_task:solicitud_tareas!blocked_by_task_id(id, title)
        `);

      if (selectedEmpresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
        query = query.eq('empresa_id', selectedEmpresaId);
      }

      const { data, error } = await query
        .in('department.code', expandedCodes)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks = (data || []) as any[];
      const empresaIds = [...new Set(tasks.map(t => t.solicitud?.empresa_id).filter(Boolean))];
      const clientIds = [...new Set(tasks.map(t => t.solicitud?.client_id).filter(Boolean))];
      const parentTaskIds = [...new Set(tasks.map(t => t.blocked_by_task_id).filter(Boolean))];
      const [empresasRes, clientsRes, parentTasksRes] = await Promise.all([
        empresaIds.length > 0
          ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        parentTaskIds.length > 0
          ? supabase.schema('core_operacoes').from('solicitud_tareas').select('id, title').in('id', parentTaskIds)
          : Promise.resolve({ data: [] })
      ]);

      const empresasMap = new Map(empresasRes.data?.map(e => [e.id, e]) || []);
      const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);
      const parentTasksMap = new Map(parentTasksRes.data?.map(pt => [pt.id, pt]) || []);

      const mappedTasks = tasks.map(t => {
        const parentTask = t.blocked_by_task_id ? parentTasksMap.get(t.blocked_by_task_id) : null;
        if (!t.solicitud) return { ...t, blocked_by_task: parentTask || null };
        const emp = empresasMap.get(t.solicitud.empresa_id);
        const cli = clientsMap.get(t.solicitud.client_id);
        return {
          ...t,
          blocked_by_task: parentTask || null,
          solicitud: {
            ...t.solicitud,
            empresa: emp ? { id: emp.id, name: emp.nome } : null,
            pedido: cli ? {
              id: t.solicitud.pedido_id || '',
              client: {
                id: cli.id,
                legal_name: cli.legal_name,
                trade_name: cli.trade_name
              }
            } : null
          }
        };
      });

      return mappedTasks as unknown as SolicitudTareaDetail[]; 
    },
    enabled: !!selectedEmpresaId && departmentCodes.length > 0,
  });
}
