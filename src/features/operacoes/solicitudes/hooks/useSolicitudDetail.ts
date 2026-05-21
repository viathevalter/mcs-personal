import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudDetail } from '../types';

export function useSolicitudDetail(solicitudId: string | undefined) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitud-detail', selectedEmpresaId, solicitudId],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (!solicitudId) throw new Error('ID não fornecido');

      const { data: solicitud, error } = await supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('*')
        .eq('id', solicitudId)
        .eq('empresa_id', selectedEmpresaId)
        .single();

      if (error) {
        console.error('Supabase error in useSolicitudDetail:', error);
        throw error;
      }

      if (!solicitud) return null;

      // Buscar Pedido associado
      let pedido = null;
      let client = null;
      let client_site = null;

      if (solicitud.pedido_id) {
        const { data: pedidoData } = await supabase
          .schema('core_comercial')
          .from('pedidos')
          .select('id, codigo, client_id, client_site_id')
          .eq('id', solicitud.pedido_id)
          .single();

        pedido = pedidoData;

        if (pedido) {
          const [{ data: clientData }, { data: siteData }] = await Promise.all([
            pedido.client_id ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').eq('id', pedido.client_id).maybeSingle() : Promise.resolve({ data: null }),
            pedido.client_site_id ? supabase.schema('core_common').from('client_sites').select('id, name').eq('id', pedido.client_site_id).maybeSingle() : Promise.resolve({ data: null })
          ]);

          client = clientData;
          client_site = siteData;
        }
      }

      return {
        ...solicitud,
        pedido: pedido ? {
          ...pedido,
          client: client || undefined,
          client_site: client_site || undefined
        } : undefined
      } as SolicitudDetail;
    },
    enabled: !!selectedEmpresaId && !!solicitudId,
  });
}
