import { supabase } from '@/shared/supabase/client';
import type {
    CommissionGenerated,
    CommissionLancamento,
    CommissionSettings,
    CommissionAdjustmentType,
    CommissionSeller,
    CommissionSlotHistoryEntry
} from '../../types/models';

const COMMERCIAL_DEPT_ID = 'd3d525e8-14bc-43b4-9d66-b59826eba2ab';
const ALEX_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
const ALEX_EMAIL = 'alex@gestaologinpro.com';
const ALEX_NAME = 'Alex Carmona Archiles';
const OMAR_ID = '346a9262-2edf-4a2e-80fc-aa5b43bf483a';
const OMAR_EMAIL = 'omar@gestaologinpro.com';
const OMAR_NAME = 'Omar';

const MONTH_NAMES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function normalizeStr(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function parseEuroVal(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim().replace(/[€\s]/g, '');
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        }
        return parseFloat(str.replace(/,/g, '')) || 0;
    }
    if (str.includes(',')) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
}

function formatMesReferenciaLabel(ym: string): string {
    if (!ym || !ym.includes('-')) return ym;
    const [y, m] = ym.split('-');
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
        return `${MONTH_NAMES_PT[mIdx]} ${y}`;
    }
    return ym;
}

function parseLocalDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m, d);
        }
    }
    const dt = new Date(dateStr);
    return isNaN(dt.getTime()) ? null : dt;
}

