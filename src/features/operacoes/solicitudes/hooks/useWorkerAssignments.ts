import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface WorkerAssignmentFilters {
    empresa_id?: string | null;
    client_id?: string | null;
    client_site_id?: string | null;
    pedido_id?: string | null;
}

export function useWorkerAssignments(filters: WorkerAssignmentFilters) {
    return useQuery({
        queryKey: ['worker_assignments', filters],
        queryFn: async () => {
            if (!filters.empresa_id) return [];

            let query = supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select(`
                    *,
                    worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab)
                `)
                .eq('empresa_id', filters.empresa_id)
                .in('status', ['planned', 'active']); // Ativos ou planejados

            if (filters.client_id) {
                query = query.eq('client_id', filters.client_id);
            }
            if (filters.client_site_id) {
                query = query.eq('client_site_id', filters.client_site_id);
            }
            if (filters.pedido_id) {
                query = query.eq('pedido_id', filters.pedido_id);
            }

            const { data: assignments, error } = await query.order('start_date', { ascending: false });
            if (error) throw error;
            if (!assignments || assignments.length === 0) return [];

            // Fetch related data
            const pedidoIds = [...new Set(assignments.map(a => a.pedido_id).filter(Boolean))];
            const clientIds = [...new Set(assignments.map(a => a.client_id).filter(Boolean))];
            const siteIds = [...new Set(assignments.map(a => a.client_site_id).filter(Boolean))];

            const [pedidosRes, clientsRes, sitesRes] = await Promise.all([
                pedidoIds.length > 0 
                  ? supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', pedidoIds)
                  : Promise.resolve({ data: [] }),
                clientIds.length > 0
                  ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
                  : Promise.resolve({ data: [] }),
                siteIds.length > 0
                  ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
                  : Promise.resolve({ data: [] })
            ]);

            const pedidosMap = new Map(pedidosRes.data?.map(p => [p.id, p]) || []);
            const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);
            const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);

            return assignments.map(a => ({
                ...a,
                pedido: pedidosMap.get(a.pedido_id) || null,
                client: clientsMap.get(a.client_id) || null,
                client_site: sitesMap.get(a.client_site_id) || null,
            }));
        },
        enabled: !!filters.empresa_id,
    });
}
