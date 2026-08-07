import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudOperativa } from '../types';

export function usePedidoSolicitudes(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pedidoSolicitudes', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return [];

      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in usePedidoSolicitudes:', error);
        throw error;
      }
      return (data || []) as unknown as SolicitudOperativa[];
    },
    enabled: !!pedidoId,
  });
}
