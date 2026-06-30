import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudDetail } from '../types';

interface UseSolicitudesFilters {
  status?: string;
  tipo?: string;
  priority?: string;
  search?: string;
}

export function useSolicitudes(filters?: UseSolicitudesFilters) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitudes', selectedEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      let query = supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.tipo && filters.tipo !== 'all') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.search) {
        query = query.or(`codigo.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
      }

      const { data: solicitudes, error } = await query;

      if (error) throw error;
      if (!solicitudes || solicitudes.length === 0) return [];

      // 1. Fetch related pedidos
      let pedidosList: any[] = [];
      const pedidoIds = [...new Set(solicitudes.map(s => s.pedido_id).filter(Boolean))];
      if (pedidoIds.length > 0) {
        const { data: pData } = await supabase
          .schema('core_comercial')
          .from('pedidos')
          .select('id, codigo, client_id, client_site_id')
          .in('id', pedidoIds);
        if (pData) pedidosList = pData;
      }
      const pedidosMap = new Map(pedidosList.map(p => [p.id, p]));

      // 2. Collect all client and site IDs (both from direct client_id on solicitudes and from linked pedidos)
      const clientIds = [
        ...new Set([
          ...solicitudes.map(s => s.client_id),
          ...pedidosList.map(p => p.client_id)
        ].filter(Boolean))
      ];
      const siteIds = [
        ...new Set([
          ...solicitudes.map(s => s.client_site_id),
          ...pedidosList.map(p => p.client_site_id)
        ].filter(Boolean))
      ];

      // 3. Fetch Clients and Sites
      const [clientsRes, sitesRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map((clientsRes.data || []).map(c => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map(s => [s.id, s]));

      return solicitudes.map(s => {
        const p = s.pedido_id ? pedidosMap.get(s.pedido_id) : null;
        
        // Resolve client and site (direct values on solicitud have priority)
        const resolvedClient = clientsMap.get(s.client_id || p?.client_id) || undefined;
        const resolvedSite = sitesMap.get(s.client_site_id || p?.client_site_id) || undefined;

        return {
          ...s,
          client: resolvedClient,
          client_site: resolvedSite,
          pedido: p ? {
            ...p,
            client: clientsMap.get(p.client_id) || undefined,
            client_site: sitesMap.get(p.client_site_id) || undefined
          } : undefined
        };
      }) as SolicitudDetail[];
    },
    enabled: !!selectedEmpresaId,
  });
}
