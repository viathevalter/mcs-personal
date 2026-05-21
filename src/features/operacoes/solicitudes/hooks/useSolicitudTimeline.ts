import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudTimeline } from '../types';

export function useSolicitudTimeline(solicitudId: string | undefined) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitud-timeline', selectedEmpresaId, solicitudId],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (!solicitudId) throw new Error('ID não fornecido');

      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_timeline')
        .select(`
          *,
          created_by_user:mcs_users!created_by(id, email)
        `)
        .eq('solicitud_id', solicitudId)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SolicitudTimeline[];
    },
    enabled: !!selectedEmpresaId && !!solicitudId,
  });
}
