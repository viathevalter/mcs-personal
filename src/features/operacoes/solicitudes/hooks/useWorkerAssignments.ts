import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
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

            // 1. Fetch active, planned, or paused assignments (paginated to avoid 1000-row truncation)
            const assignmentsData = await fetchAllPages<any>((from, to) => {
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
                    .in('status', ['planned', 'active', 'paused']);

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

                return query.order('start_date', { ascending: false }).range(from, to);
            });

            // 2. When include_recent_bajas is enabled, query recent offboard targets and ended/terminated assignments
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const dateStr = sixtyDaysAgo.toISOString();
            const dateShortStr = dateStr.split('T')[0];

            let recentBajasTargetsPromise = Promise.resolve([] as any[]);
            let recentTerminatedAssignmentsPromise = Promise.resolve([] as any[]);
            let recentBajasWorkersPromise = Promise.resolve([] as any[]);

            if (filters.include_recent_bajas) {
                recentBajasTargetsPromise = fetchAllPages<any>((from, to) => {
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
                    return offboardQuery.order('created_at', { ascending: false }).range(from, to);
                });

                recentTerminatedAssignmentsPromise = fetchAllPages<any>((from, to) => {
                    let termQuery = supabase
                        .schema('core_personal')
                        .from('worker_assignments')
                        .select(`
                            *,
                            worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante, data_baixa, data_ingresso)
                        `)
                        .in('status', ['terminated', 'completed'])
                        .or(`updated_at.gte.${dateStr},end_date.gte.${dateShortStr}`);

                    if (effectiveEmpresaId) {
                        termQuery = termQuery.eq('empresa_id', effectiveEmpresaId);
                    }
                    if (filters.client_id) {
                        termQuery = termQuery.eq('client_id', filters.client_id);
                    }
                    if (filters.client_site_id) {
                        termQuery = termQuery.eq('client_site_id', filters.client_site_id);
                    }
                    if (filters.pedido_id) {
                        termQuery = termQuery.eq('pedido_id', filters.pedido_id);
                    }
                    return termQuery.order('end_date', { ascending: false, nullsFirst: false }).range(from, to);
                });

                recentBajasWorkersPromise = fetchAllPages<any>((from, to) =>
                    supabase
                        .schema('core_personal')
                        .from('workers')
                        .select('id, nome, cod_colab, nif, dni, email, movil, funcion, contratante, data_baixa, data_ingresso, cliente, cod_cliente, status_trabajador')
                        .gte('data_baixa', dateShortStr)
                        .order('data_baixa', { ascending: false })
                        .range(from, to)
                );
            }

            const [
                allClients,
                empresasRes,
                activeWorkersRes,
                offboardTargets,
                terminatedAssignments,
                directBajasWorkers
            ] = await Promise.all([
                fetchAllPages<any>((from, to) =>
                    supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').order('id').range(from, to)
                ),
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

            // Collect ALL pedidoIds and siteIds across active assignments AND recent bajas so pedidosMap/sitesMap never miss ended orders
            const pedidoIds = [
                ...new Set([
                    ...assignmentsData.map(a => a.pedido_id),
                    ...terminatedAssignments.map((ta: any) => ta.pedido_id),
                    ...offboardTargets.map((t: any) => t.source_pedido_id),
                ].filter(Boolean))
            ];

            const siteIds = [
                ...new Set([
                    ...assignmentsData.map(a => a.client_site_id),
                    ...terminatedAssignments.map((ta: any) => ta.client_site_id),
                    ...offboardTargets.map((t: any) => t.source_client_site_id),
                ].filter(Boolean))
            ];

            const [pedidosData, sitesData] = await Promise.all([
                fetchInChunks<any>(pedidoIds, chunk =>
                    supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', chunk)
                ),
                fetchInChunks<any>(siteIds, chunk =>
                    supabase.schema('core_common').from('client_sites').select('id, name').in('id', chunk)
                )
            ]);

            const pedidosMap = new Map(pedidosData.map(p => [p.id, p]));
            const clientsMap = new Map(allClients.map(c => [c.id, c]));
            const sitesMap = new Map(sitesData.map(s => [s.id, s]));
            const allEmpresas = empresasRes.data || [];
            const empresasMap = new Map(allEmpresas.map(e => [e.id, e]));

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
            const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id).filter(Boolean));
            const existingWorkerContextKeys = new Set(
                mappedRealAssignments.map(a => `${a.worker_id}:${a.pedido_id || a.client_id || 'none'}`)
            );
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

            virtualAssignments.forEach((va: any) => {
                if (va.worker_id) {
                    existingWorkerIds.add(va.worker_id);
                    existingWorkerContextKeys.add(`${va.worker_id}:${va.pedido_id || va.client_id || 'none'}`);
                }
            });

            // Map and add recent bajas if enabled
            const recentBajasList: any[] = [];
            if (filters.include_recent_bajas) {
                // Collect worker IDs from targets that need to be fetched
                const workersLookupMap = new Map<string, any>();
                directBajasWorkers.forEach((w: any) => {
                    if (w?.id) workersLookupMap.set(w.id, w);
                });
                terminatedAssignments.forEach((ta: any) => {
                    if (ta?.worker?.id) workersLookupMap.set(ta.worker.id, ta.worker);
                });

                const missingWorkerIds = [
                    ...new Set(
                        offboardTargets
                            .map((t: any) => t.source_worker_id)
                            .filter((id: string) => id && !workersLookupMap.has(id))
                    )
                ];

                if (missingWorkerIds.length > 0) {
                    const fetchedWorkers = await fetchInChunks<any>(missingWorkerIds, chunk =>
                        supabase
                            .schema('core_personal')
                            .from('workers')
                            .select('id, nome, cod_colab, nif, dni, email, movil, funcion, contratante, data_baixa, data_ingresso, cliente, cod_cliente, status_trabajador')
                            .in('id', chunk)
                    );
                    fetchedWorkers.forEach(w => workersLookupMap.set(w.id, w));
                }

                // 1. Process ended/completed/terminated assignments (preserves pedido_id, pedido_item_id, real assignment UUID)
                terminatedAssignments.forEach((ta: any) => {
                    const contextKey = `${ta.worker_id}:${ta.pedido_id || ta.client_id || 'none'}`;
                    if (ta.worker_id && !existingWorkerContextKeys.has(contextKey)) {
                        existingWorkerContextKeys.add(contextKey);
                        existingWorkerIds.add(ta.worker_id);
                        recentBajasList.push({
                            ...ta,
                            pedido: pedidosMap.get(ta.pedido_id) || null,
                            client: clientsMap.get(ta.client_id) || null,
                            client_site: sitesMap.get(ta.client_site_id) || null,
                            empresa: empresasMap.get(ta.empresa_id) || null,
                            is_baja_recente: true,
                            data_baixa: ta.end_date || ta.worker?.data_baixa || ta.updated_at
                        });
                    }
                });

                // 2. Process offboard targets from solicitudes (e.g. offboarding / withdrawal without ended assignment row)
                offboardTargets.forEach((t: any) => {
                    const contextKey = `${t.source_worker_id}:${t.source_pedido_id || t.source_client_id || 'none'}`;
                    if (t.source_worker_id && !existingWorkerContextKeys.has(contextKey)) {
                        existingWorkerContextKeys.add(contextKey);
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

                // 3. Process direct worker bajas (workers marked with data_baixa in core_personal.workers without assignment)
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
