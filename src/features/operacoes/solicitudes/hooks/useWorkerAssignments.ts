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

            console.log('--- DEBUG: useWorkerAssignments ---', filters);
            let query = supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select(`
                    *,
                    worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante),
                    replaced_assignment:worker_assignments!replacement_of_assignment_id(
                        id,
                        worker:workers(id, nome)
                    )
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
            console.log('--- DEBUG RESULT ---', { count: assignments?.length, error });
            if (error) throw error;

            const assignmentsData = assignments || [];

            // Fetch related data
            const pedidoIds = [...new Set(assignmentsData.map(a => a.pedido_id).filter(Boolean))];
            const siteIds = [...new Set(assignmentsData.map(a => a.client_site_id).filter(Boolean))];
            const empresaIds = [...new Set(assignmentsData.map(a => a.empresa_id).filter(Boolean))];

            // If filters.empresa_id is not in the list, add it so we fetch its name
            if (filters.empresa_id && !empresaIds.includes(filters.empresa_id)) {
                empresaIds.push(filters.empresa_id);
            }

            const [pedidosRes, allClientsRes, sitesRes, empresasRes, activeWorkersRes] = await Promise.all([
                pedidoIds.length > 0 
                  ? supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', pedidoIds)
                  : Promise.resolve({ data: [] }),
                supabase.schema('core_common').from('clients').select('id, trade_name, legal_name'),
                siteIds.length > 0
                  ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
                  : Promise.resolve({ data: [] }),
                empresaIds.length > 0
                  ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
                  : Promise.resolve({ data: [] }),
                supabase.schema('core_personal').rpc('get_hours_control_workers', {
                    p_empresa_id: filters.empresa_id,
                    p_period_year: new Date().getFullYear(),
                    p_period_month: new Date().getMonth() + 1,
                    p_contratante: null,
                    p_cliente_nombre: null
                })
            ]);

            const pedidosMap = new Map(pedidosRes.data?.map(p => [p.id, p]) || []);
            const clientsMap = new Map(allClientsRes.data?.map(c => [c.id, c]) || []);
            const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);
            const empresasMap = new Map(empresasRes.data?.map(e => [e.id, e]) || []);

            const mappedRealAssignments = assignmentsData.map(a => ({
                ...a,
                pedido: pedidosMap.get(a.pedido_id) || null,
                client: clientsMap.get(a.client_id) || null,
                client_site: sitesMap.get(a.client_site_id) || null,
                empresa: empresasMap.get(a.empresa_id) || null,
            }));

            // Generate virtual assignments for active workers from hours control who do not have an active assignment row
            const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id));
            const allClients = allClientsRes.data || [];
            const activeWorkers = activeWorkersRes.data || [];

            const normalizeString = (str: string) => {
                if (!str) return '';
                return str
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .trim();
            };

            const virtualAssignments = activeWorkers
                .filter((w: any) => !existingWorkerIds.has(w.id))
                .map((w: any) => {
                    const matchedClient = allClients.find((c: any) => {
                        const tradeNorm = normalizeString(c.trade_name);
                        const legalNorm = normalizeString(c.legal_name);
                        const workerClientNorm = normalizeString(w.cliente_nombre);
                        return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
                    });

                    return {
                        id: `virtual-${w.id}`,
                        empresa_id: filters.empresa_id,
                        worker_id: w.id,
                        client_id: matchedClient?.id || null,
                        client_site_id: null,
                        pedido_id: null,
                        pedido_item_id: null,
                        status: 'active',
                        start_date: w.created_at || new Date().toISOString(),
                        end_date: null,
                        worker: {
                            id: w.id,
                            nome: w.nome,
                            cod_colab: w.cod_colab,
                            nif: w.nif,
                            dni: w.dni,
                            email: w.email,
                            movil: w.movil,
                            funcion: w.funcion,
                            contratante: w.contratante
                        },
                        client: matchedClient ? {
                            id: matchedClient.id,
                            trade_name: matchedClient.trade_name,
                            legal_name: matchedClient.legal_name
                        } : null,
                        client_site: null,
                        pedido: null,
                        empresa: {
                            id: filters.empresa_id,
                            nome: empresasMap.get(filters.empresa_id)?.nome || ''
                        },
                        replaced_assignment: null
                    };
                })
                .filter((a: any) => {
                    // Apply filters in memory for virtual assignments
                    if (filters.client_id && a.client_id !== filters.client_id) {
                        return false;
                    }
                    if (filters.client_site_id && filters.client_site_id !== 'all') {
                        return false;
                    }
                    if (filters.pedido_id && filters.pedido_id !== 'all') {
                        return false;
                    }
                    return true;
                });

            return [...mappedRealAssignments, ...virtualAssignments];
        },
        enabled: !!filters.empresa_id,
    });
}
