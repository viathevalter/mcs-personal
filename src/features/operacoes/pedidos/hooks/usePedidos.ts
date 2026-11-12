import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { logisticsService } from '@/features/logistica/services/logisticsService';
import { resolvePedidoSummaryMap } from '../services/pedidoWorkersResolver';
import type { Pedido, PedidoSummaryMetrics } from '../types';

interface UsePedidosFilters {
  search?: string;
  client_id?: string;
  commercial_status?: string;
  operational_status?: string;
  empresa_id?: string;
  movement_filter?: string;
}

export function usePedidos(filters?: UsePedidosFilters) {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['pedidos', selectedEmpresaId, activeEmpresaId, filters?.empresa_id, filters?.commercial_status, filters?.operational_status, filters?.client_id],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const data = await fetchAllPages<any>((from, to) => {
        let query = supabase
          .schema('core_comercial')
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.empresa_id && filters.empresa_id !== 'all') {
          query = query.eq('empresa_id', filters.empresa_id);
        } else if (activeEmpresaId) {
          query = query.eq('empresa_id', activeEmpresaId);
        }

        if (filters?.commercial_status && filters.commercial_status !== 'all') {
          query = query.eq('commercial_status', filters.commercial_status);
        }
        if (filters?.operational_status && filters.operational_status !== 'all') {
          query = query.eq('operational_status', filters.operational_status);
        }
        if (filters?.client_id && filters.client_id !== 'all') {
          query = query.eq('client_id', filters.client_id);
        }

        return query.range(from, to);
      });

      if (!data || data.length === 0) {
        return {
          pedidos: [] as Pedido[],
          itemsMap: {} as Record<string, { requested: number; fulfilled: number }>,
          summaryMap: {} as Record<string, PedidoSummaryMetrics>,
        };
      }

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(d => d.client_site_id).filter(Boolean))];
      const empresaIds = [...new Set(data.map(d => d.empresa_id).filter(Boolean))];
      const pedidoIds = data.map(d => d.id);

      const [clients, sites, items, jobsRes, empresas, assignments, targets, alocacoesLogistica] = await Promise.all([
        fetchInChunks<any>(clientIds, chunk =>
          supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', chunk)
        ),
        fetchInChunks<any>(siteIds, chunk =>
          supabase.schema('core_common').from('client_sites').select('id, name, city, address_line').in('id', chunk)
        ),
        fetchInChunks<any>(pedidoIds, chunk =>
          supabase
            .schema('core_comercial')
            .from('pedido_items')
            .select('id, pedido_id, job_function_id, job_function_name_snapshot, quantity_requested, quantity_fulfilled, includes_housing, status')
            .in('pedido_id', chunk)
        ),
        supabase.schema('core_comercial').from('job_functions').select('id, name'),
        fetchInChunks<any>(empresaIds, chunk =>
          supabase.schema('core_common').from('empresas').select('id, nome, trade_name, legal_name').in('id', chunk)
        ),
        fetchInChunks<any>(pedidoIds, chunk =>
          supabase
            .schema('core_personal')
            .from('worker_assignments')
            .select(`
              id,
              pedido_id,
              pedido_item_id,
              worker_id,
              status,
              planned_start_date,
              start_date,
              end_date,
              tarifa_acordada,
              job_function_id,
              job_function_name_snapshot,
              replacement_of_assignment_id,
              notes,
              worker:workers(
                id,
                nome,
                cod_colab,
                nif,
                dni,
                movil,
                funcion,
                status_trabajador,
                status_seguridad,
                data_baixa
              )
            `)
            .in('pedido_id', chunk)
        ),
        fetchInChunks<any>(pedidoIds, chunk =>
          supabase
            .schema('core_operacoes')
            .from('solicitud_targets')
            .select(`
              id,
              solicitud_id,
              source_assignment_id,
              source_pedido_id,
              source_pedido_item_id,
              source_worker_id,
              target_job_function_id,
              target_job_function_name,
              target_assignment_id,
              target_worker_id,
              status,
              action_type,
              requires_replacement,
              reason,
              notes,
              solicitud:solicitudes_operativas(id, pedido_id, codigo, tipo, status, due_date)
            `)
            .in('source_pedido_id', chunk)
        ),
        logisticsService.fetchAlocacoesAtivas().catch(() => []),
      ]);

      // Fetch any extra workers referenced in targets that weren't in assignments
      const seenWorkerIds = new Set(
        (assignments || []).map((a: any) => (Array.isArray(a.worker) ? a.worker[0]?.id : a.worker?.id) || a.worker_id).filter(Boolean)
      );
      const extraWorkerIds = [
        ...new Set(
          (targets || [])
            .flatMap((t: any) => [t.source_worker_id, t.target_worker_id])
            .filter((id: string) => id && !seenWorkerIds.has(id))
        ),
      ];

      const extraWorkers =
        extraWorkerIds.length > 0
          ? await fetchInChunks<any>(extraWorkerIds, chunk =>
              supabase
                .schema('core_personal')
                .from('workers')
                .select('id, nome, cod_colab, nif, movil, funcion, status_trabajador, status_seguridad, data_baixa')
                .in('id', chunk)
            )
          : [];

      const extraWorkersMap = new Map((extraWorkers || []).map((w: any) => [w.id, w]));
      const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j.name]));

      const summaryMap = resolvePedidoSummaryMap({
        pedidoIds,
        items: items || [],
        jobsMap,
        assignments: assignments || [],
        targets: targets || [],
        extraWorkersMap,
        alocacoesLogistica: alocacoesLogistica || [],
      });

      const itemsMap: Record<string, { requested: number; fulfilled: number }> = {};
      Object.entries(summaryMap).forEach(([pId, sum]) => {
        itemsMap[pId] = { requested: sum.requested, fulfilled: sum.fulfilled };
      });

      const clientsMap = new Map((clients || []).map((c: any) => [c.id, c]));
      const sitesMap = new Map((sites || []).map((s: any) => [s.id, s]));
      const empresasMap = new Map((empresas || []).map((e: any) => [e.id, e]));

      const mappedPedidos = data.map(pedido => ({
        ...pedido,
        client: clientsMap.get(pedido.client_id),
        client_site: sitesMap.get(pedido.client_site_id),
        empresa: empresasMap.get(pedido.empresa_id),
      })) as Pedido[];

      return {
        pedidos: mappedPedidos,
        itemsMap,
        summaryMap,
      };
    },
    enabled: !!selectedEmpresaId,
  });
}