export const commissionService = {
    async getSettings(): Promise<CommissionSettings> {
        const defaultSettings: CommissionSettings = {
            id: 1,
            comissao_base: 20,
            bonus_novo_cliente: 30,
            carencia_dias: 15,
            exigir_fatura_quitada: true,
            data_corte_novos_clientes: '2026-07-05',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('mcs_comissoes_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching commission settings:', error);
            return defaultSettings;
        }

        if (!data) {
            return defaultSettings;
        }

        return {
            id: 1,
            comissao_base: Number(data.comissao_base ?? 20),
            bonus_novo_cliente: Number(data.bonus_novo_cliente ?? 30),
            carencia_dias: Number(data.carencia_dias ?? 15),
            exigir_fatura_quitada: data.exigir_fatura_quitada ?? true,
            data_corte_novos_clientes: data.data_corte_novos_clientes || '2026-07-05',
            updated_at: data.updated_at || new Date().toISOString()
        };
    },

    async updateSettings(settings: Partial<CommissionSettings>): Promise<CommissionSettings> {
        const payload = {
            id: 1,
            comissao_base: Number(settings.comissao_base ?? 20),
            bonus_novo_cliente: Number(settings.bonus_novo_cliente ?? 30),
            carencia_dias: Number(settings.carencia_dias ?? 15),
            exigir_fatura_quitada: settings.exigir_fatura_quitada ?? true,
            data_corte_novos_clientes: settings.data_corte_novos_clientes || '2026-07-05',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('mcs_comissoes_settings')
            .upsert(payload, { onConflict: 'id' })
            .select('*')
            .single();

        if (error) throw error;
        return data as CommissionSettings;
    },

    async getCommercialSellers(): Promise<CommissionSeller[]> {
        const { data, error } = await supabase
            .from('mcs_users')
            .select('id, email, display_name, role, department_id')
            .eq('department_id', COMMERCIAL_DEPT_ID)
            .order('display_name');

        if (error || !data || data.length === 0) {
            return [
                { id: ALEX_ID, email: ALEX_EMAIL, name: ALEX_NAME, role: 'admin' },
                { id: OMAR_ID, email: OMAR_EMAIL, name: OMAR_NAME, role: 'admin' }
            ];
        }

        const list: CommissionSeller[] = data.map((u: any) => ({
            id: u.id,
            email: (u.email || '').toLowerCase().trim(),
            name: u.display_name || u.email,
            role: u.role
        }));

        // Prioritize Alex and Omar at the top of the sellers list
        return list.sort((a, b) => {
            const aPriority = a.email === ALEX_EMAIL ? 0 : a.email === OMAR_EMAIL ? 1 : 2;
            const bPriority = b.email === ALEX_EMAIL ? 0 : b.email === OMAR_EMAIL ? 1 : 2;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.name.localeCompare(b.name);
        });
    },

    async getComissoesGeradas(
        startDate?: string,
        endDate?: string,
        vendedorEmail?: string
    ): Promise<CommissionGenerated[]> {
        const [
            settings,
            sellers,
            pedidosRes,
            estimacionesRes,
            clientsRes,
            assignmentsRes,
            solicitudesRes,
            targetsRes,
            cobrosRes
        ] = await Promise.all([
            this.getSettings(),
            this.getCommercialSellers(),
            supabase
                .schema('core_comercial')
                .from('pedidos')
                .select('id, codigo, client_id, client_site_id, commercial_owner_id, created_by, responsible_id, source_estimacion_id, document_language, country_id, expected_start_date, created_at'),
            supabase
                .schema('core_comercial')
                .from('estimaciones')
                .select('id, codigo, client_id, commercial_owner_id, created_by, document_language, country_id'),
            supabase
                .schema('core_common')
                .from('clients')
                .select('id, codigo, trade_name, legal_name, country_id, tax_id, province, created_at'),
            supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select(`
                    id, empresa_id, worker_id, pedido_id, pedido_item_id, solicitud_id,
                    client_id, client_site_id, job_function_name_snapshot, assignment_type,
                    status, start_date, end_date, planned_start_date, planned_end_date,
                    replacement_of_assignment_id, root_assignment_id, notes, created_at,
                    worker:workers(id, nome, nif, dni, cod_colab, funcion, status_trabajador, data_baixa)
                `)
                .order('created_at', { ascending: true }),
            supabase
                .schema('core_operacoes')
                .from('solicitudes_operativas')
                .select('id, codigo, tipo, pedido_id, client_id, target_assignment_id, target_worker_id, reason'),
            supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select('id, solicitud_id, source_assignment_id, source_worker_id, target_assignment_id, target_worker_id, action_type, reason'),
            supabase
                .from('contas_receber')
                .select('id, cod_cliente, cliente, num_doc, periodo_fat, data_emissao, dt_recebimento, valot_total, saldo_a_pagar, status')
        ]);

        const sellerById = new Map<string, CommissionSeller>();
        const sellerByEmail = new Map<string, CommissionSeller>();
        sellers.forEach(s => {
            sellerById.set(s.id, s);
            sellerByEmail.set(s.email.toLowerCase(), s);
        });

        const alexSeller: CommissionSeller = sellerByEmail.get(ALEX_EMAIL) || { id: ALEX_ID, email: ALEX_EMAIL, name: ALEX_NAME };
        const omarSeller: CommissionSeller = sellerByEmail.get(OMAR_EMAIL) || { id: OMAR_ID, email: OMAR_EMAIL, name: OMAR_NAME };

        const clientsMap = new Map<string, any>();
        ((clientsRes.data || []) as any[]).forEach(c => clientsMap.set(c.id, c));

        const estimacionesMap = new Map<string, any>();
        ((estimacionesRes.data || []) as any[]).forEach(e => estimacionesMap.set(e.id, e));

        const pedidosMap = new Map<string, any>();
        ((pedidosRes.data || []) as any[]).forEach(p => pedidosMap.set(p.id, p));

        const solicitudesMap = new Map<string, any>();
        ((solicitudesRes.data || []) as any[]).forEach(s => solicitudesMap.set(s.id, s));

        // Build map of invoices (contas_receber) by client code / normalized client name + month label
        const cobrosList = (cobrosRes.data || []) as any[];
        const cobrosByClientAndPeriod = new Map<string, any[]>();

        const addCobroKey = (key: string, row: any) => {
            if (!key) return;
            const arr = cobrosByClientAndPeriod.get(key) || [];
            arr.push(row);
            cobrosByClientAndPeriod.set(key, arr);
        };

        cobrosList.forEach(c => {
            const st = String(c.status || '').trim();
            if (st === 'Cancelado' || st === 'Substituído por Acordo') return;
            const periodNorm = normalizeStr(c.periodo_fat);
            if (!periodNorm) return;
            if (c.cod_cliente) {
                addCobroKey(`cod:${String(c.cod_cliente).trim().toUpperCase()}|${periodNorm}`, c);
            }
            if (c.cliente) {
                addCobroKey(`name:${normalizeStr(c.cliente)}|${periodNorm}`, c);
            }
        });

        function checkInvoiceForClientMonth(client: any, clientNameFallback: string, mesRef: string) {
            const label = formatMesReferenciaLabel(mesRef); // e.g., "Outubro 2026"
            const periodNorm = normalizeStr(label);
            let matchedCobros: any[] = [];

            if (client?.codigo) {
                const byCod = cobrosByClientAndPeriod.get(`cod:${String(client.codigo).trim().toUpperCase()}|${periodNorm}`);
                if (byCod && byCod.length > 0) matchedCobros = byCod;
            }
            if (matchedCobros.length === 0) {
                const tradeNorm = normalizeStr(client?.trade_name || clientNameFallback);
                const legalNorm = normalizeStr(client?.legal_name);
                if (tradeNorm) {
                    matchedCobros = cobrosByClientAndPeriod.get(`name:${tradeNorm}|${periodNorm}`) || [];
                }
                if (matchedCobros.length === 0 && legalNorm) {
                    matchedCobros = cobrosByClientAndPeriod.get(`name:${legalNorm}|${periodNorm}`) || [];
                }
            }

            if (matchedCobros.length === 0) {
                return {
                    fatura_quitada: false,
                    fatura_status: 'AGUARDANDO_FATURA' as const,
                    fatura_status_label: `Aguard. Fatura (${label})`,
                    fatura_num_doc: null,
                    fatura_dt_recebimento: null
                };
            }

            // Check if all invoices for that client & period are settled
            const allPaid = matchedCobros.every(cb => {
                const valTotal = parseEuroVal(cb.valot_total);
                const rawSaldo = cb.saldo_a_pagar;
                const saldo = (rawSaldo === '' || rawSaldo === null || rawSaldo === undefined) ? valTotal : parseEuroVal(rawSaldo);
                const statusLower = String(cb.status || '').toLowerCase();
                return statusLower === 'pago' || (valTotal > 0 && saldo <= 0.01);
            });

            const firstDoc = matchedCobros.map(c => c.num_doc).filter(Boolean).join(', ');
            const paidDates = matchedCobros.map(c => c.dt_recebimento).filter(Boolean).sort();
            const lastPaidDate = paidDates.length > 0 ? String(paidDates[paidDates.length - 1]).split('T')[0] : null;

            if (allPaid) {
                const dateFormatted = lastPaidDate ? new Date(lastPaidDate + 'T12:00:00').toLocaleDateString('pt-PT') : '';
                return {
                    fatura_quitada: true,
                    fatura_status: 'QUITADA' as const,
                    fatura_status_label: dateFormatted ? `Quitada em ${dateFormatted}` : `Fatura Quitada (${firstDoc || label})`,
                    fatura_num_doc: firstDoc || null,
                    fatura_dt_recebimento: lastPaidDate
                };
            }

            return {
                fatura_quitada: false,
                fatura_status: 'FATURA_ABERTA' as const,
                fatura_status_label: `Em Aberto (${firstDoc || label})`,
                fatura_num_doc: firstDoc || null,
                fatura_dt_recebimento: null
            };
        }

        function isFrenchOrBelgian(pedido?: any, est?: any, client?: any): boolean {
            const FR_COUNTRY_ID = 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd';
            if (pedido?.document_language === 'fr' || est?.document_language === 'fr') return true;
            if (pedido?.country_id === FR_COUNTRY_ID || est?.country_id === FR_COUNTRY_ID || client?.country_id === FR_COUNTRY_ID) return true;
            const taxId = String(client?.tax_id || '').toUpperCase().trim();
            if (taxId.startsWith('FR') || taxId.startsWith('BE')) return true;
            const name = String(client?.trade_name || client?.legal_name || '').toUpperCase();
            if (name.includes('PYLONES') || name.includes('CHAUDRONNERIES') || name.includes('PHILIPPE') || name.includes('FATU SOUD') || name.includes('I.M.T.M')) {
                return true;
            }
            return false;
        }

        function resolveSellerForOrder(pedido?: any, client?: any): CommissionSeller {
            const est = pedido?.source_estimacion_id ? estimacionesMap.get(pedido.source_estimacion_id) : null;
            if (isFrenchOrBelgian(pedido, est, client)) {
                return omarSeller;
            }
            const candidateIds = [
                pedido?.commercial_owner_id,
                est?.commercial_owner_id,
                pedido?.created_by,
                est?.created_by,
                pedido?.responsible_id
            ].filter(Boolean);

            for (const cid of candidateIds) {
                const found = sellerById.get(String(cid));
                if (found) return found;
            }

            return alexSeller;
        }

        const rawAssignments = (assignmentsRes.data || []) as any[];
        const rawTargets = (targetsRes.data || []) as any[];

        // Map solicitud_targets replacement links: target_assignment_id -> { source_assignment_id, source_worker_id, reason }
        const targetToSourceMap = new Map<string, { source_assignment_id?: string; source_worker_id?: string; reason?: string }>();
        const solicitudReplacementTargets = new Map<string, { source_assignment_id?: string; source_worker_id?: string; reason?: string }[]>();

        rawTargets.forEach(t => {
            if (t.target_assignment_id) {
                targetToSourceMap.set(t.target_assignment_id, {
                    source_assignment_id: t.source_assignment_id,
                    source_worker_id: t.source_worker_id,
                    reason: t.reason
                });
            }
            if (t.solicitud_id) {
                const list = solicitudReplacementTargets.get(t.solicitud_id) || [];
                list.push({
                    source_assignment_id: t.source_assignment_id,
                    source_worker_id: t.source_worker_id,
                    reason: t.reason
                });
                solicitudReplacementTargets.set(t.solicitud_id, list);
            }
        });

        const assignmentById = new Map<string, any>();
        rawAssignments.forEach(a => assignmentById.set(a.id, a));

        // Helper to determine if an assignment was cancelled BEFORE starting work
        const today = new Date();
        const todayYMD = today.toISOString().split('T')[0];
        today.setHours(0, 0, 0, 0);

        function getAssignmentDatesAndStatus(a: any) {
            const startDateStr = a.start_date
                ? String(a.start_date).split('T')[0]
                : a.planned_start_date
                    ? String(a.planned_start_date).split('T')[0]
                    : a.created_at
                        ? String(a.created_at).split('T')[0]
                        : null;

            const validWorkerBaixa = (a.worker?.data_baixa && (!startDateStr || String(a.worker.data_baixa).split('T')[0] >= startDateStr))
                ? String(a.worker.data_baixa).split('T')[0]
                : null;

            const endDateStr = a.end_date
                ? String(a.end_date).split('T')[0]
                : validWorkerBaixa;

            const rawWorkerStatus = String(a.worker?.status_trabajador || a.status || '').toLowerCase();
            const isCancelled = a.status === 'cancelled' || rawWorkerStatus.includes('desist');
            const isWithdrawnPreStart = isCancelled && (
                !a.start_date ||
                startDateStr! > todayYMD ||
                !endDateStr ||
                endDateStr === startDateStr ||
                String(a.notes || '').toLowerCase().includes('cancelado em')
            );

            const isInactiveStatus = ['completed', 'cancelled', 'replaced', 'relocated'].includes(a.status);
            const isPendingEntry = !isInactiveStatus && !isWithdrawnPreStart && (
                a.status === 'planned' ||
                (!!startDateStr && startDateStr > todayYMD)
            );

            const isTurnover = !isPendingEntry && !isWithdrawnPreStart && (
                isInactiveStatus ||
                rawWorkerStatus.includes('baja') ||
                rawWorkerStatus.includes('inativo') ||
                rawWorkerStatus.includes('desligado') ||
                (!!endDateStr && endDateStr <= todayYMD)
            );

            const isActive = !isPendingEntry && !isWithdrawnPreStart && !isTurnover;

            let daysWorked = 0;
            if (isActive && startDateStr) {
                const sObj = parseLocalDate(startDateStr);
                if (sObj) {
                    sObj.setHours(0, 0, 0, 0);
                    daysWorked = Math.max(0, Math.ceil((today.getTime() - sObj.getTime()) / (1000 * 60 * 60 * 24)));
                }
            } else if (isTurnover && startDateStr) {
                const sObj = parseLocalDate(startDateStr);
                const eObj = parseLocalDate(endDateStr) || today;
                if (sObj && eObj) {
                    sObj.setHours(0, 0, 0, 0);
                    eObj.setHours(0, 0, 0, 0);
                    daysWorked = Math.max(0, Math.ceil((eObj.getTime() - sObj.getTime()) / (1000 * 60 * 60 * 24)));
                }
            }

            const sol = a.solicitud_id ? solicitudesMap.get(a.solicitud_id) : null;
            const isRelocated = a.status === 'relocated' || a.assignment_type === 'relocation' || sol?.tipo === 'relocation';

            let statusLabel = 'Ativo';
            if (isPendingEntry) statusLabel = 'Pendente Ingresso';
            else if (isWithdrawnPreStart) statusLabel = 'Desistiu (Não Iniciou)';
            else if (isRelocated) statusLabel = 'Remanejado';
            else if (a.status === 'replaced') statusLabel = 'Substituído (Reemplazo)';
            else if (isTurnover) statusLabel = 'Desligado / Concluído';

            const targetLink = targetToSourceMap.get(a.id);
            const reason = a.notes || targetLink?.reason || sol?.reason || null;

            return {
                startDateStr,
                endDateStr,
                isWithdrawnPreStart,
                isPendingEntry,
                isTurnover,
                isActive,
                isRelocated,
                daysWorked,
                statusLabel,
                reason,
                sol
            };
        }

        // Link parent assignments (for replacement chains & pre-start cancelled slots)
        const parentOf = new Map<string, string>();

        rawAssignments.forEach(a => {
            if (a.replacement_of_assignment_id && assignmentById.has(a.replacement_of_assignment_id)) {
                parentOf.set(a.id, a.replacement_of_assignment_id);
                return;
            }
            if (a.root_assignment_id && assignmentById.has(a.root_assignment_id) && a.root_assignment_id !== a.id) {
                parentOf.set(a.id, a.root_assignment_id);
                return;
            }
            const tLink = targetToSourceMap.get(a.id);
            if (tLink?.source_assignment_id && assignmentById.has(tLink.source_assignment_id)) {
                parentOf.set(a.id, tLink.source_assignment_id);
                return;
            }
            const sol = a.solicitud_id ? solicitudesMap.get(a.solicitud_id) : null;
            if (sol?.target_assignment_id && assignmentById.has(sol.target_assignment_id) && sol.target_assignment_id !== a.id) {
                parentOf.set(a.id, sol.target_assignment_id);
                return;
            }
            // If linked via solicitud_id of type 'replacement', check solicitudReplacementTargets
            if (a.solicitud_id && solicitudReplacementTargets.has(a.solicitud_id)) {
                const candidates = solicitudReplacementTargets.get(a.solicitud_id)!;
                for (const cand of candidates) {
                    if (cand.source_assignment_id && assignmentById.has(cand.source_assignment_id)) {
                        parentOf.set(a.id, cand.source_assignment_id);
                        return;
                    }
                    if (cand.source_worker_id) {
                        const prevAssign = rawAssignments.find(
                            prev => prev.worker_id === cand.source_worker_id &&
                                (prev.client_id === a.client_id || prev.pedido_id === a.pedido_id) &&
                                prev.id !== a.id
                        );
                        if (prevAssign) {
                            parentOf.set(a.id, prevAssign.id);
                            return;
                        }
                    }
                }
            }
        });

        // Also link pre-start cancelled workers on the same pedido_item_id to the subsequent worker hired for that same item
        const byPedidoItem = new Map<string, any[]>();
        rawAssignments.forEach(a => {
            if (a.pedido_item_id) {
                const list = byPedidoItem.get(a.pedido_item_id) || [];
                list.push(a);
                byPedidoItem.set(a.pedido_item_id, list);
            }
        });

        byPedidoItem.forEach(list => {
            const unlinkedCancelled = list.filter(a => !parentOf.has(a.id) && getAssignmentDatesAndStatus(a).isWithdrawnPreStart);
            const activeOrCompleted = list.filter(a => !getAssignmentDatesAndStatus(a).isWithdrawnPreStart && !parentOf.has(a.id));
            unlinkedCancelled.forEach((canc, idx) => {
                const targetSlot = activeOrCompleted[idx] || activeOrCompleted[0];
                if (targetSlot && targetSlot.id !== canc.id) {
                    // Attach cancelled pre-start worker to the active slot so it appears in history without creating an extra €20 slot
                    parentOf.set(canc.id, targetSlot.id);
                }
            });
        });

        function findRootId(id: string): string {
            const visited = new Set<string>();
            let curr = id;
            while (parentOf.has(curr)) {
                const next = parentOf.get(curr)!;
                if (visited.has(next) || next === curr) break;
                visited.add(curr);
                curr = next;
            }
            return curr;
        }

        // Group assignments by root slot ID
        const slotGroups = new Map<string, any[]>();
        rawAssignments.forEach(a => {
            const rootId = findRootId(a.id);
            const arr = slotGroups.get(rootId) || [];
            arr.push(a);
            slotGroups.set(rootId, arr);
        });

        // Track workers who already generated a commission slot for a seller so relocations (remanejamentos) don't pay €40
        const workerFirstSlotBySeller = new Map<string, string>(); // key: `${sellerEmail}|${worker_id}` -> rootId

        const generatedList: CommissionGenerated[] = [];
        const firstOrderByClient = new Map<string, { pedido: any; client: any; seller: CommissionSeller; firstDate: string; has15Days: boolean }>();

        slotGroups.forEach((chain, rootId) => {
            // Sort chain chronologically: pre-start cancelled / replaced first, then current active/planned last
            const enrichedChain = chain.map(a => ({
                raw: a,
                meta: getAssignmentDatesAndStatus(a)
            })).sort((x, y) => {
                // Put active/planned after replaced/cancelled if created around the same time
                const xFinal = x.meta.isActive || x.meta.isPendingEntry ? 1 : 0;
                const yFinal = y.meta.isActive || y.meta.isPendingEntry ? 1 : 0;
                const tX = new Date(x.raw.created_at || 0).getTime();
                const tY = new Date(y.raw.created_at || 0).getTime();
                if (Math.abs(tX - tY) > 86400000) return tX - tY;
                return xFinal - yFinal;
            });

            // Determine current/titular assignment in the slot (prefer active -> planned -> completed -> last)
            const currentEntry =
                [...enrichedChain].reverse().find(e => e.meta.isActive) ||
                [...enrichedChain].reverse().find(e => e.meta.isPendingEntry) ||
                [...enrichedChain].reverse().find(e => !e.meta.isWithdrawnPreStart) ||
                enrichedChain[enrichedChain.length - 1];

            const firstEntry = enrichedChain[0];

            // Resolve pedido & client from any assignment in the chain
            let matchedPedido: any = null;
            let matchedClient: any = null;
            for (const item of enrichedChain) {
                if (!matchedPedido && item.raw.pedido_id && pedidosMap.has(item.raw.pedido_id)) {
                    matchedPedido = pedidosMap.get(item.raw.pedido_id);
                }
                if (!matchedPedido && item.meta.sol?.pedido_id && pedidosMap.has(item.meta.sol.pedido_id)) {
                    matchedPedido = pedidosMap.get(item.meta.sol.pedido_id);
                }
                const cId = item.raw.client_id || matchedPedido?.client_id || item.meta.sol?.client_id;
                if (!matchedClient && cId && clientsMap.has(cId)) {
                    matchedClient = clientsMap.get(cId);
                }
            }

            const seller = resolveSellerForOrder(matchedPedido, matchedClient);
            const currentWorkerId = currentEntry.raw.worker_id;
            const workerSellerKey = `${seller.email}|${currentWorkerId}`;

            // Check if this worker is a relocation (remanejamento) of an already commissioned worker
            const isRemanejamentoDuplicado = currentWorkerId && workerFirstSlotBySeller.has(workerSellerKey) && workerFirstSlotBySeller.get(workerSellerKey) !== rootId;
            if (currentWorkerId && !workerFirstSlotBySeller.has(workerSellerKey) && !currentEntry.meta.isWithdrawnPreStart) {
                workerFirstSlotBySeller.set(workerSellerKey, rootId);
            }

            if (isRemanejamentoDuplicado) {
                // Do not generate a duplicate €20 commission for a relocated worker ("desse remanejado eu não posso pagar 40 e sim só aqueles 20 que é aquela vaga")
                return;
            }

            const historico_vaga: CommissionSlotHistoryEntry[] = enrichedChain.map((item, idx) => ({
                assignment_id: item.raw.id,
                worker_id: item.raw.worker_id,
                worker_name: item.raw.worker?.nome || 'Trabalhador',
                worker_doc: item.raw.worker?.dni || item.raw.worker?.nif || item.raw.worker?.cod_colab || '-',
                step_order: idx + 1,
                is_current: item.raw.id === currentEntry.raw.id,
                is_relocated: item.meta.isRelocated,
                start_date: item.meta.startDateStr,
                planned_start_date: item.raw.planned_start_date ? String(item.raw.planned_start_date).split('T')[0] : null,
                end_date: item.meta.endDateStr,
                days_worked: item.meta.daysWorked,
                status: item.raw.status,
                status_label: item.meta.statusLabel,
                reason: item.meta.reason,
                solicitud_codigo: item.meta.sol?.codigo || null
            }));

            // Days worked for eligibility: the current titular worker's days worked (or max days worked by a non-replaced completed worker in the slot)
            const titularDaysWorked = currentEntry.meta.daysWorked;
            const carenciaMeta = settings.carencia_dias || 15;
            const carenciaCumprida = titularDaysWorked >= carenciaMeta;

            // Reference date: start date of the current worker (or first entry start date / created_at)
            const refDateStr =
                currentEntry.meta.startDateStr ||
                firstEntry.meta.startDateStr ||
                (firstEntry.raw.created_at ? String(firstEntry.raw.created_at).split('T')[0] : todayYMD);

            const mesRef = refDateStr.substring(0, 7); // 'YYYY-MM'
            const clientName = matchedClient?.trade_name || matchedClient?.legal_name || 'Cliente não especificado';

            // Track client's first order for the €30 New Client Bonus
            if (matchedClient?.id) {
                const existingFirst = firstOrderByClient.get(matchedClient.id);
                if (!existingFirst || refDateStr < existingFirst.firstDate) {
                    firstOrderByClient.set(matchedClient.id, {
                        pedido: matchedPedido,
                        client: matchedClient,
                        seller,
                        firstDate: refDateStr,
                        has15Days: carenciaCumprida
                    });
                } else if (carenciaCumprida) {
                    existingFirst.has15Days = true;
                }
            }

            // Check invoice status for Client + Reference Month
            const invoiceInfo = checkInvoiceForClientMonth(matchedClient, clientName, mesRef);

            const exigeFatura = settings.exigir_fatura_quitada ?? true;
            const elegivel = carenciaCumprida && (!exigeFatura || invoiceInfo.fatura_quitada);

            let motivoBloqueio: string | null = null;
            if (!carenciaCumprida) {
                if (currentEntry.meta.isPendingEntry) {
                    motivoBloqueio = `Aguardando início do trabalhador (${currentEntry.meta.startDateStr ? new Date(currentEntry.meta.startDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : 'Pendente'})`;
                } else if (currentEntry.meta.isWithdrawnPreStart || (currentEntry.meta.isTurnover && titularDaysWorked < carenciaMeta)) {
                    motivoBloqueio = `Vaga em reposição (${titularDaysWorked}/${carenciaMeta} dias cumpridos pelo último trabalhador)`;
                } else {
                    motivoBloqueio = `Em período de carência (${titularDaysWorked}/${carenciaMeta} dias trabalhados)`;
                }
            } else if (exigeFatura && !invoiceInfo.fatura_quitada) {
                motivoBloqueio = `15 dias cumpridos (${titularDaysWorked}d) — Aguardando quitação da fatura de ${formatMesReferenciaLabel(mesRef)}`;
            }

            const repassesCount = Math.max(0, enrichedChain.length - 1);

            generatedList.push({
                id: `vaga_${rootId}`,
                vendedor_id: seller.id,
                vendedor_nome: seller.name,
                vendedor_email: seller.email,
                codpedido: matchedPedido?.codigo || currentEntry.meta.sol?.codigo || 'S/N',
                pedido_id: matchedPedido?.id || undefined,
                nome_colab: currentEntry.raw.worker?.nome || 'Trabalhador',
                worker_doc: currentEntry.raw.worker?.dni || currentEntry.raw.worker?.nif || currentEntry.raw.worker?.cod_colab || '-',
                job_function: currentEntry.raw.job_function_name_snapshot || currentEntry.raw.worker?.funcion || 'Geral',
                cliente_id: matchedClient?.id || undefined,
                cliente_cod: matchedClient?.codigo || undefined,
                cliente_nombre: clientName,
                cliente_created_at: matchedClient?.created_at ? String(matchedClient.created_at).split('T')[0] : null,
                tipo: 'contratacao',
                valor: Number(settings.comissao_base || 20),
                data_referencia: refDateStr,
                mes_referencia: mesRef,
                mes_referencia_label: formatMesReferenciaLabel(mesRef),
                dias_trabalhados: titularDaysWorked,
                carencia_dias_meta: carenciaMeta,
                carencia_cumprida: carenciaCumprida,
                is_pending_start: currentEntry.meta.isPendingEntry,
                is_remanejado: currentEntry.meta.isRelocated,
                repasses_count: repassesCount,
                historico_vaga,
                fatura_quitada: invoiceInfo.fatura_quitada,
                fatura_status: invoiceInfo.fatura_status,
                fatura_status_label: invoiceInfo.fatura_status_label,
                fatura_num_doc: invoiceInfo.fatura_num_doc,
                fatura_dt_recebimento: invoiceInfo.fatura_dt_recebimento,
                elegivel,
                motivo_bloqueio: motivoBloqueio
            });
        });

        // Generate €30 New Client Bonus (bonus_cliente_novo) controlled by client registration date
        const cutoffDate = settings.data_corte_novos_clientes || '2026-07-05';
        firstOrderByClient.forEach(({ pedido, client, seller, firstDate, has15Days }, clientId) => {
            const clientCreatedDate = client?.created_at ? String(client.created_at).split('T')[0] : null;
            if (!clientCreatedDate || clientCreatedDate < cutoffDate) {
                return;
            }
            const refDate = clientCreatedDate >= firstDate ? clientCreatedDate : firstDate;
            const mesRef = firstDate.substring(0, 7);
            const clientName = client?.trade_name || client?.legal_name || 'Cliente Novo';
            const invoiceInfo = checkInvoiceForClientMonth(client, clientName, mesRef);
            const exigeFatura = settings.exigir_fatura_quitada ?? true;
            const elegivel = has15Days && (!exigeFatura || invoiceInfo.fatura_quitada);

            let motivoBloqueio: string | null = null;
            if (!has15Days) {
                motivoBloqueio = `Aguardando trabalhador completar ${settings.carencia_dias || 15} dias no novo cliente`;
            } else if (exigeFatura && !invoiceInfo.fatura_quitada) {
                motivoBloqueio = `Aguardando quitação da 1ª fatura (${formatMesReferenciaLabel(mesRef)})`;
            }

            generatedList.push({
                id: `bonus_cli_${clientId}`,
                vendedor_id: seller.id,
                vendedor_nome: seller.name,
                vendedor_email: seller.email,
                codpedido: pedido?.codigo || '1º Pedido',
                pedido_id: pedido?.id || undefined,
                nome_colab: `Cadastro Cliente: ${new Date(clientCreatedDate + 'T12:00:00').toLocaleDateString('pt-PT')}`,
                cliente_id: clientId,
                cliente_cod: client?.codigo || undefined,
                cliente_nombre: clientName,
                cliente_created_at: clientCreatedDate,
                tipo: 'bonus_cliente_novo',
                valor: Number(settings.bonus_novo_cliente || 30),
                data_referencia: refDate,
                mes_referencia: mesRef,
                mes_referencia_label: formatMesReferenciaLabel(mesRef),
                dias_trabalhados: has15Days ? (settings.carencia_dias || 15) : 0,
                carencia_dias_meta: settings.carencia_dias || 15,
                carencia_cumprida: has15Days,
                repasses_count: 0,
                historico_vaga: [],
                fatura_quitada: invoiceInfo.fatura_quitada,
                fatura_status: invoiceInfo.fatura_status,
                fatura_status_label: invoiceInfo.fatura_status_label,
                fatura_num_doc: invoiceInfo.fatura_num_doc,
                fatura_dt_recebimento: invoiceInfo.fatura_dt_recebimento,
                elegivel,
                motivo_bloqueio: motivoBloqueio
            });
        });

        // Filter by startDate, endDate, and vendedorEmail
        return generatedList.filter(item => {
            if (startDate && item.data_referencia < startDate) return false;
            if (endDate && item.data_referencia > endDate) return false;
            if (vendedorEmail && item.vendedor_email.toLowerCase() !== vendedorEmail.toLowerCase()) return false;
            return true;
        });
    },

    async getLancamentos(startDate?: string, endDate?: string, vendedorEmail?: string): Promise<CommissionLancamento[]> {
        let query = supabase.from('mcs_comissoes_lancamentos').select('*');

        if (vendedorEmail) {
            query = query.ilike('vendedor_email', vendedorEmail);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        const all = (data || []) as CommissionLancamento[];
        // Note: payments and manual releases linked via referencia_id should always be returned so status mapping works across periods;
        // pure adjustments are filtered by date range if provided.
        return all.filter(l => {
            if (l.referencia_id) return true;
            const createdDate = l.created_at ? l.created_at.split('T')[0] : '';
            if (startDate && createdDate < startDate) return false;
            if (endDate && createdDate > endDate) return false;
            return true;
        });
    },

    async registerPayments(
        payments: { id: string; email: string; name: string; mes_referencia: string; valor: number; desc?: string }[],
        adminId: string
    ): Promise<void> {
        const records = payments.map(p => ({
            vendedor_email: p.email,
            vendedor_nome: p.name,
            tipo: 'pagamento' as CommissionAdjustmentType,
            mes_referencia: p.mes_referencia,
            valor: p.valor,
            referencia_id: p.id,
            descricao: p.desc || `Pagamento de Comissão Ref: ${p.id}`,
            created_by: adminId
        }));

        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .insert(records);

        if (error) throw error;
    },

    async registerManualInvoiceRelease(
        items: { id: string; email: string; name: string; mes_referencia: string; cliente_nombre?: string }[],
        adminId: string
    ): Promise<void> {
        const records = items.map(item => ({
            vendedor_email: item.email,
            vendedor_nome: item.name,
            tipo: 'liberacao_fatura' as CommissionAdjustmentType,
            mes_referencia: item.mes_referencia,
            valor: 0,
            referencia_id: item.id,
            descricao: `Quitação de fatura confirmada pelo Financeiro (${item.cliente_nombre || item.mes_referencia})`,
            created_by: adminId
        }));

        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .insert(records);

        if (error) throw error;
    },

    async insertAdjustment(
        email: string,
        name: string,
        mesReferencia: string,
        tipo: CommissionAdjustmentType,
        valor: number,
        descricao: string,
        adminId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .insert([{
                vendedor_email: email,
                vendedor_nome: name,
                tipo,
                mes_referencia: mesReferencia,
                valor,
                descricao,
                created_by: adminId
            }]);

        if (error) throw error;
    },

    async deleteLancamento(id: string): Promise<void> {
        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
