import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudDetail } from '../types';

export function useSolicitudDetail(solicitudId: string | undefined) {
  const { selectedEmpresaId, isHolding } = useEmpresa();

  return useQuery({
    queryKey: ['solicitud-detail', selectedEmpresaId, isHolding, solicitudId],
    queryFn: async () => {
      if (!solicitudId) throw new Error('ID não fornecido');

      let query = supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('*')
        .eq('id', solicitudId);

      // Only restrict by empresa_id if user is NOT in holding mode
      if (!isHolding && selectedEmpresaId) {
        query = query.eq('empresa_id', selectedEmpresaId);
      }

      const { data: solicitud, error } = await query.maybeSingle();

      if (error) {
        console.error('Supabase error in useSolicitudDetail:', error);
        throw error;
      }

      if (!solicitud) return null;

      // Buscar Empresa, Pedido associado, Cliente e Obra
      let pedido = null;
      let client = null;
      let client_site = null;
      let empresa = null;

      const fetchPromises: Promise<any>[] = [];

      if (solicitud.empresa_id) {
        fetchPromises.push(
          supabase
            .schema('core_common')
            .from('empresas')
            .select('id, nome, trade_name, legal_name, codigo')
            .eq('id', solicitud.empresa_id)
            .maybeSingle()
            .then(res => { empresa = res.data; })
        );
      }

      if (solicitud.pedido_id) {
        fetchPromises.push(
          supabase
            .schema('core_comercial')
            .from('pedidos')
            .select('id, codigo, client_id, client_site_id')
            .eq('id', solicitud.pedido_id)
            .maybeSingle()
            .then(res => { pedido = res.data; })
        );
      }

      await Promise.all(fetchPromises);

      // Resolve client and site (fall back to pedido if null)
      const targetClientId = solicitud.client_id || pedido?.client_id;
      const targetSiteId = solicitud.client_site_id || pedido?.client_site_id;

      if (targetClientId || targetSiteId) {
        const [{ data: clientData }, { data: siteData }] = await Promise.all([
          targetClientId 
            ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, email, phone').eq('id', targetClientId).maybeSingle() 
            : Promise.resolve({ data: null }),
          targetSiteId 
            ? supabase.schema('core_common').from('client_sites').select('id, name').eq('id', targetSiteId).maybeSingle() 
            : Promise.resolve({ data: null })
        ]);

        client = clientData;
        client_site = siteData;
      }

      return {
        ...solicitud,
        empresa: empresa || undefined,
        client: client || undefined,
        client_site: client_site || undefined,
        pedido: pedido ? {
          ...pedido,
          client: (pedido.client_id === targetClientId ? client : null) || undefined,
          client_site: (pedido.client_site_id === targetSiteId ? client_site : null) || undefined
        } : undefined
      } as SolicitudDetail;
    },
    enabled: !!solicitudId,
  });
}
