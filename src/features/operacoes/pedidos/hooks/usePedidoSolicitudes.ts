import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudOperativa } from '../types';

export function usePedidoSolicitudes(pedidoId: string | undefined) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['pedidoSolicitudes', pedidoId, selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId || !pedidoId) throw new Error('Empresa ou Pedido não selecionado');

      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('*')
        .eq('pedido_id', pedidoId)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in usePedidoSolicitudes:', error);
        throw error;
      }
      return (data || []) as unknown as SolicitudOperativa[];
    },
    enabled: !!selectedEmpresaId && !!pedidoId,
  });
}
