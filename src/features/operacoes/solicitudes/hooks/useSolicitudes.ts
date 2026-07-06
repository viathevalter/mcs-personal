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
          .select('id, codigo, client_id, client_site_id, expected_start_date, expected_end_date, commercial_status')
          .in('id', pedidoIds);
        if (pData) pedidosList = pData;
      }
      const pedidosMap = new Map(pedidosList.map(p => [p.id, p]));

      // 2. Fetch related estimaciones for "new_order" solicitudes (without pedido_id)
      let estimacionesList: any[] = [];
      const estimacionVersionIds = [
        ...new Set(
          solicitudes
            .filter(s => s.source_entity_type === 'estimacion_version' && !s.pedido_id)
            .map(s => s.source_entity_id)
            .filter(Boolean)
        )
      ];
      if (estimacionVersionIds.length > 0) {
        const { data: evData } = await supabase
          .schema('core_comercial')
          .from('estimacion_versions')
          .select(`
            id,
            estimacion_id,
            estimacion:estimaciones (
              id,
              codigo,
              expected_start_date,
              expected_end_date
            )
          `)
          .in('id', estimacionVersionIds);
        if (evData) {
          estimacionesList = evData;
        }
      }
      const estimacionVersionsMap = new Map(estimacionesList.map(ev => [ev.id, ev]));

      // 3. Collect all client and site IDs (both from direct client_id on solicitudes and from linked pedidos)
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

      // 4. Fetch Clients, Sites and Empresas
      const empresaIds = [...new Set(solicitudes.map(s => s.empresa_id).filter(Boolean))];
      const [clientsRes, sitesRes, empresasRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        empresaIds.length > 0
          ? supabase.schema('core_common').from('empresas').select('id, nome, legal_name, trade_name').in('id', empresaIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map((clientsRes.data || []).map(c => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map(s => [s.id, s]));
      const empresasMap = new Map((empresasRes.data || []).map(e => [e.id, e]));

      return solicitudes.map(s => {
        const p = s.pedido_id ? pedidosMap.get(s.pedido_id) : null;
        const ev: any = (s.source_entity_type === 'estimacion_version' && !s.pedido_id)
          ? estimacionVersionsMap.get(s.source_entity_id)
          : null;
        const est = ev?.estimacion;
        
        // Resolve client and site (direct values on solicitud have priority)
        const resolvedClient = clientsMap.get(s.client_id || p?.client_id) || undefined;
        const resolvedSite = sitesMap.get(s.client_site_id || p?.client_site_id) || undefined;
        const resolvedEmpresa = empresasMap.get(s.empresa_id) || undefined;

        // Resolve Pedido details (fall back to Estimación details if no Pedido is created yet)
        const resolvedPedido = p ? {
          ...p,
          fecha_inicio_pedido: p.expected_start_date,
          fecha_fin_pedido: p.expected_end_date,
          status_pedido: p.commercial_status === 'active' ? 'Ativo' : p.commercial_status,
          client: clientsMap.get(p.client_id) || undefined,
          client_site: sitesMap.get(p.client_site_id) || undefined
        } : (est ? {
          id: '',
          codigo: est.codigo || '',
          fecha_inicio_pedido: est.expected_start_date,
          fecha_fin_pedido: est.expected_end_date,
          status_pedido: 'Estimado'
        } : undefined);

        return {
          ...s,
          client: resolvedClient,
          client_site: resolvedSite,
          pedido: resolvedPedido,
          empresa: resolvedEmpresa
        };
      }) as SolicitudDetail[];
    },
    enabled: !!selectedEmpresaId,
  });
}
