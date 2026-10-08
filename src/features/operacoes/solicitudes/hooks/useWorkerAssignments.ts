import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { isHoldingId } from '@/shared/utils/empresaUtils';

export interface WorkerAssignmentFilters {
    empresa_id?: string | null;
    client_id?: string | null;
    client_site_id?: string | null;
    pedido_id?: string | null;
    include_recent_bajas?: boolean;
}

export function useWorkerAssignments(filters: WorkerAssignmentFilters) {
    return useQuery({
        queryKey: ['worker_assignments', filters],
        queryFn: async () => {
            const isHolding = isHoldingId(filters.empresa_id) || filters.empresa_id === 'all';
            const effectiveEmpresaId = isHolding ? null : filters.empresa_id;

            if (!filters.empresa_id && !isHolding) return [];

            console.log('--- DEBUG: useWorkerAssignments ---', { filters, isHolding, effectiveEmpresaId });
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
                .in('status', ['planned', 'active']); // Ativos ou planejados

            if (effectiveEmpresaId) {
                query = query.eq('empresa_id', effectiveEmpresaId);
            }

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

            // When include_recent_bajas is enabled, query recent offboard targets and terminated assignments
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const dateStr = sixtyDaysAgo.toISOString();
            const dateShortStr = dateStr.split('T')[0];

            let recentBajasTargetsPromise = Promise.resolve({ data: [] as any[] });
            let recentTerminatedAssignmentsPromise = Promise.resolve({ data: [] as any[] });
            let recentBajasWorkersPromise = Promise.resolve({ data: [] as any[] });

            if (filters.include_recent_bajas) {
                let offboardQuery = supabase
                    .schema('core_operacoes')
                    .from('solicitud_targets')
                    .select('id, empresa_id, source_worker_id, source_client_id, source_client_site_id, source_pedido_id, source_pedido_item_id, action_type, status, created_at, reason, notes')
                    .eq('action_type', 'offboard')
                    .gte('created_at', dateStr);

                if (effectiveEmpresaId) {
                    offboardQuery = offboardQuery.eq('empresa_id', effectiveEmpresaId);
                }
                if (filters.client_id) {
                    offboardQuery = offboardQuery.eq('source_client_id', filters.client_id);
                }
                recentBajasTargetsPromise = offboardQuery as any;

                let termQuery = supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select(`
                        *,
                        worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante, data_baixa, data_ingresso)
                    `)
                    .eq('status', 'terminated')
                    .gte('updated_at', dateStr);

                if (effectiveEmpresaId) {
                    termQuery = termQuery.eq('empresa_id', effectiveEmpresaId);
                }
                if (filters.client_id) {
                    termQuery = termQuery.eq('client_id', filters.client_id);
                }
                recentTerminatedAssignmentsPromise = termQuery as any;

                recentBajasWorkersPromise = supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, nome, cod_colab, nif, dni, email, movil, funcion, contratante, data_baixa, data_ingresso, cliente, cod_cliente, status_trabajador')
                    .gte('data_baixa', dateShortStr) as any;
            }

            const [pedidosRes, allClientsRes, sitesRes, empresasRes, activeWorkersRes, recentBajasTargetsRes, recentTerminatedAssignmentsRes, recentBajasWorkersRes] = await Promise.all([
                pedidoIds.length > 0 
                  ? supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', pedidoIds)
                  : Promise.resolve({ data: [] }),
                supabase.schema('core_common').from('clients').select('id, trade_name, legal_name'),
                siteIds.length > 0
                  ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
                  : Promise.resolve({ data: [] }),
                supabase.schema('core_common').from('empresas').select('id, nome, trade_name'),
                supabase.schema('core_personal').rpc('get_hours_control_workers', {
                    p_empresa_id: effectiveEmpresaId,
                    p_period_year: new Date().getFullYear(),
                    p_period_month: new Date().getMonth() + 1,
                    p_contratante: null,
                    p_cliente_nombre: null
                }),
                recentBajasTargetsPromise,
                recentTerminatedAssignmentsPromise,
                recentBajasWorkersPromise
            ]);

            const pedidosMap = new Map(pedidosRes.data?.map(p => [p.id, p]) || []);
            const clientsMap = new Map(allClientsRes.data?.map(c => [c.id, c]) || []);
            const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);
            const empresasMap = new Map(empresasRes.data?.map(e => [e.id, e]) || []);
            const allClients = allClientsRes.data || [];
            const allEmpresas = empresasRes.data || [];

            const normalizeString = (str: string) => {
                if (!str) return '';
                return str
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .trim();
            };

            const mappedRealAssignments = assignmentsData.map(a => ({
                ...a,
                pedido: pedidosMap.get(a.pedido_id) || null,
                client: clientsMap.get(a.client_id) || null,
                client_site: sitesMap.get(a.client_site_id) || null,
                empresa: empresasMap.get(a.empresa_id) || null,
            }));

            // Generate virtual assignments for active workers from hours control who do not have an active assignment row
            const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id));
            const activeWorkers = activeWorkersRes.data || [];

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
                        job_function_name_snapshot: w.funcion,
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
                        empresa: (() => {
                            const matchedWorkerEmpresa = allEmpresas.find(e => 
                                (w.contratante && normalizeString(e.nome).includes(normalizeString(w.contratante))) ||
                                (w.contratante && normalizeString(e.trade_name || '').includes(normalizeString(w.contratante))) ||
                                (w.contratante && normalizeString(w.contratante).includes(normalizeString(e.nome)))
                            ) || empresasMap.get(effectiveEmpresaId || filters.empresa_id);
                            return matchedWorkerEmpresa || {
                                id: effectiveEmpresaId || filters.empresa_id,
                                nome: w.contratante || empresasMap.get(filters.empresa_id)?.nome || ''
                            };
                        })(),
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

            // Map and add recent bajas if enabled
            const recentBajasList: any[] = [];
            if (filters.include_recent_bajas) {
                const offboardTargets = recentBajasTargetsRes.data || [];
                const terminatedAssignments = recentTerminatedAssignmentsRes.data || [];
                const directBajasWorkers = recentBajasWorkersRes.data || [];

                // Collect worker IDs from targets that need to be fetched
                const missingWorkerIds = offboardTargets
                    .map((t: any) => t.source_worker_id)
                    .filter((id: string) => id && !existingWorkerIds.has(id));

                const workersLookupMap = new Map<string, any>();
                directBajasWorkers.forEach((w: any) => {
                    if (w?.id) workersLookupMap.set(w.id, w);
                });

                const idsToQuery = missingWorkerIds.filter(id => !workersLookupMap.has(id));
                if (idsToQuery.length > 0) {
                    const { data: fetchedWorkers } = await supabase
                        .schema('core_personal')
                        .from('workers')
                        .select('id, nome, cod_colab, nif, dni, email, movil, funcion, contratante, data_baixa, data_ingresso, cliente, cod_cliente, status_trabajador')
                        .in('id', idsToQuery);
                    
                    (fetchedWorkers || []).forEach(w => workersLookupMap.set(w.id, w));
                }

                // 1. Process terminated assignments
                terminatedAssignments.forEach((ta: any) => {
                    if (!existingWorkerIds.has(ta.worker_id)) {
                        existingWorkerIds.add(ta.worker_id);
                        recentBajasList.push({
                            ...ta,
                            pedido: pedidosMap.get(ta.pedido_id) || null,
                            client: clientsMap.get(ta.client_id) || null,
                            client_site: sitesMap.get(ta.client_site_id) || null,
                            empresa: empresasMap.get(ta.empresa_id) || null,
                            is_baja_recente: true,
                            data_baixa: ta.worker?.data_baixa || ta.end_date || ta.updated_at
                        });
                    }
                });

                // 2. Process offboard targets from solicitudes (like Jorge)
                offboardTargets.forEach((t: any) => {
                    if (t.source_worker_id && !existingWorkerIds.has(t.source_worker_id)) {
                        existingWorkerIds.add(t.source_worker_id);
                        const w = workersLookupMap.get(t.source_worker_id) || {};
                        
                        let matchedClient = clientsMap.get(t.source_client_id);
                        if (!matchedClient && (w.cliente || w.cliente_nombre)) {
                            const workerClientNorm = normalizeString(w.cliente || w.cliente_nombre);
                            matchedClient = allClients.find((c: any) => {
                                const tradeNorm = normalizeString(c.trade_name);
                                const legalNorm = normalizeString(c.legal_name);
                                return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
                            });
                        }

                        const clientObj = matchedClient ? {
                            id: matchedClient.id,
                            trade_name: matchedClient.trade_name,
                            legal_name: matchedClient.legal_name
                        } : (t.source_client_id ? {
                            id: t.source_client_id,
                            trade_name: w.cliente || 'Cliente',
                            legal_name: w.cliente || 'Cliente'
                        } : (w.cliente ? {
                            id: null,
                            trade_name: w.cliente,
                            legal_name: w.cliente
                        } : null));

                        let matchedEmpresa = empresasMap.get(t.empresa_id || filters.empresa_id);
                        if (!matchedEmpresa && w.contratante) {
                            matchedEmpresa = allEmpresas.find(e => 
                                normalizeString(e.nome).includes(normalizeString(w.contratante)) ||
                                normalizeString(w.contratante).includes(normalizeString(e.nome))
                            );
                        }

                        recentBajasList.push({
                            id: `baja-${t.source_worker_id}-${t.id}`,
                            empresa_id: t.empresa_id || filters.empresa_id,
                            worker_id: t.source_worker_id,
                            job_function_name_snapshot: w.funcion || 'Trabalhador',
                            client_id: clientObj?.id || t.source_client_id,
                            client_site_id: t.source_client_site_id,
                            pedido_id: t.source_pedido_id,
                            pedido_item_id: t.source_pedido_item_id,
                            status: 'terminated',
                            is_baja_recente: true,
                            data_baixa: w.data_baixa || t.created_at,
                            start_date: w.data_ingresso || t.created_at,
                            end_date: w.data_baixa || t.created_at,
                            worker: {
                                id: w.id || t.source_worker_id,
                                nome: w.nome,
                                cod_colab: w.cod_colab,
                                nif: w.nif,
                                dni: w.dni,
                                email: w.email,
                                movil: w.movil,
                                funcion: w.funcion,
                                contratante: w.contratante,
                                data_baixa: w.data_baixa,
                                cliente: w.cliente,
                                cod_cliente: w.cod_cliente
                            },
                            client: clientObj,
                            client_site: sitesMap.get(t.source_client_site_id) || null,
                            pedido: pedidosMap.get(t.source_pedido_id) || null,
                            empresa: matchedEmpresa || {
                                id: filters.empresa_id,
                                nome: empresasMap.get(filters.empresa_id)?.nome || ''
                            },
                            replaced_assignment: null,
                            solicitud_target_id: t.id
                        });
                    }
                });

                // 3. Process direct worker bajas (workers marked with data_baixa in core_personal.workers)
                const selectedEmpresaNome = effectiveEmpresaId ? (empresasMap.get(effectiveEmpresaId)?.nome || '') : '';
                directBajasWorkers.forEach((w: any) => {
                    if (w.id && !existingWorkerIds.has(w.id)) {
                        const matchesEmpresa = isHolding || !effectiveEmpresaId || !w.contratante || !selectedEmpresaNome || 
                            normalizeString(selectedEmpresaNome).includes(normalizeString(w.contratante)) || 
                            normalizeString(w.contratante).includes(normalizeString(selectedEmpresaNome));

                        if (matchesEmpresa) {
                            existingWorkerIds.add(w.id);

                            let matchedClient = null;
                            if (w.cliente) {
                                const workerClientNorm = normalizeString(w.cliente);
                                matchedClient = allClients.find((c: any) => {
                                    const tradeNorm = normalizeString(c.trade_name);
                                    const legalNorm = normalizeString(c.legal_name);
                                    return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
                                });
                            }

                            const clientObj = matchedClient ? {
                                id: matchedClient.id,
                                trade_name: matchedClient.trade_name,
                                legal_name: matchedClient.legal_name
                            } : (w.cliente ? {
                                id: null,
                                trade_name: w.cliente,
                                legal_name: w.cliente
                            } : null);

                            const matchedWorkerEmpresa = allEmpresas.find(e => 
                                (w.contratante && normalizeString(e.nome).includes(normalizeString(w.contratante))) || 
                                (w.contratante && normalizeString(e.trade_name || '').includes(normalizeString(w.contratante))) ||
                                (w.contratante && normalizeString(w.contratante).includes(normalizeString(e.nome)))
                            ) || empresasMap.get(effectiveEmpresaId || filters.empresa_id);

                            recentBajasList.push({
                                id: `baja-worker-${w.id}`,
                                empresa_id: matchedWorkerEmpresa?.id || effectiveEmpresaId || filters.empresa_id,
                                worker_id: w.id,
                                job_function_name_snapshot: w.funcion || 'Trabalhador',
                                client_id: clientObj?.id || null,
                                client_site_id: null,
                                pedido_id: null,
                                pedido_item_id: null,
                                status: 'terminated',
                                is_baja_recente: true,
                                data_baixa: w.data_baixa,
                                start_date: w.data_ingresso || w.created_at,
                                end_date: w.data_baixa,
                                worker: {
                                    id: w.id,
                                    nome: w.nome,
                                    cod_colab: w.cod_colab,
                                    nif: w.nif,
                                    dni: w.dni,
                                    email: w.email,
                                    movil: w.movil,
                                    funcion: w.funcion,
                                    contratante: w.contratante,
                                    data_baixa: w.data_baixa,
                                    cliente: w.cliente,
                                    cod_cliente: w.cod_cliente
                                },
                                client: clientObj,
                                client_site: null,
                                pedido: null,
                                empresa: matchedWorkerEmpresa || {
                                    id: filters.empresa_id,
                                    nome: selectedEmpresaNome || w.contratante || ''
                                },
                                replaced_assignment: null
                            });
                        }
                    }
                });
            }

            return [...mappedRealAssignments, ...virtualAssignments, ...recentBajasList];
        },
        enabled: !!filters.empresa_id || isHoldingId(filters.empresa_id) || filters.empresa_id === 'all',
    });
}
