import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTareaDetail } from '../types';

export function useDepartmentTasks(departmentCodes: string[]) {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();

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
          return ['DOCUMENTACION', 'DOCUMENTACIÓN', 'CONTRATOS', 'SEGURIDAD_SOCIAL'];
        }
        if (upperCode === 'RH' || upperCode === 'RECURSOS_HUMANOS') {
          return ['RH', 'RECURSOS_HUMANOS', 'SEGURIDAD_SOCIAL'];
        }
        return [code];
      });

      const tasks = await fetchAllPages<any>((from, to) => {
        let query = supabase
          .schema('core_operacoes')
          .from('solicitud_tareas')
          .select(`
            *,
            department:departments!inner(id, name, code),
            solicitud:solicitudes_operativas(
              id, codigo, title, status, priority, due_date, pedido_id, tipo, empresa_id, client_id
            ),
            assigned_user:mcs_users!assigned_to(id, email),
            blocked_by_task:solicitud_tareas!blocked_by_task_id(id, title)
          `);

        if (activeEmpresaId) {
          query = query.eq('empresa_id', activeEmpresaId);
        }

        return query
          .in('department.code', expandedCodes)
          .order('created_at', { ascending: false })
          .range(from, to);
      });

      const empresaIds = [...new Set(tasks.map(t => t.solicitud?.empresa_id || t.empresa_id).filter(Boolean))];
      const clientIds = [...new Set(tasks.map(t => t.solicitud?.client_id || t.client_id).filter(Boolean))];
      const parentTaskIds = [...new Set(tasks.map(t => t.blocked_by_task_id).filter(Boolean))];
      const [empresasData, clientsData, parentTasksData] = await Promise.all([
        fetchInChunks<any>(empresaIds, chunk =>
          supabase.schema('core_common').from('empresas').select('id, nome').in('id', chunk)
        ),
        fetchInChunks<any>(clientIds, chunk =>
          supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', chunk)
        ),
        fetchInChunks<any>(parentTaskIds, chunk =>
          supabase.schema('core_operacoes').from('solicitud_tareas').select('id, title').in('id', chunk)
        )
      ]);

      const empresasMap = new Map(empresasData.map(e => [e.id, e]));
      const clientsMap = new Map(clientsData.map(c => [c.id, c]));
      const parentTasksMap = new Map(parentTasksData.map(pt => [pt.id, pt]));

      const mappedTasks = tasks.map(t => {
        const parentTask = t.blocked_by_task_id ? parentTasksMap.get(t.blocked_by_task_id) : null;
        if (!t.solicitud) {
          const emp = empresasMap.get(t.empresa_id);
          const cli = t.client_id ? clientsMap.get(t.client_id) : null;
          return {
            ...t,
            blocked_by_task: parentTask || null,
            solicitud: {
              id: '',
              codigo: t.task_origin === 'chat' ? 'MCS-CHAT' : t.task_origin === 'email_ai' ? 'EMAIL-IA' : 'TAREFA-DIRETA',
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              pedido_id: t.pedido_id,
              tipo: 'incident',
              empresa: emp ? { id: emp.id, name: emp.nome } : null,
              pedido: cli ? {
                id: t.pedido_id || '',
                client: {
                  id: cli.id,
                  legal_name: cli.legal_name,
                  trade_name: cli.trade_name
                }
              } : null
            }
          };
        }
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
