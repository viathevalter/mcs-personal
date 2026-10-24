import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudDetail } from '../types';

interface UseSolicitudesFilters {
  status?: string;
  tipo?: string;
  priority?: string;
  search?: string;
  empresa_id?: string;
}

export function useSolicitudes(filters?: UseSolicitudesFilters) {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitudes', selectedEmpresaId, activeEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const solicitudes = await fetchAllPages<any>((from, to) => {
        let query = supabase
          .schema('core_operacoes')
          .from('solicitudes_operativas')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.empresa_id && filters.empresa_id !== 'all') {
          query = query.eq('empresa_id', filters.empresa_id);
        } else if (activeEmpresaId) {
          query = query.eq('empresa_id', activeEmpresaId);
        }

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

        return query.range(from, to);
      });

      if (!solicitudes || solicitudes.length === 0) return [];

      // 1. Fetch related pedidos
      const pedidoIds = [...new Set(solicitudes.map(s => s.pedido_id).filter(Boolean))];
      const pedidosList = await fetchInChunks<any>(pedidoIds, chunk =>
        supabase
          .schema('core_comercial')
          .from('pedidos')
          .select('id, codigo, client_id, client_site_id, expected_start_date, expected_end_date, commercial_status')
          .in('id', chunk)
      );
      const pedidosMap = new Map(pedidosList.map(p => [p.id, p]));

      // 2. Fetch related estimaciones for "new_order" solicitudes (without pedido_id)
      const estimacionVersionIds = [
        ...new Set(
          solicitudes
            .filter(s => s.source_entity_type === 'estimacion_version' && !s.pedido_id)
            .map(s => s.source_entity_id)
            .filter(Boolean)
        )
      ];
      const estimacionesList = await fetchInChunks<any>(estimacionVersionIds, chunk =>
        supabase
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
          .in('id', chunk)
      );
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
      const [clientsData, sitesData, empresasData] = await Promise.all([
        fetchInChunks<any>(clientIds, chunk =>
          supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', chunk)
        ),
        fetchInChunks<any>(siteIds, chunk =>
          supabase.schema('core_common').from('client_sites').select('id, name').in('id', chunk)
        ),
        fetchInChunks<any>(empresaIds, chunk =>
          supabase.schema('core_common').from('empresas').select('id, nome, legal_name, trade_name').in('id', chunk)
        )
      ]);

      const clientsMap = new Map(clientsData.map(c => [c.id, c]));
      const sitesMap = new Map(sitesData.map(s => [s.id, s]));
      const empresasMap = new Map(empresasData.map(e => [e.id, e]));

      // Fetch date change events from timeline to identify postponements/extensions
      const solicitudIds = solicitudes.map(s => s.id);
      const [dateChangesList, targetsList] = await Promise.all([
        fetchInChunks<any>(solicitudIds, chunk =>
          supabase
            .schema('core_operacoes')
            .from('solicitud_timeline')
            .select('solicitud_id, title')
            .in('solicitud_id', chunk)
            .in('title', ['Início Adiado', 'Prazo Prorrogado'])
        ),
        fetchInChunks<any>(solicitudIds, chunk =>
          supabase
            .schema('core_operacoes')
            .from('solicitud_targets')
            .select('id, solicitud_id, reason, notes, action_type, source_worker_id, target_worker_id')
            .in('solicitud_id', chunk)
        )
      ]);

      const targetsMap = new Map<string, any>();
      targetsList.forEach(t => {
        if (!targetsMap.has(t.solicitud_id)) {
          targetsMap.set(t.solicitud_id, t);
        }
      });

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
        const target = targetsMap.get(s.id);
        const effectiveReason = s.reason || target?.reason || target?.notes || null;

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

        const has_postponement = dateChangesList.some(dc => dc.solicitud_id === s.id && dc.title === 'Início Adiado');
        const has_extension = dateChangesList.some(dc => dc.solicitud_id === s.id && dc.title === 'Prazo Prorrogado');

        return {
          ...s,
          reason: effectiveReason,
          client: resolvedClient,
          client_site: resolvedSite,
          pedido: resolvedPedido,
          empresa: resolvedEmpresa,
          has_postponement,
          has_extension
        };
      }) as SolicitudDetail[];
    },
    enabled: !!selectedEmpresaId,
  });
}
