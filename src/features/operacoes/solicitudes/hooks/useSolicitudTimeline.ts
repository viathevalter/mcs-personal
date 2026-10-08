import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTimeline } from '../types';

export function useSolicitudTimeline(solicitudId: string | undefined) {
  const { selectedEmpresaId, isHolding } = useEmpresa();

  return useQuery({
    queryKey: ['solicitud-timeline', selectedEmpresaId, isHolding, solicitudId],
    queryFn: async () => {
      if (!solicitudId) throw new Error('ID não fornecido');

      let query = supabase
        .schema('core_operacoes')
        .from('solicitud_timeline')
        .select(`
          *,
          created_by_user:mcs_users!created_by(id, email)
        `)
        .eq('solicitud_id', solicitudId);

      // Only restrict by empresa_id if user is NOT in holding mode
      if (!isHolding && selectedEmpresaId) {
        query = query.eq('empresa_id', selectedEmpresaId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SolicitudTimeline[];
    },
    enabled: !!solicitudId,
  });
}
