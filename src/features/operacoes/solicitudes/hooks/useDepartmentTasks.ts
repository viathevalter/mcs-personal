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
          solicitud:solicitudes_operativas!inner(id, codigo, title, status, priority, due_date, pedido_id, tipo),
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
      return data as unknown as SolicitudTareaDetail[]; 
    },
    enabled: !!selectedEmpresaId && departmentCodes.length > 0,
  });
}
