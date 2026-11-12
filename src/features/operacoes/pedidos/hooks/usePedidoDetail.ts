import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { logisticsService } from '@/features/logistica/services/logisticsService';
import { resolvePedidoSummaryMap } from '../services/pedidoWorkersResolver';
import type { Pedido, PedidoItem, PedidoSummaryMetrics } from '../types';

export function usePedidoDetail(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pedido', pedidoId],
    queryFn: async () => {
      if (!pedidoId) throw new Error('Pedido não selecionado');

      // Fetch pedido by unique ID
      const { data: pedido, error: pedidoError } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .maybeSingle();

      if (pedidoError) throw pedidoError;
      if (!pedido) throw new Error('Pedido não encontrado.');

      const userIdsToResolve = [
        ...new Set(
          [pedido.commercial_owner_id, pedido.responsible_id, pedido.created_by, pedido.updated_by].filter(Boolean)
        ),
      ];

      // Fetch related data in parallel
      const [
        { data: client },
        { data: site },
        { data: empresa },
        { data: items, error: itemsError },
        { data: jobsData },
        { data: usersData },
        { data: estimacionData },
        { data: assignmentsData },
        { data: targetsData },
        alocacoesLogistica,
      ] = await Promise.all([
        pedido.client_id
          ? supabase
              .schema('core_common')
              .from('clients')
              .select('id, legal_name, trade_name, phone, email')
              .eq('id', pedido.client_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        pedido.client_site_id
          ? supabase
              .schema('core_common')
              .from('client_sites')
              .select('id, name, address_line, city, postal_code, province, contact_name, contact_phone, contact_email, notes')
              .eq('id', pedido.client_site_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        pedido.empresa_id
          ? supabase
              .schema('core_common')
              .from('empresas')
              .select('id, nome, trade_name, legal_name')
              .eq('id', pedido.empresa_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .schema('core_comercial')
          .from('pedido_items')
          .select(`
            *,
            job_function:job_functions(name)
          `)
          .eq('pedido_id', pedidoId)
          .order('created_at', { ascending: true }),
        supabase.schema('core_comercial').from('job_functions').select('id, name'),
        userIdsToResolve.length > 0
          ? supabase
              .schema('core_operacoes')
              .from('mcs_users')
              .select('id, display_name, email')
              .in('id', userIdsToResolve)
          : Promise.resolve({ data: [] }),
        pedido.source_estimacion_id
          ? supabase
              .schema('core_comercial')
              .from('estimaciones')
              .select('id, codigo, status')
              .eq('id', pedido.source_estimacion_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .schema('core_personal')
          .from('worker_assignments')
          .select(`
            id,
            pedido_id,
            pedido_item_id,
            worker_id,
            solicitud_id,
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
              nie,
              pasaporte,
              email,
              movil,
              funcion,
              camiseta,
              pantalones,
              licencia_conducir,
              status_trabajador,
              status_seguridad,
              data_baixa
            )
          `)
          .eq('pedido_id', pedidoId),
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
          .eq('source_pedido_id', pedidoId),
        logisticsService.fetchAlocacoesAtivas().catch(() => []),
      ]);

      if (itemsError) throw itemsError;

      // Resolve any extra workers from targets or replacement assignments
      const seenWorkerIds = new Set(
        (assignmentsData || [])
          .map((a: any) => (Array.isArray(a.worker) ? a.worker[0]?.id : a.worker?.id) || a.worker_id)
          .filter(Boolean)
      );
      const extraWorkerIds = [
        ...new Set(
          (targetsData || [])
            .flatMap((t: any) => [t.source_worker_id, t.target_worker_id])
            .filter((id: string) => id && !seenWorkerIds.has(id))
        ),
      ];

      let extraWorkersMap = new Map<string, any>();
      if (extraWorkerIds.length > 0) {
        const { data: extraW } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nome, cod_colab, nif, dni, movil, email, funcion, status_trabajador, status_seguridad, data_baixa')
          .in('id', extraWorkerIds);
        extraWorkersMap = new Map((extraW || []).map((w: any) => [w.id, w]));
      }

      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
      const jobsMap = new Map((jobsData || []).map((j: any) => [j.id, j.name]));

      const mappedItems = (items || []).map((item: any) => ({
        ...item,
        includes_accommodation_snapshot: !!item.includes_housing,
        includes_transport_snapshot: !!item.includes_transport,
        includes_ppe_snapshot: !!item.includes_epi,
        item_status: item.status === 'pending' ? 'pending_fulfillment' : item.status,
      }));

      const summaryMap = resolvePedidoSummaryMap({
        pedidoIds: [pedidoId],
        items: mappedItems,
        jobsMap,
        assignments: assignmentsData || [],
        targets: targetsData || [],
        extraWorkersMap,
        alocacoesLogistica: alocacoesLogistica || [],
      });

      const summary: PedidoSummaryMetrics = summaryMap[pedidoId] || {
        requested: 0,
        fulfilled: 0,
        profiles: [],
        includesHousing: false,
        activeWorkersCount: 0,
        enteringWorkersCount: 0,
        exitingWorkersCount: 0,
        exitedWorkersCount: 0,
        housedWorkersCount: 0,
        pendingHousingCount: 0,
        alojamentos: [],
        workers: [],
      };

      const commercialOwnerId = pedido.commercial_owner_id || pedido.created_by;
      const responsibleId = pedido.responsible_id || pedido.updated_by || pedido.created_by;

      return {
        pedido: {
          ...pedido,
          client: client || undefined,
          client_site: site || undefined,
          empresa: empresa || undefined,
          commercial_owner: commercialOwnerId ? usersMap.get(commercialOwnerId) || null : null,
          responsible_user: responsibleId ? usersMap.get(responsibleId) || null : null,
          source_estimacion: estimacionData || null,
        } as Pedido,
        items: mappedItems as PedidoItem[],
        summary,
      };
    },
    enabled: !!pedidoId,
  });
}
