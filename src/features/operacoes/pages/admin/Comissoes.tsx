import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { commissionService, RETROACTIVE_PAID_CUTOFF } from '../../services/db/SupabaseCommissionService';
import type {
    CommissionGenerated,
    CommissionLancamento,
    CommissionSettings,
    CommissionSeller,
    CommissionSlotHistoryEntry,
    SellerCommissionRule
} from '../../types/models';
import {
    Filter,
    DollarSign,
    Wallet,
    Info,
    PlusCircle,
    Download,
    Trash2,
    Lock,
    Unlock,
    CheckCircle2,
    Clock,
    History,
    Settings,
    RefreshCw,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ArrowRightLeft,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    User,
    Users,
    X
} from 'lucide-react';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { exportCommissionsToExcel, exportCommissionsToPDF } from '../../utils/commissionExportUtils';

type SortField = 'pedido' | 'date' | 'inicio_trab' | 'vendedor' | 'cliente' | 'trabalhador' | 'carencia' | 'fatura' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

export const Comissoes: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<CommissionSettings | null>(null);
    const [sellers, setSellers] = useState<CommissionSeller[]>([]);
    const [geradas, setGeradas] = useState<CommissionGenerated[]>([]);
    const [lancamentos, setLancamentos] = useState<CommissionLancamento[]>([]);

    // Period filter: default from July 2026 to end of next month so all current hirings are visible immediately
    const currentDate = new Date();
    const defaultStart = '2026-07-01';
    const nextMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(nextMonthEnd);
    const [includePendingPrevious, setIncludePendingPrevious] = useState<boolean>(true);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
    const [vendedorFilter, setVendedorFilter] = useState<string>('');
    const [mesRefFilter, setMesRefFilter] = useState<string>('');

    // Extra Filters & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [clienteFilter, setClienteFilter] = useState<string[]>([]);
    const [pedidoFilter, setPedidoFilter] = useState<string[]>([]);
    const [tipoFilter, setTipoFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState<SortField>('pedido');
    const [groupByPedido, setGroupByPedido] = useState<boolean>(true);
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal state for manual adjustment
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjForm, setAdjForm] = useState({
        email: '',
        name: '',
        tipo: 'ajuste_positivo',
        valor: '',
        descricao: ''
    });

    // Modal state for Parameters / Rules Configuration (Global + Individual Seller Rules)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'global' | 'individual'>('global');
    const [selectedRuleSellerEmail, setSelectedRuleSellerEmail] = useState<string>('');
    const [settingsForm, setSettingsForm] = useState<{
        bonus_novo_cliente: string;
        comissao_base: string;
        carencia_dias: string;
        exigir_fatura_quitada: boolean;
        data_corte_novos_clientes: string;
        regras_vendedores: Record<string, SellerCommissionRule>;
    }>({
        bonus_novo_cliente: '30',
        comissao_base: '20',
        carencia_dias: '15',
        exigir_fatura_quitada: true,
        data_corte_novos_clientes: '2026-07-05',
        regras_vendedores: {}
    });

    // Modal state for Vaga Replacement History
    const [historyModalRow, setHistoryModalRow] = useState<any | null>(null);

    const isSupervisor = user?.isAdmin || user?.isSuperAdmin;

    useEffect(() => {
        loadData();
    }, [startDate, endDate, vendedorFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [config, commercialSellers] = await Promise.all([
                commissionService.getSettings(),
                commissionService.getCommercialSellers()
            ]);
            setSettings(config);
            setSellers(commercialSellers);
            setSettingsForm({
                bonus_novo_cliente: String(config.bonus_novo_cliente ?? 30),
                comissao_base: String(config.comissao_base ?? 20),
                carencia_dias: String(config.carencia_dias ?? 15),
                exigir_fatura_quitada: config.exigir_fatura_quitada ?? true,
                data_corte_novos_clientes: config.data_corte_novos_clientes || '2026-07-05',
                regras_vendedores: config.regras_vendedores ? { ...config.regras_vendedores } : {}
            });

            const emailToFetch = isSupervisor ? (vendedorFilter || undefined) : user?.email;

            const [g, l] = await Promise.all([
                commissionService.getComissoesGeradas(startDate, endDate, emailToFetch),
                commissionService.getLancamentos(startDate, endDate, emailToFetch)
            ]);

            setGeradas(g);
            setLancamentos(l);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to load commissions:', error);
            alert('Erro ao carregar os dados da conta corrente de comissões.');
        } finally {
            setLoading(false);
        }
    };

    const [showInactiveSellers, setShowInactiveSellers] = useState(false);

    // Merge commercial sellers with any additional sellers present in generated/lancamentos
    const allSellers = useMemo(() => {
        const map = new Map<string, { email: string; name: string; active: boolean; estadotrabajador: string }>();
        sellers.forEach(s => {
            const email = s.email.toLowerCase();
            map.set(email, {
                email,
                name: s.name,
                active: s.active !== false,
                estadotrabajador: s.estadotrabajador || (s.active === false ? 'Inativo' : 'Ativo')
            });
        });
        geradas.forEach(g => {
            if (g.vendedor_email) {
                const email = g.vendedor_email.toLowerCase();
                if (!map.has(email)) {
                    map.set(email, { email, name: g.vendedor_nome, active: true, estadotrabajador: 'Ativo' });
                }
            }
        });
        lancamentos.forEach(l => {
            if (l.vendedor_email) {
                const email = l.vendedor_email.toLowerCase();
                if (!map.has(email)) {
                    map.set(email, { email, name: l.vendedor_nome, active: true, estadotrabajador: 'Ativo' });
                }
            }
        });
        return Array.from(map.values());
    }, [sellers, geradas, lancamentos]);

    const activeSellers = useMemo(() => allSellers.filter(s => s.active !== false), [allSellers]);
    const inactiveSellers = useMemo(() => allSellers.filter(s => s.active === false), [allSellers]);
    const sellerStatusByEmail = useMemo(() => {
        const map = new Map<string, { active: boolean; estadotrabajador: string }>();
        allSellers.forEach(s => map.set(s.email.toLowerCase(), { active: s.active, estadotrabajador: s.estadotrabajador }));
        return map;
    }, [allSellers]);

    // Helper to get effective rule for currently filtered seller (or global)
    const activeRuleSummary = useMemo(() => {
        const rulesMap = settings?.regras_vendedores || {};
        const activeCustomCount = Object.values(rulesMap).filter(r => r && r.ativo).length;
        if (vendedorFilter) {
            const emailKey = vendedorFilter.toLowerCase().trim();
            const custom = rulesMap[emailKey];
            const sellerObj = allSellers.find(s => s.email.toLowerCase() === emailKey);
            if (custom && custom.ativo) {
                return {
                    isCustom: true,
                    sellerName: sellerObj?.name || custom.vendedor_nome || vendedorFilter,
                    comissao_base: Number(custom.comissao_base ?? settings?.comissao_base ?? 20),
                    bonus_novo_cliente: Number(custom.bonus_novo_cliente ?? settings?.bonus_novo_cliente ?? 30),
                    carencia_dias: Number(custom.carencia_dias ?? settings?.carencia_dias ?? 15),
                    exigir_fatura_quitada: custom.exigir_fatura_quitada ?? settings?.exigir_fatura_quitada ?? true,
                    activeCustomCount
                };
            }
            return {
                isCustom: false,
                sellerName: sellerObj?.name || vendedorFilter,
                comissao_base: Number(settings?.comissao_base ?? 20),
                bonus_novo_cliente: Number(settings?.bonus_novo_cliente ?? 30),
                carencia_dias: Number(settings?.carencia_dias ?? 15),
                exigir_fatura_quitada: settings?.exigir_fatura_quitada ?? true,
                activeCustomCount
            };
        }
        return {
            isCustom: false,
            sellerName: null,
            comissao_base: Number(settings?.comissao_base ?? 20),
            bonus_novo_cliente: Number(settings?.bonus_novo_cliente ?? 30),
            carencia_dias: Number(settings?.carencia_dias ?? 15),
            exigir_fatura_quitada: settings?.exigir_fatura_quitada ?? true,
            activeCustomCount
        };
    }, [settings, vendedorFilter, allSellers]);

    // Combine generated commissions + payments + manual invoice releases + adjustments into Conta Corrente rows
    const rows = useMemo(() => {
        const paymentsByRef = new Map<string, CommissionLancamento>();
        const manualReleasesByRef = new Map<string, CommissionLancamento>();

        lancamentos.forEach(l => {
            if (l.tipo === 'pagamento' && l.referencia_id) {
                paymentsByRef.set(l.referencia_id, l);
            } else if (l.tipo === 'liberacao_fatura' && l.referencia_id) {
                manualReleasesByRef.set(l.referencia_id, l);
            }
        });

        const combined: any[] = [];
        const defaultExigeFatura = settings?.exigir_fatura_quitada ?? true;

        geradas.forEach(g => {
            const payment = paymentsByRef.get(g.id);
            const manualRelease = manualReleasesByRef.get(g.id);

            const exigeFatura = g.exigir_fatura_quitada_regra ?? defaultExigeFatura;
            const isFaturaQuitada = Boolean(g.fatura_quitada || manualRelease);
            const isCarenciaOk = Boolean(g.carencia_cumprida);
            const isElegivel = isCarenciaOk && (!exigeFatura || isFaturaQuitada);

            const isPaidBeforeCutoff = Boolean(
                (g.data_referencia && g.data_referencia <= RETROACTIVE_PAID_CUTOFF) ||
                (g.pedido_start_date && g.pedido_start_date <= RETROACTIVE_PAID_CUTOFF)
            );

            let statusConta: 'PAGO' | 'ELEGIVEL' | 'BLOQUEADA_FATURA' | 'BLOQUEADA_CARENCIA' | 'REMANEJADO' = 'BLOQUEADA_CARENCIA';
            if (payment || (isPaidBeforeCutoff && !(g.remanejado_de_pedido && g.valor === 0))) {
                statusConta = 'PAGO';
            } else if (g.remanejado_de_pedido && g.valor === 0) {
                statusConta = 'REMANEJADO';
            } else if (isElegivel) {
                statusConta = 'ELEGIVEL';
            } else if (isCarenciaOk && exigeFatura && !isFaturaQuitada) {
                statusConta = 'BLOQUEADA_FATURA';
            } else {
                statusConta = 'BLOQUEADA_CARENCIA';
            }

            let desc = '';
            if (g.tipo === 'contratacao') {
                desc = `${g.nome_colab}`;
            } else if (g.tipo === 'bonus_cliente_novo') {
                desc = `BÔNUS NOVO CLIENTE (${g.nome_colab})`;
            } else {
                desc = `${g.nome_colab}`;
            }

            const isBeforeStart = Boolean(startDate && g.data_referencia < startDate);
            const isValidatedInPeriod = Boolean(
                isBeforeStart &&
                statusConta !== 'PAGO' &&
                statusConta !== 'REMANEJADO' &&
                g.data_fim_carencia &&
                g.data_fim_carencia >= startDate &&
                (!endDate || g.data_fim_carencia <= endDate)
            );
            const isRetroactiveOpen = Boolean(
                isBeforeStart &&
                !isValidatedInPeriod &&
                statusConta !== 'PAGO' &&
                statusConta !== 'REMANEJADO' &&
                g.valor > 0
            );

            combined.push({
                _id: g.id,
                _type: 'generated',
                raw: g,
                date: g.data_referencia,
                data_fim_carencia: g.data_fim_carencia || null,
                isBeforeStart,
                isValidatedInPeriod,
                isRetroactiveOpen,
                mes_referencia: g.mes_referencia,
                mes_referencia_label: g.mes_referencia_label || g.mes_referencia,
                vendedor_nome: g.vendedor_nome,
                vendedor_email: g.vendedor_email,
                cliente_nome: g.cliente_nombre || '',
                cliente_cod: g.cliente_cod || '',
                cliente_created_at: g.cliente_created_at || null,
                pedido_cod: g.codpedido || '',
                pedido_start_date: g.pedido_start_date || g.data_referencia,
                pedido_created_at: g.pedido_created_at || null,
                tipo_lancamento: g.tipo,
                desc,
                job_function: g.job_function || '',
                worker_doc: g.worker_doc || '',
                start_date: g.start_date || null,
                end_date: g.end_date || null,
                worker_status_label: g.worker_status_label || '',
                regra_aplicada: g.regra_aplicada || 'padrao',
                dias_trabalhados: g.dias_trabalhados ?? 0,
                carencia_dias_meta: g.carencia_dias_meta ?? (settings?.carencia_dias || 15),
                carencia_cumprida: isCarenciaOk,
                is_pending_start: g.is_pending_start ?? false,
                is_remanejado: g.is_remanejado ?? false,
                pedido_vagas_solicitadas: g.pedido_vagas_solicitadas ?? 0,
                remanejado_de_pedido: g.remanejado_de_pedido || null,
                remanejado_de_cliente: g.remanejado_de_cliente || null,
                remanejado_para_pedido: g.remanejado_para_pedido || null,
                remanejado_para_cliente: g.remanejado_para_cliente || null,
                historico_remanejamento: g.historico_remanejamento || [],
                repasses_count: g.repasses_count ?? 0,
                historico_vaga: g.historico_vaga || [],
                fatura_quitada: isFaturaQuitada,
                fatura_status: manualRelease ? 'LIBERADA_FINANCEIRO' : (g.fatura_status || 'AGUARDANDO_FATURA'),
                fatura_status_label: manualRelease
                    ? `Liberada Fin. (${new Date(manualRelease.created_at).toLocaleDateString('pt-PT')})`
                    : (g.fatura_status_label || 'Aguard. Fatura'),
                fatura_num_doc: g.fatura_num_doc || null,
                valor: g.valor,
                status: statusConta,
                elegivel: isElegivel,
                motivo_bloqueio: isElegivel ? null : g.motivo_bloqueio,
                paymentInfo: payment || null,
                manualReleaseInfo: manualRelease || null
            });
        });

        // Add manual adjustments and standalone payments
        lancamentos.forEach(l => {
            if (l.tipo === 'liberacao_fatura') return;
            if (l.tipo === 'pagamento' && l.referencia_id) {
                return;
            }

            combined.push({
                _id: l.id,
                _type: l.tipo === 'pagamento' ? 'payment_record' : 'adjustment',
                raw: l,
                date: l.created_at ? l.created_at.split('T')[0] : '',
                data_fim_carencia: null,
                isBeforeStart: false,
                isValidatedInPeriod: false,
                isRetroactiveOpen: false,
                mes_referencia: l.mes_referencia || '',
                mes_referencia_label: l.mes_referencia || '-',
                vendedor_nome: l.vendedor_nome,
                vendedor_email: l.vendedor_email,
                cliente_nome: '',
                cliente_cod: '',
                cliente_created_at: null,
                pedido_cod: '',
                pedido_start_date: l.created_at ? l.created_at.split('T')[0] : '',
                pedido_created_at: null,
                tipo_lancamento: l.tipo,
                desc:
                    l.tipo === 'pagamento'
                        ? `PAGAMENTO COMISSÃO: ${l.descricao || 'S/ Desc'}`
                        : `AJUSTE (${l.tipo === 'ajuste_positivo' ? '+' : '-'}): ${l.descricao || ''}`,
                job_function: '',
                worker_doc: '',
                start_date: null,
                end_date: null,
                worker_status_label: '',
                regra_aplicada: 'padrao',
                dias_trabalhados: 0,
                carencia_dias_meta: 15,
                carencia_cumprida: true,
                is_pending_start: false,
                is_remanejado: false,
                repasses_count: 0,
                historico_vaga: [],
                fatura_quitada: true,
                fatura_status: 'LIBERADA_FINANCEIRO',
                fatura_status_label: 'Lançamento Manual',
                fatura_num_doc: null,
                valor: l.tipo === 'ajuste_negativo' ? -Math.abs(l.valor) : Math.abs(l.valor),
                status: l.tipo === 'pagamento' ? 'PAGO' : 'AJUSTE',
                elegivel: l.tipo !== 'pagamento',
                motivo_bloqueio: null,
                paymentInfo: null,
                manualReleaseInfo: null
            });
        });

        return combined;
    }, [geradas, lancamentos, settings, startDate, endDate]);

    const retroactiveCarryCount = useMemo(() => {
        return rows.filter(r => r.isValidatedInPeriod || r.isRetroactiveOpen).length;
    }, [rows]);

    const clienteOptions = useMemo(() => {
        const unique = Array.from(new Set(rows.map(r => String(r.cliente_nome)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(c => ({ label: c, value: c })).sort((a, b) => a.label.localeCompare(b.label, 'pt', { numeric: true }));
    }, [rows]);

    const pedidoOptions = useMemo(() => {
        const unique = Array.from(new Set(rows.map(r => String(r.pedido_cod)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(p => ({ label: p, value: p })).sort((a, b) => a.label.localeCompare(b.label, 'pt', { numeric: true }));
    }, [rows]);

    const mesRefOptions = useMemo(() => {
        const map = new Map<string, string>();
        rows.forEach(r => {
            if (r.mes_referencia) {
                map.set(r.mes_referencia, r.mes_referencia_label || r.mes_referencia);
            }
        });
        return Array.from(map.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([value, label]) => ({ value, label }));
    }, [rows]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            // Default direction: alphabetical fields A->Z ('asc'), numeric/date fields ('desc' or 'asc')
            if (field === 'cliente' || field === 'trabalhador' || field === 'vendedor') {
                setSortDir('asc');
            } else {
                setSortDir('desc');
            }
        }
    };

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = rows.filter(r => {
            // Period & Conta Corrente Carry-Over Logic:
            // - If r.date >= startDate: initiated in the selected period
            // - If r.date < startDate: included when includePendingPrevious is ON and the item either validated its 15 days in the period OR is still unpaid (Em Aberto)
            let matchPeriod = true;
            if (startDate && r.date && r.date < startDate) {
                matchPeriod = includePendingPrevious && (r.isValidatedInPeriod || r.isRetroactiveOpen);
            }

            const matchCliente = clienteFilter.length === 0 || clienteFilter.includes(r.cliente_nome);
            const matchPedido = pedidoFilter.length === 0 || pedidoFilter.includes(r.pedido_cod);
            const matchMes = !mesRefFilter || r.mes_referencia === mesRefFilter;

            let matchTipo = true;
            if (tipoFilter === 'contratacao') matchTipo = r.tipo_lancamento === 'contratacao';
            else if (tipoFilter === 'bonus_cliente_novo') matchTipo = r.tipo_lancamento === 'bonus_cliente_novo';
            else if (tipoFilter === 'com_repasses') matchTipo = (r.repasses_count || 0) > 0;
            else if (tipoFilter === 'com_remanejamento') matchTipo = Boolean(r.remanejado_de_pedido || r.remanejado_para_pedido || (r.historico_remanejamento && r.historico_remanejamento.length > 1));
            else if (tipoFilter === 'acumulado_anterior') matchTipo = Boolean(r.isValidatedInPeriod || r.isRetroactiveOpen);
            else if (tipoFilter === 'ajuste') matchTipo = r._type === 'adjustment' || r._type === 'payment_record';

            let matchStatus = true;
            if (statusFilter === 'ELEGIVEL') matchStatus = r.status === 'ELEGIVEL';
            else if (statusFilter === 'BLOQUEADA_FATURA') matchStatus = r.status === 'BLOQUEADA_FATURA';
            else if (statusFilter === 'BLOQUEADA_CARENCIA') matchStatus = r.status === 'BLOQUEADA_CARENCIA';
            else if (statusFilter === 'BLOQUEADAS_TODAS') matchStatus = r.status === 'BLOQUEADA_CARENCIA' || r.status === 'BLOQUEADA_FATURA';
            else if (statusFilter === 'PAGO') matchStatus = r.status === 'PAGO';
            else if (statusFilter === 'REMANEJADO') matchStatus = r.status === 'REMANEJADO' || Boolean(r.remanejado_de_pedido || r.remanejado_para_pedido);

            let matchSearch = true;
            if (q) {
                const haystack = `${r.desc || ''} ${r.cliente_nome || ''} ${r.cliente_cod || ''} ${r.pedido_cod || ''} ${r.vendedor_nome || ''} ${r.worker_doc || ''} ${r.job_function || ''}`.toLowerCase();
                matchSearch = haystack.includes(q);
            }

            return matchPeriod && matchCliente && matchPedido && matchMes && matchTipo && matchStatus && matchSearch;
        });

        const dirMultiplier = sortDir === 'asc' ? 1 : -1;

        // Build pedido-level metadata so when groupByPedido is ON, all rows of the same Pedido stay together
        const pedidoFirstDateMap = new Map<string, number>();
        const pedidoClientMap = new Map<string, string>();
        filtered.forEach(r => {
            if (!r.pedido_cod) return;
            const dStr = r.pedido_start_date || r.date;
            const t = dStr ? new Date(dStr).getTime() : 0;
            if (!pedidoFirstDateMap.has(r.pedido_cod) || (t > 0 && t < pedidoFirstDateMap.get(r.pedido_cod)!)) {
                pedidoFirstDateMap.set(r.pedido_cod, t);
            }
            if (r.cliente_nome && !pedidoClientMap.has(r.pedido_cod)) {
                pedidoClientMap.set(r.pedido_cod, r.cliente_nome);
            }
        });

        return [...filtered].sort((a, b) => {
            // If groupByPedido is ON and rows belong to different Pedidos, sort the Pedido groups first so a Pedido is NEVER split apart!
            if (groupByPedido && a.pedido_cod !== b.pedido_cod) {
                let groupCmp = 0;
                if (sortField === 'cliente') {
                    const cA = pedidoClientMap.get(a.pedido_cod) || a.cliente_nome || '';
                    const cB = pedidoClientMap.get(b.pedido_cod) || b.cliente_nome || '';
                    groupCmp = String(cA).localeCompare(String(cB), 'pt', { sensitivity: 'base', numeric: true });
                } else if (sortField === 'date') {
                    const tA = pedidoFirstDateMap.get(a.pedido_cod) || 0;
                    const tB = pedidoFirstDateMap.get(b.pedido_cod) || 0;
                    groupCmp = tA - tB;
                }
                if (groupCmp === 0) {
                    groupCmp = String(a.pedido_cod || '').localeCompare(String(b.pedido_cod || ''), 'pt', { sensitivity: 'base', numeric: true });
                }
                return groupCmp * dirMultiplier;
            }

            let cmp = 0;
            switch (sortField) {
                case 'pedido': {
                    cmp = String(a.pedido_cod || '').localeCompare(String(b.pedido_cod || ''), 'pt', { sensitivity: 'base', numeric: true });
                    if (cmp === 0) {
                        cmp = String(a.desc || '').localeCompare(String(b.desc || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
                case 'cliente': {
                    cmp = String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''), 'pt', { sensitivity: 'base', numeric: true });
                    if (cmp === 0) {
                        cmp = String(a.pedido_cod || '').localeCompare(String(b.pedido_cod || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    if (cmp === 0) {
                        cmp = String(a.desc || '').localeCompare(String(b.desc || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
                case 'trabalhador': {
                    cmp = String(a.desc || '').localeCompare(String(b.desc || ''), 'pt', { sensitivity: 'base', numeric: true });
                    if (cmp === 0) {
                        cmp = String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
                case 'vendedor': {
                    cmp = String(a.vendedor_nome || '').localeCompare(String(b.vendedor_nome || ''), 'pt', { sensitivity: 'base', numeric: true });
                    if (cmp === 0) {
                        cmp = String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
                case 'carencia': {
                    cmp = (Number(a.dias_trabalhados) || 0) - (Number(b.dias_trabalhados) || 0);
                    if (cmp === 0) {
                        cmp = String(a.desc || '').localeCompare(String(b.desc || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
                case 'fatura': {
                    const rankA = a.fatura_quitada ? 2 : a.fatura_status === 'FATURA_ABERTA' ? 1 : 0;
                    const rankB = b.fatura_quitada ? 2 : b.fatura_status === 'FATURA_ABERTA' ? 1 : 0;
                    cmp = rankA - rankB;
                    if (cmp === 0) {
                        cmp = String(a.fatura_status_label || '').localeCompare(String(b.fatura_status_label || ''), 'pt', { numeric: true });
                    }
                    break;
                }
                case 'valor': {
                    cmp = (Number(a.valor) || 0) - (Number(b.valor) || 0);
                    break;
                }
                case 'status': {
                    const order: Record<string, number> = { ELEGIVEL: 4, BLOQUEADA_FATURA: 3, BLOQUEADA_CARENCIA: 2, REMANEJADO: 1, PAGO: 0, AJUSTE: -1 };
                    cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
                    break;
                }
                case 'inicio_trab': {
                    const wA = a.start_date || a.date;
                    const wB = b.start_date || b.date;
                    cmp = (wA ? new Date(wA).getTime() : 0) - (wB ? new Date(wB).getTime() : 0);
                    break;
                }
                case 'date':
                default: {
                    const dA = a.pedido_start_date || a.date;
                    const dB = a.pedido_cod === b.pedido_cod ? (b.start_date || b.date) : (b.pedido_start_date || b.date);
                    const tA = dA ? new Date(dA).getTime() : 0;
                    const tB = dB ? new Date(dB).getTime() : 0;
                    cmp = tA - tB;
                    if (cmp === 0) {
                        cmp = String(a.desc || '').localeCompare(String(b.desc || ''), 'pt', { sensitivity: 'base', numeric: true });
                    }
                    break;
                }
            }
            return cmp * dirMultiplier;
        });
    }, [rows, startDate, includePendingPrevious, clienteFilter, pedidoFilter, mesRefFilter, tipoFilter, statusFilter, searchQuery, sortField, sortDir, groupByPedido]);

    // Conta Corrente Financial Calculations
    const calc = useMemo(() => {
        let totalBrutoGerado = 0;
        let totalBloqueadoCarencia = 0;
        let totalBloqueadoFatura = 0;
        let totalElegivelReceber = 0;
        let elegivelMesAtual = 0;
        let elegivelAnterior = 0;
        let totalPago = 0;
        let totalAjustes = 0;
        let countVagas = 0;
        let countClientesNovos = 0;

        filteredRows.forEach(r => {
            if (r._type === 'generated') {
                totalBrutoGerado += r.valor;
                if (r.tipo_lancamento === 'contratacao' && r.valor > 0) countVagas++;
                if (r.tipo_lancamento === 'bonus_cliente_novo') countClientesNovos++;

                if (r.status === 'PAGO') {
                    totalPago += r.valor;
                } else if (r.status === 'ELEGIVEL') {
                    totalElegivelReceber += r.valor;
                    if (r.isBeforeStart) {
                        elegivelAnterior += r.valor;
                    } else {
                        elegivelMesAtual += r.valor;
                    }
                } else if (r.status === 'BLOQUEADA_FATURA') {
                    totalBloqueadoFatura += r.valor;
                } else {
                    totalBloqueadoCarencia += r.valor;
                }
            } else if (r._type === 'adjustment') {
                totalAjustes += r.valor;
                totalElegivelReceber += r.valor;
                elegivelMesAtual += r.valor;
            } else if (r._type === 'payment_record') {
                totalPago += Math.abs(r.valor);
            }
        });

        return {
            totalBrutoGerado,
            totalBloqueadoCarencia,
            totalBloqueadoFatura,
            totalElegivelReceber,
            elegivelMesAtual,
            elegivelAnterior,
            totalPago,
            totalAjustes,
            countVagas,
            countClientesNovos
        };
    }, [filteredRows]);

    const handleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const selectable = filteredRows
                .filter(r => r._type === 'generated' && r.status !== 'PAGO')
                .map(r => r._id);
            setSelectedIds(new Set(selectable));
        } else {
            setSelectedIds(new Set());
        }
    };

    const selectedRowsData = useMemo(() => {
        return filteredRows.filter(r => selectedIds.has(r._id));
    }, [filteredRows, selectedIds]);

    const selectedEligibleRows = useMemo(() => {
        return selectedRowsData.filter(r => r._type === 'generated' && r.status === 'ELEGIVEL');
    }, [selectedRowsData]);

    const selectedPendingInvoiceRows = useMemo(() => {
        return selectedRowsData.filter(r => r._type === 'generated' && !r.fatura_quitada && r.status !== 'PAGO');
    }, [selectedRowsData]);

    const handlePaySelected = async () => {
        if (selectedEligibleRows.length === 0 || !user) {
            alert('Selecione comissões com status ELEGÍVEL / LIBERADA para realizar o pagamento.');
            return;
        }
        const totalPay = selectedEligibleRows.reduce((acc, r) => acc + r.valor, 0);
        if (!window.confirm(`Confirmar pagamento de ${selectedEligibleRows.length} comissão(ões) elegível(is) no valor total de € ${totalPay.toFixed(2)}?`)) return;

        try {
            const paymentsToMake = selectedEligibleRows.map(r => ({
                id: r._id,
                email: r.vendedor_email,
                name: r.vendedor_nome,
                mes_referencia: r.mes_referencia || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                valor: r.valor,
                desc: `${r.tipo_lancamento === 'bonus_cliente_novo' ? 'Bônus Cliente Novo' : 'Contratação'}: ${r.cliente_nome} (${r.pedido_cod}) - ${r.desc}`
            }));

            await commissionService.registerPayments(paymentsToMake, user.id);
            loadData();
        } catch (error) {
            console.error('Error paying:', error);
            alert('Erro ao registrar o pagamento.');
        }
    };

    const handleReleaseInvoiceForRows = async (targetRows: any[]) => {
        if (!user || targetRows.length === 0) return;
        const msg = targetRows.length === 1
            ? `Confirmar quitação da fatura de ${targetRows[0].mes_referencia_label} do cliente "${targetRows[0].cliente_nome}" para desbloquear esta comissão?`
            : `Confirmar quitação de faturamento para ${targetRows.length} itens selecionados?`;
        if (!window.confirm(msg)) return;

        try {
            await commissionService.registerManualInvoiceRelease(
                targetRows.map(r => ({
                    id: r._id,
                    email: r.vendedor_email,
                    name: r.vendedor_nome,
                    mes_referencia: r.mes_referencia,
                    cliente_nombre: r.cliente_nome
                })),
                user.id
            );
            loadData();
        } catch (error) {
            console.error('Error releasing invoice:', error);
            alert('Erro ao liberar faturamento.');
        }
    };

    const handleRevertLancamento = async (lancamentoId: string, label = 'lançamento') => {
        if (!user) return;
        if (!window.confirm(`Tem certeza que deseja reverter este ${label}?`)) return;

        try {
            await commissionService.deleteLancamento(lancamentoId);
            loadData();
        } catch (error) {
            console.error('Error reverting:', error);
            alert('Erro ao reverter o lançamento.');
        }
    };

    const handleSaveAdjustment = async () => {
        if (!user || !adjForm.email || !adjForm.valor) return;
        try {
            await commissionService.insertAdjustment(
                adjForm.email,
                adjForm.name || adjForm.email,
                `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                adjForm.tipo as any,
                parseFloat(adjForm.valor),
                adjForm.descricao,
                user.id
            );
            setIsAdjustmentModalOpen(false);
            setAdjForm({ email: '', name: '', tipo: 'ajuste_positivo', valor: '', descricao: '' });
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar lançamento.');
        }
    };

    const handleOpenSettingsModal = (preselectSellerEmail?: string) => {
        const targetEmail = (preselectSellerEmail ?? vendedorFilter ?? '').toLowerCase().trim();
        if (targetEmail) {
            setSettingsTab('individual');
            setSelectedRuleSellerEmail(targetEmail);
        } else {
            setSettingsTab('global');
            if (!selectedRuleSellerEmail && activeSellers.length > 0) {
                setSelectedRuleSellerEmail(activeSellers[0].email.toLowerCase());
            }
        }
        setIsSettingsModalOpen(true);
    };

    const currentSellerRuleForm = useMemo(() => {
        const emailKey = (selectedRuleSellerEmail || '').toLowerCase().trim();
        const existing = emailKey ? settingsForm.regras_vendedores[emailKey] : undefined;
        return {
            ativo: Boolean(existing?.ativo),
            comissao_base: existing?.comissao_base ?? (parseFloat(settingsForm.comissao_base) || 20),
            bonus_novo_cliente: existing?.bonus_novo_cliente ?? (parseFloat(settingsForm.bonus_novo_cliente) || 30),
            carencia_dias: existing?.carencia_dias ?? (parseInt(settingsForm.carencia_dias, 10) || 15),
            exigir_fatura_quitada: existing?.exigir_fatura_quitada ?? settingsForm.exigir_fatura_quitada
        };
    }, [selectedRuleSellerEmail, settingsForm]);

    const updateSelectedSellerRule = (patch: Partial<SellerCommissionRule>) => {
        const emailKey = (selectedRuleSellerEmail || '').toLowerCase().trim();
        if (!emailKey) return;
        const sellerObj = allSellers.find(s => s.email.toLowerCase() === emailKey);
        const prev = settingsForm.regras_vendedores[emailKey] || {
            vendedor_email: emailKey,
            vendedor_nome: sellerObj?.name || emailKey,
            ativo: true,
            comissao_base: parseFloat(settingsForm.comissao_base) || 20,
            bonus_novo_cliente: parseFloat(settingsForm.bonus_novo_cliente) || 30,
            carencia_dias: parseInt(settingsForm.carencia_dias, 10) || 15,
            exigir_fatura_quitada: settingsForm.exigir_fatura_quitada
        };

        const updated: SellerCommissionRule = {
            ...prev,
            ...patch,
            vendedor_email: emailKey,
            vendedor_nome: sellerObj?.name || prev.vendedor_nome || emailKey,
            updated_at: new Date().toISOString()
        };

        setSettingsForm(curr => ({
            ...curr,
            regras_vendedores: {
                ...curr.regras_vendedores,
                [emailKey]: updated
            }
        }));
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await commissionService.updateSettings({
                bonus_novo_cliente: parseFloat(settingsForm.bonus_novo_cliente) || 30,
                comissao_base: parseFloat(settingsForm.comissao_base) || 20,
                carencia_dias: parseInt(settingsForm.carencia_dias, 10) || 15,
                exigir_fatura_quitada: settingsForm.exigir_fatura_quitada,
                data_corte_novos_clientes: settingsForm.data_corte_novos_clientes || '2026-07-05',
                regras_vendedores: settingsForm.regras_vendedores
            });
            setIsSettingsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar parâmetros de comissões.');
        } finally {
            setSavingSettings(false);
        }
    };

    const applyQuickPeriod = (type: 'current_month' | 'prev_month' | 'all_2026') => {
        const now = new Date();
        if (type === 'current_month') {
            const f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const l = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setStartDate(f);
            setEndDate(l);
        } else if (type === 'prev_month') {
            const f = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const l = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            setStartDate(f);
            setEndDate(l);
        } else {
            setStartDate('2026-07-01');
            setEndDate(nextMonthEnd);
        }
    };

    const getExportMetadata = () => ({
        sellerName: activeRuleSummary.sellerName || (vendedorFilter ? vendedorFilter : 'Todos os Vendedores'),
        sellerEmail: vendedorFilter || undefined,
        isCustomRule: activeRuleSummary.isCustom,
        comissaoBase: Number(activeRuleSummary.comissao_base),
        bonusNovoCliente: Number(activeRuleSummary.bonus_novo_cliente),
        carenciaDias: Number(activeRuleSummary.carencia_dias),
        startDate,
        endDate,
        includePendingPrevious,
        calc
    });

    const handleExportExcel = () => {
        setIsExportMenuOpen(false);
        exportCommissionsToExcel(filteredRows, getExportMetadata());
    };

    const handleExportPDF = () => {
        setIsExportMenuOpen(false);
        exportCommissionsToPDF(filteredRows, getExportMetadata());
    };

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown size={12} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />;
        }
        return sortDir === 'asc'
            ? <ArrowUp size={12} className="text-blue-600 dark:text-blue-400" />
            : <ArrowDown size={12} className="text-blue-600 dark:text-blue-400" />;
    };

    return (
        <div className="w-full px-1 sm:px-2 py-2 space-y-3.5 text-slate-800 dark:text-slate-100">
            {/* Top Title Bar (Compact at the top) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-none">Conta Corrente de Comissões</h1>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Comercial & Contratações
                    </span>
                    {activeRuleSummary.isCustom && (
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                            ★ Regra Individual: {activeRuleSummary.sellerName} (€ {activeRuleSummary.comissao_base} vaga / € {activeRuleSummary.bonus_novo_cliente} cliente)
                        </span>
                    )}
                </div>

                {isSupervisor && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => handleOpenSettingsModal()}
                            className="px-3 py-1.5 text-xs font-semibold border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                        >
                            <Settings size={14} /> Regras por Vendedor
                        </button>

                        <button
                            onClick={() => setIsAdjustmentModalOpen(true)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                        >
                            <PlusCircle size={14} /> Lançamento / Ajuste Extra
                        </button>

                        {/* Export Dropdown (PDF Horizontal or Excel) */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsExportMenuOpen(prev => !prev)}
                                className="px-3 py-1.5 text-xs font-semibold border border-slate-700 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                                <Download size={14} />
                                <span>Exportar (PDF / Excel)</span>
                                <ChevronDown size={13} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isExportMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsExportMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1.5 overflow-hidden">
                                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/70">
                                            Escolha o Formato do Relatório
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleExportPDF}
                                            className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 dark:hover:bg-red-950/30 flex items-start gap-2.5 transition-colors"
                                        >
                                            <FileText size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                                    Relatório PDF (Horizontal)
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Modelo comercial formatado com validação de 15d, fatura e resumo
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportExcel}
                                            className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-start gap-2.5 transition-colors border-t border-slate-100 dark:border-slate-700/60"
                                        >
                                            <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                                    Planilha Excel (.xlsx)
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Tabela completa editável para cálculos e conferência
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Seller (Left) & Period Management Bar (Row Below Title) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Left Side: Commercial / Seller Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendedor:</span>
                    {isSupervisor ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <select
                                value={vendedorFilter}
                                onChange={e => setVendedorFilter(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg outline-none min-w-[230px]"
                            >
                                <option value="">Todos os Vendedores Ativos ({activeSellers.length})</option>
                                <optgroup label={`Vendedores Ativos (${activeSellers.length})`}>
                                    {activeSellers.map(s => {
                                        const rule = settings?.regras_vendedores?.[s.email.toLowerCase()];
                                        const ruleTag = rule?.ativo ? ` • [€${rule.comissao_base}/€${rule.bonus_novo_cliente}]` : '';
                                        return (
                                            <option key={s.email} value={s.email}>
                                                {s.name} ({s.email.split('@')[0]}){ruleTag}
                                            </option>
                                        );
                                    })}
                                </optgroup>
                                {(showInactiveSellers || inactiveSellers.some(s => s.email === vendedorFilter)) && inactiveSellers.length > 0 && (
                                    <optgroup label={`Inativos no Sistema (${inactiveSellers.length})`}>
                                        {inactiveSellers.map(s => (
                                            <option key={s.email} value={s.email}>
                                                {s.name} ({s.email.split('@')[0]}) — [INATIVO]
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>

                            {inactiveSellers.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowInactiveSellers(prev => !prev)}
                                    title={`Vendedores inativos no cadastro de Trabalhadores: ${inactiveSellers.map(s => s.name).join(', ')}. Clique para ${showInactiveSellers ? 'ocultar do seletor' : 'exibir no seletor'}.`}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                                        showInactiveSellers
                                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
                                            : 'bg-yellow-50/80 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800/60'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                    <span>Inativos ({inactiveSellers.length}): {inactiveSellers.map(s => s.name.split(' ')[0]).join(', ')}</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm font-semibold">{user?.email}</span>
                    )}
                </div>

                {/* Right Side: Period Presets + Date Range + Conta Corrente Carry-Over Toggle + Refresh */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Período:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                            onClick={() => applyQuickPeriod('all_2026')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${startDate === '2026-07-01' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                        >
                            Geral (2026)
                        </button>
                        <button
                            onClick={() => applyQuickPeriod('current_month')}
                            className="px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Este Mês
                        </button>
                        <button
                            onClick={() => applyQuickPeriod('prev_month')}
                            className="px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Mês Anterior
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">De:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm font-medium dark:text-white"
                        />
                        <span className="text-xs text-slate-500 font-medium ml-1">Até:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm font-medium dark:text-white"
                        />
                    </div>

                    {startDate > '2026-07-01' && (
                        <button
                            type="button"
                            onClick={() => setIncludePendingPrevious(prev => !prev)}
                            title="Modo Conta Corrente: quando ativo, inclui trabalhadores que iniciaram em meses anteriores e completaram os 15 dias neste período ou cujas comissões ainda estão em aberto (não pagas)."
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                                includePendingPrevious
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${includePendingPrevious ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span>
                                {includePendingPrevious
                                    ? `Conta Corrente (+ ${retroactiveCarryCount} pendentes ant.)`
                                    : `Só Iniciados no Mês (ocultando ${retroactiveCarryCount} ant.)`}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={loadData}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Atualizar Conta Corrente"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>
            </div>

            {/* 5 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Saldo Bruto Gerado */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Gerado (Conta)</span>
                        <Wallet size={16} className="text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        € {calc.totalBrutoGerado.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span><b>{calc.countVagas}</b> vagas (€ {activeRuleSummary.comissao_base})</span>
                        <span>•</span>
                        <span><b>{calc.countClientesNovos}</b> clientes novos (€ {activeRuleSummary.bonus_novo_cliente})</span>
                    </div>
                </div>

                {/* 2. Bloqueado (Carência < 15d) */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'BLOQUEADA_CARENCIA' ? '' : 'BLOQUEADA_CARENCIA')}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                        statusFilter === 'BLOQUEADA_CARENCIA'
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 ring-1 ring-amber-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Bloqueado (Carência &lt; {activeRuleSummary.carencia_dias}d)</span>
                        <Lock size={16} />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        € {calc.totalBloqueadoCarencia.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Trabalhadores em início ou &lt; {activeRuleSummary.carencia_dias} dias
                    </div>
                </div>

                {/* 3. Bloqueado (15d OK, Aguardando Fatura) */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'BLOQUEADA_FATURA' ? '' : 'BLOQUEADA_FATURA')}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                        statusFilter === 'BLOQUEADA_FATURA'
                            ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-400 ring-1 ring-orange-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">{activeRuleSummary.carencia_dias}d OK • Aguard. Fatura</span>
                        <Clock size={16} />
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        € {calc.totalBloqueadoFatura.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Carência cumprida, aguardando cliente quitar fatura
                    </div>
                </div>

                {/* 4. Elegível / Liberado a Pagar + Pago */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'ELEGIVEL' ? '' : 'ELEGIVEL')}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                        statusFilter === 'ELEGIVEL'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Elegível / Liberado a Pagar</span>
                        <Unlock size={16} />
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        € {calc.totalElegivelReceber.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between flex-wrap gap-1">
                        {calc.elegivelAnterior > 0 ? (
                            <span>Mês: <b>€ {calc.elegivelMesAtual.toFixed(0)}</b> • Ant.: <b className="text-amber-600 dark:text-amber-400">€ {calc.elegivelAnterior.toFixed(0)}</b></span>
                        ) : (
                            <span>Já Pago: <b className="text-slate-700 dark:text-slate-200">€ {calc.totalPago.toFixed(2)}</b></span>
                        )}
                        {calc.elegivelAnterior > 0 && (
                            <span>Pago: <b>€ {calc.totalPago.toFixed(0)}</b></span>
                        )}
                    </div>
                </div>

                {/* 5. Parâmetros & Regras Vigentes (Global + Individual por Vendedor) */}
                <div className={`p-3.5 rounded-xl border flex flex-col justify-between shadow-sm ${
                    activeRuleSummary.isCustom
                        ? 'bg-purple-50/90 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80'
                        : 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/80'
                }`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 truncate ${
                            activeRuleSummary.isCustom ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'
                        }`}>
                            <Info size={13} />
                            {activeRuleSummary.sellerName
                                ? `Regra: ${activeRuleSummary.sellerName.split(' ')[0]}`
                                : 'Parâmetros Vigentes'}
                        </span>
                        {isSupervisor && (
                            <button
                                onClick={() => handleOpenSettingsModal()}
                                className={`px-2 py-0.5 text-[11px] font-semibold text-white rounded flex items-center gap-1 transition-colors shadow-xs shrink-0 ${
                                    activeRuleSummary.isCustom ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                title="Configurar regra padrão ou regra individual por vendedor"
                            >
                                <Settings size={11} /> Configurar
                            </button>
                        )}
                    </div>
                    <div className={`text-xs space-y-0.5 leading-snug ${
                        activeRuleSummary.isCustom ? 'text-purple-900 dark:text-purple-200' : 'text-blue-900 dark:text-blue-200'
                    }`}>
                        <div className="flex justify-between">
                            <span>Novo Cliente:</span>
                            <b>€ {Number(activeRuleSummary.bonus_novo_cliente).toFixed(2)}</b>
                        </div>
                        <div className="flex justify-between">
                            <span>Contratação (por Vaga):</span>
                            <b>€ {Number(activeRuleSummary.comissao_base).toFixed(2)}</b>
                        </div>
                        <div className="flex justify-between">
                            <span>Carência Mínima:</span>
                            <b>{activeRuleSummary.carencia_dias} dias trab.</b>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Escopo da Regra:</span>
                            {activeRuleSummary.isCustom ? (
                                <span className="px-1.5 py-0.2 rounded bg-purple-200/80 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold text-[10px]">
                                    Individual Vendedor
                                </span>
                            ) : (
                                <span className="font-bold text-[11px]">
                                    Global {activeRuleSummary.activeCustomCount > 0 ? `(${activeRuleSummary.activeCustomCount} indiv.)` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-0.5">Filtros:</span>

                {/* Quick Search Worker / Client / Order */}
                <div className="relative w-full sm:w-60">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar trabalhador, cliente..."
                        className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="w-full sm:w-56">
                    <MultiSelect
                        options={clienteOptions}
                        selectedValues={clienteFilter}
                        onChange={setClienteFilter}
                        placeholder="Filtrar por Cliente..."
                        searchPlaceholder="Buscar cliente..."
                    />
                </div>

                <div className="w-full sm:w-44">
                    <MultiSelect
                        options={pedidoOptions}
                        selectedValues={pedidoFilter}
                        onChange={setPedidoFilter}
                        placeholder="Pedido (PED-...)"
                        searchPlaceholder="Buscar pedido..."
                    />
                </div>

                <select
                    value={mesRefFilter}
                    onChange={e => setMesRefFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Meses Ref.</option>
                    {mesRefOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                <select
                    value={tipoFilter}
                    onChange={e => setTipoFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Tipos</option>
                    <option value="contratacao">Contratação por Vaga (€ {activeRuleSummary.comissao_base})</option>
                    <option value="bonus_cliente_novo">Bônus Cliente Novo (€ {activeRuleSummary.bonus_novo_cliente})</option>
                    <option value="com_repasses">Vagas com Repasse / Substituição</option>
                    <option value="com_remanejamento">⇄ Trabalhadores com Remanejamento entre Pedidos</option>
                    <option value="acumulado_anterior">⏳ Acumulados / Validados de Meses Anteriores</option>
                    <option value="ajuste">Ajustes Manuais / Pagamentos</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Status da Conta</option>
                    <option value="ELEGIVEL">✅ Elegível / Liberada para Pagar</option>
                    <option value="BLOQUEADA_FATURA">⏳ {activeRuleSummary.carencia_dias}d OK — Aguard. Quitação Fatura</option>
                    <option value="BLOQUEADA_CARENCIA">🔒 Bloqueada (Carência &lt; {activeRuleSummary.carencia_dias} dias)</option>
                    <option value="BLOQUEADAS_TODAS">🔒 Todas as Bloqueadas</option>
                    <option value="REMANEJADO">⇄ Remanejado entre Pedidos</option>
                    <option value="PAGO">💰 Pago</option>
                </select>

                {(searchQuery || clienteFilter.length > 0 || pedidoFilter.length > 0 || mesRefFilter || tipoFilter || statusFilter || vendedorFilter) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setClienteFilter([]);
                            setPedidoFilter([]);
                            setMesRefFilter('');
                            setTipoFilter('');
                            setStatusFilter('');
                            setVendedorFilter('');
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium ml-auto"
                    >
                        Limpar Filtros
                    </button>
                )}
            </div>

            {/* Main Conta Corrente Gallery / Table with Internal Scroll & Sticky Sortable Header */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-sm sm:text-base">Extrato da Conta Corrente ({filteredRows.length} registros)</h2>
                            {selectedIds.size > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                    {selectedIds.size} selecionado(s)
                                </span>
                            )}
                        </div>

                        {/* Quick Sort Pills & Group By Pedido Toggle */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 font-semibold mr-1">Ordenar:</span>
                                <button
                                    onClick={() => handleSort('pedido')}
                                    className={`px-2 py-0.5 rounded font-medium transition-colors ${sortField === 'pedido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Pedido (Nº)
                                </button>
                                <button
                                    onClick={() => handleSort('cliente')}
                                    className={`px-2 py-0.5 rounded font-medium transition-colors ${sortField === 'cliente' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Cliente (A-Z)
                                </button>
                                <button
                                    onClick={() => handleSort('trabalhador')}
                                    className={`px-2 py-0.5 rounded font-medium transition-colors ${sortField === 'trabalhador' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Trabalhador (A-Z)
                                </button>
                                <button
                                    onClick={() => handleSort('date')}
                                    className={`px-2 py-0.5 rounded font-medium transition-colors ${sortField === 'date' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Início Pedido
                                </button>
                                <button
                                    onClick={() => handleSort('carencia')}
                                    className={`px-2 py-0.5 rounded font-medium transition-colors ${sortField === 'carencia' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Dias Trab.
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const next = !groupByPedido;
                                    setGroupByPedido(next);
                                    if (next && sortField !== 'pedido' && sortField !== 'cliente') {
                                        setSortField('pedido');
                                        setSortDir('desc');
                                    }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                                    groupByPedido
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                                title="Agrupar as linhas visualmente por Pedido com resumo de vagas solicitadas, repasses e remanejamentos"
                            >
                                <span>📦 Agrupar por Pedido</span>
                            </button>
                        </div>
                    </div>

                    {isSupervisor && (
                        <div className="flex flex-wrap gap-2">

                            {selectedPendingInvoiceRows.length > 0 && (
                                <button
                                    onClick={() => handleReleaseInvoiceForRows(selectedPendingInvoiceRows)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs"
                                    title="Confirmar que a fatura do cliente foi quitada para liberar o pagamento"
                                >
                                    <FileCheck2 size={14} /> Confirmar Quitação Fatura ({selectedPendingInvoiceRows.length})
                                </button>
                            )}

                            <button
                                onClick={handlePaySelected}
                                disabled={selectedEligibleRows.length === 0}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                                    selectedEligibleRows.length > 0
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <DollarSign size={14} /> Pagar Elegíveis ({selectedEligibleRows.length})
                            </button>
                        </div>
                    )}
                </div>

                {/* Internal Scroll Container for the Gallery */}
                <div className="max-h-[calc(100vh-300px)] min-h-[440px] overflow-y-auto overflow-x-auto relative scroll-smooth">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-blue-600" />
                            <span>Sincronizando contratações, histórico de vagas e faturamento...</span>
                        </div>
                    ) : (
                        <table className="w-full table-fixed text-left text-xs sm:text-sm border-collapse min-w-[1160px]">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 shadow-xs">
                                <tr>
                                    {isSupervisor && (
                                        <th className="px-2 py-2.5 text-center w-[32px] bg-slate-100 dark:bg-slate-900">
                                            <input type="checkbox" onChange={handleSelectAll} className="rounded" />
                                        </th>
                                    )}
                                    <th
                                        onClick={() => handleSort('vendedor')}
                                        className="px-2 py-2.5 w-[64px] font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar por Vendedor"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Vend.</span>
                                            {renderSortIcon('vendedor')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('pedido')}
                                        className="px-2 py-2.5 w-[124px] font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar pelo número do Pedido (PED-...)"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Pedido</span>
                                            {renderSortIcon('pedido')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('date')}
                                        className="px-2 py-2.5 w-[90px] text-center font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Data em que o Pedido iniciou (Clique para ordenar)"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>Início Ped.</span>
                                            {renderSortIcon('date')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('cliente')}
                                        className="px-2.5 py-2.5 w-[20%] font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar em ordem alfabética por Cliente"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Cliente</span>
                                            {renderSortIcon('cliente')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('trabalhador')}
                                        className="px-2.5 py-2.5 w-[26%] font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar trabalhador por trabalhador (A-Z)"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Trabalhador / Vaga & Movimentações</span>
                                            {renderSortIcon('trabalhador')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('inicio_trab')}
                                        className="px-2 py-2.5 w-[90px] text-center font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Data em que o Trabalhador iniciou na vaga (Clique para ordenar)"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>Início Trab.</span>
                                            {renderSortIcon('inicio_trab')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('carencia')}
                                        className="px-2 py-2.5 w-[92px] text-center font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar numericamente por Dias Trabalhados"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>Carência</span>
                                            {renderSortIcon('carencia')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('fatura')}
                                        className="px-2 py-2.5 w-[108px] text-center font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar pelo status da Fatura"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>Fatura</span>
                                            {renderSortIcon('fatura')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('valor')}
                                        className="px-2 py-2.5 w-[76px] text-right font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar numericamente por Valor (€)"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>Valor</span>
                                            {renderSortIcon('valor')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('status')}
                                        className="px-2 py-2.5 w-[106px] text-center font-bold cursor-pointer select-none group hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors bg-slate-100 dark:bg-slate-900"
                                        title="Clique para ordenar pelo Status na Conta Corrente"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>Status</span>
                                            {renderSortIcon('status')}
                                        </div>
                                    </th>
                                    <th className="px-1.5 py-2.5 text-center font-bold w-[42px] bg-slate-100 dark:bg-slate-900">Hist.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-10 text-center text-slate-400 italic">
                                            Nenhum registro encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => {
                                        const isSelectable = row._type === 'generated' && row.status !== 'PAGO' && row.status !== 'REMANEJADO';
                                        const pctCarencia = Math.min(100, Math.round(((row.dias_trabalhados || 0) / (row.carencia_dias_meta || 15)) * 100));
                                        const firstName = String(row.vendedor_nome || '').trim().split(/\s+/)[0] || '-';
                                        const shortFaturaLabel = row.fatura_quitada
                                            ? 'Quitada'
                                            : row.fatura_status === 'FATURA_ABERTA'
                                                ? 'Em Aberto'
                                                : 'Aguard. Fatura';

                                        const pedidoDateStr = row.pedido_start_date || row.date;
                                        const workerDateStr = row.start_date || row.date;

                                        // Check if we should render a Pedido Group Header Row before this row
                                        const prevRow = idx > 0 ? filteredRows[idx - 1] : null;
                                        const isNewPedidoGroup = groupByPedido && row.pedido_cod && (!prevRow || prevRow.pedido_cod !== row.pedido_cod);
                                        let pedidoGroupStats = null;
                                        if (isNewPedidoGroup) {
                                            const groupRows = filteredRows.filter(r => r.pedido_cod === row.pedido_cod);
                                            const vagasContratacao = groupRows.filter(r => r.tipo_lancamento === 'contratacao');
                                            const totalRepasses = vagasContratacao.reduce((acc, r) => acc + (r.repasses_count || 0), 0);
                                            const totalRemanejados = vagasContratacao.filter(r => r.remanejado_de_pedido || r.remanejado_para_pedido).length;
                                            const subtotalValor = groupRows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
                                            pedidoGroupStats = {
                                                vagasSolicitadas: row.pedido_vagas_solicitadas || vagasContratacao.length,
                                                vagasAlocadas: vagasContratacao.length,
                                                totalRepasses,
                                                totalRemanejados,
                                                subtotalValor
                                            };
                                        }

                                        return (
                                            <React.Fragment key={row._id}>
                                                {isNewPedidoGroup && pedidoGroupStats && (
                                                    <tr className="bg-slate-100/95 dark:bg-slate-800/95 border-y border-slate-300 dark:border-slate-600">
                                                        <td colSpan={isSupervisor ? 12 : 11} className="px-3 py-1.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-600 text-white text-[11px]">
                                                                        {row.pedido_cod}
                                                                    </span>
                                                                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                                                        {row.cliente_nome}
                                                                    </span>
                                                                    {pedidoDateStr && (
                                                                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                                            • Início Pedido: <b>{new Date(pedidoDateStr + 'T12:00:00').toLocaleDateString('pt-PT')}</b>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                                    <span>
                                                                        Vagas no Pedido: <b>{pedidoGroupStats.vagasAlocadas}</b>
                                                                        {pedidoGroupStats.vagasSolicitadas > 0 ? ` (de ${pedidoGroupStats.vagasSolicitadas} solicitadas)` : ''}
                                                                    </span>
                                                                    {pedidoGroupStats.totalRepasses > 0 && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                                                                            {pedidoGroupStats.totalRepasses} {pedidoGroupStats.totalRepasses === 1 ? 'repasse' : 'repasses'}
                                                                        </span>
                                                                    )}
                                                                    {pedidoGroupStats.totalRemanejados > 0 && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold">
                                                                            ⇄ {pedidoGroupStats.totalRemanejados} com remanejamento
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                                        Subtotal: € {pedidoGroupStats.subtotalValor.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                <tr
                                                    className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/70 transition-colors ${
                                                        selectedIds.has(row._id) ? 'bg-blue-50/40 dark:bg-blue-900/15' : ''
                                                    }`}
                                                >
                                                    {isSupervisor && (
                                                        <td className="px-2 py-2.5 text-center">
                                                            {isSelectable && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(row._id)}
                                                                    onChange={() => handleSelectRow(row._id)}
                                                                    className="rounded"
                                                                />
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Vendedor (apenas primeiro nome) */}
                                                    <td className="px-2 py-2.5 whitespace-nowrap">
                                                        <span
                                                            className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                                                            title={`${row.vendedor_nome} (${row.vendedor_email})`}
                                                        >
                                                            {firstName}
                                                        </span>
                                                    </td>

                                                    {/* Pedido (coluna dedicada ordenável) */}
                                                    <td className="px-2 py-2.5 whitespace-nowrap">
                                                        {row.pedido_cod ? (
                                                            <span
                                                                onClick={() => setPedidoFilter(pedidoFilter.includes(row.pedido_cod) ? [] : [row.pedido_cod])}
                                                                className="cursor-pointer font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 transition-colors"
                                                                title="Clique para filtrar apenas este Pedido"
                                                            >
                                                                {row.pedido_cod}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>

                                                    {/* Data Início do Pedido */}
                                                    <td
                                                        className="px-2 py-2.5 text-center whitespace-nowrap"
                                                        title={`Data de Início do Pedido: ${pedidoDateStr ? new Date(pedidoDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}${row.pedido_created_at ? ' • Abertura do Pedido: ' + new Date(row.pedido_created_at + 'T12:00:00').toLocaleDateString('pt-PT') : ''}`}
                                                    >
                                                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                                                            {pedidoDateStr ? new Date(pedidoDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}
                                                        </span>
                                                    </td>

                                                    {/* Cliente (em uma linha, destacado) */}
                                                    <td className="px-2.5 py-2.5">
                                                        {row.cliente_nome ? (
                                                            <div
                                                                className="flex items-center gap-1.5 min-w-0"
                                                                title={`${row.cliente_nome} ${row.cliente_created_at ? '• Cad. Cliente: ' + new Date(row.cliente_created_at + 'T12:00:00').toLocaleDateString('pt-PT') : ''}`}
                                                            >
                                                                <span className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-[13px]">
                                                                    {row.cliente_nome}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>

                                                    {/* Trabalhador / Vaga & Remanejamentos */}
                                                    <td className="px-2.5 py-2.5">
                                                        <div
                                                            className="flex items-center gap-1.5 min-w-0"
                                                            title={`${row.desc} ${row.job_function ? '(' + row.job_function + ')' : ''} ${row.worker_doc && row.worker_doc !== '-' ? '• Doc: ' + row.worker_doc : ''}`}
                                                        >
                                                            {row.tipo_lancamento === 'bonus_cliente_novo' && (
                                                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                                    Novo Cliente
                                                                </span>
                                                            )}

                                                            <span className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-[13px]">
                                                                {row.desc}
                                                            </span>

                                                            {row.tipo_lancamento === 'contratacao' && row.repasses_count > 0 && (
                                                                <button
                                                                    onClick={() => setHistoryModalRow(row)}
                                                                    className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 transition-colors"
                                                                    title="Clique para ver o histórico de substituições/repasses desta vaga"
                                                                >
                                                                    <ArrowRightLeft size={10} />
                                                                    {row.repasses_count} {row.repasses_count === 1 ? 'repasse' : 'repasses'}
                                                                </button>
                                                            )}

                                                            {row.remanejado_de_pedido && (
                                                                <button
                                                                    onClick={() => setHistoryModalRow(row)}
                                                                    className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 transition-colors"
                                                                    title={`Trabalhador veio remanejado do pedido ${row.remanejado_de_pedido} (${row.remanejado_de_cliente}). Clique para ver a rota entre pedidos.`}
                                                                >
                                                                    ⇄ De {row.remanejado_de_pedido.replace('PED-2026-00', 'PED-')}
                                                                </button>
                                                            )}

                                                            {!row.remanejado_de_pedido && row.remanejado_para_pedido && (
                                                                <button
                                                                    onClick={() => setHistoryModalRow(row)}
                                                                    className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors"
                                                                    title={`Posteriormente remanejado para o pedido ${row.remanejado_para_pedido} (${row.remanejado_para_cliente}). Clique para ver a rota entre pedidos.`}
                                                                >
                                                                    → P/ {row.remanejado_para_pedido.replace('PED-2026-00', 'PED-')}
                                                                </button>
                                                            )}

                                                            {row.isValidatedInPeriod && (
                                                                <span
                                                                    className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-300 dark:border-teal-700"
                                                                    title={`Iniciou no fim do mês anterior (${row.mes_referencia_label}) e completou os 15 dias em ${row.data_fim_carencia ? new Date(row.data_fim_carencia + 'T12:00:00').toLocaleDateString('pt-PT') : ''} (dentro deste período)`}
                                                                >
                                                                    🗓️ 15d no Mês ({String(row.mes_referencia_label || '').split(' ')[0].slice(0, 3)})
                                                                </span>
                                                            )}

                                                            {row.isRetroactiveOpen && (
                                                                <span
                                                                    className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                                                    title={`Comissão gerada em ${row.mes_referencia_label} que continua em aberto na Conta Corrente (ainda não paga)`}
                                                                >
                                                                    ⏳ Ant. ({String(row.mes_referencia_label || '').split(' ')[0].slice(0, 3)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Data Início do Trabalhador */}
                                                    <td
                                                        className="px-2 py-2.5 text-center whitespace-nowrap"
                                                        title={`Data de Início do Trabalhador na vaga: ${workerDateStr ? new Date(workerDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}${row.end_date ? ' • Saída: ' + new Date(row.end_date + 'T12:00:00').toLocaleDateString('pt-PT') : ' • Em atividade'}`}
                                                    >
                                                        <span className="font-semibold text-xs text-blue-700 dark:text-blue-300">
                                                            {workerDateStr ? new Date(workerDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}
                                                        </span>
                                                    </td>

                                                    {/* Carência (15d) */}
                                                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                                                        {row._type === 'generated' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center justify-between w-full text-[11px] font-bold">
                                                                    <span className={row.carencia_cumprida ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                                        {row.dias_trabalhados}/{row.carencia_dias_meta}d
                                                                    </span>
                                                                    {row.carencia_cumprida ? (
                                                                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                                    ) : (
                                                                        <Lock size={11} className="text-amber-500" />
                                                                    )}
                                                                </div>
                                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${
                                                                            row.carencia_cumprida ? 'bg-emerald-500' : 'bg-amber-500'
                                                                        }`}
                                                                        style={{ width: `${pctCarencia}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>

                                                    {/* Fatura (compacta) */}
                                                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                                                        {row._type === 'generated' ? (
                                                            <div className="flex flex-col items-center gap-0.5" title={row.fatura_status_label}>
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                        row.fatura_quitada
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                                                            : row.fatura_status === 'FATURA_ABERTA'
                                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                                                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600'
                                                                    }`}
                                                                >
                                                                    {row.fatura_quitada ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                                    {shortFaturaLabel}
                                                                </span>

                                                                {isSupervisor && !row.fatura_quitada && row.status !== 'PAGO' && row.status !== 'REMANEJADO' && (
                                                                    <button
                                                                        onClick={() => handleReleaseInvoiceForRows([row])}
                                                                        className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                                        title="Confirmar manualmente que a fatura deste mês foi paga pelo cliente"
                                                                    >
                                                                        Confirmar
                                                                    </button>
                                                                )}

                                                                {isSupervisor && row.manualReleaseInfo && (
                                                                    <button
                                                                        onClick={() => handleRevertLancamento(row.manualReleaseInfo.id, 'desbloqueio manual de fatura')}
                                                                        className="text-[10px] text-slate-400 hover:text-red-500 hover:underline"
                                                                    >
                                                                        Reverter
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">Manual</span>
                                                        )}
                                                    </td>

                                                    {/* Valor (€) */}
                                                    <td className={`px-2 py-2.5 text-right font-bold whitespace-nowrap ${
                                                        row.status === 'REMANEJADO'
                                                            ? 'text-indigo-600 dark:text-indigo-400'
                                                            : row.valor >= 0
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        <span>{row.valor > 0 ? '+' : ''}€ {row.valor.toFixed(2)}</span>
                                                    </td>

                                                    {/* Status Conta Corrente (compacto) */}
                                                    <td className="px-2 py-2.5 text-center whitespace-nowrap" title={row.motivo_bloqueio || ''}>
                                                        {row.status === 'PAGO' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                                <CheckCircle2 size={11} /> PAGO
                                                            </span>
                                                        )}

                                                        {row.status === 'ELEGIVEL' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300">
                                                                <Unlock size={11} /> LIBERADA
                                                            </span>
                                                        )}

                                                        {row.status === 'BLOQUEADA_FATURA' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-300">
                                                                <Lock size={11} /> AG. FATURA
                                                            </span>
                                                        )}

                                                        {row.status === 'BLOQUEADA_CARENCIA' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300">
                                                                <Lock size={11} /> CARÊNCIA
                                                            </span>
                                                        )}

                                                        {row.status === 'REMANEJADO' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                                ⇄ REMANEJADO
                                                            </span>
                                                        )}

                                                        {row.status === 'AJUSTE' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300">
                                                                AJUSTE
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Ações / Histórico */}
                                                    <td className="px-1.5 py-2.5 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {row.tipo_lancamento === 'contratacao' && (
                                                                <button
                                                                    onClick={() => setHistoryModalRow(row)}
                                                                    className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                    title="Ver Histórico de Repasses da Vaga e Remanejamentos entre Pedidos"
                                                                >
                                                                    <History size={15} />
                                                                </button>
                                                            )}

                                                            {isSupervisor && (row._type === 'payment_record' || row._type === 'adjustment') && (
                                                                <button
                                                                    onClick={() => handleRevertLancamento(row._id, 'lançamento')}
                                                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    title="Excluir Lançamento"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}

                                                            {isSupervisor && row._type === 'generated' && row.status === 'PAGO' && row.paymentInfo && (
                                                                <button
                                                                    onClick={() => handleRevertLancamento(row.paymentInfo.id, 'pagamento')}
                                                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    title="Estornar Pagamento"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Sub-linhas de Remanejos / Substituições dentro do Pedido quando Agrupar por Pedido está ativo */}
                                                {groupByPedido && row.tipo_lancamento === 'contratacao' && (row.historico_vaga || []).filter((h: any) => !h.is_current).map((histEntry: any, hIdx: number) => (
                                                    <tr
                                                        key={`${row._id}_sub_${histEntry.assignment_id || hIdx}`}
                                                        onClick={() => setHistoryModalRow(row)}
                                                        className="cursor-pointer bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-950/15 dark:hover:bg-amber-950/30 text-[11px] text-slate-600 dark:text-slate-400 border-l-4 border-l-amber-400"
                                                    >
                                                        {isSupervisor && <td className="px-2 py-1.5"></td>}
                                                        <td className="px-2 py-1.5 text-slate-400">{firstName}</td>
                                                        <td className="px-2 py-1.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
                                                            {histEntry.solicitud_codigo || row.pedido_cod}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center text-[10px]">
                                                            {pedidoDateStr ? new Date(pedidoDateStr + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}
                                                        </td>
                                                        <td className="px-2.5 py-1.5 truncate text-slate-500">
                                                            {row.cliente_nome}
                                                        </td>
                                                        <td className="px-2.5 py-1.5">
                                                            <div className="flex items-center gap-1.5 min-w-0 pl-3">
                                                                <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                                                    ↳ {hIdx === 0 ? '1º na vaga (Substituído):' : `${hIdx + 1}º na vaga (Substituído):` }
                                                                </span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                                    {histEntry.worker_name}
                                                                </span>
                                                                {histEntry.solicitud_codigo && (
                                                                    <span className="shrink-0 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono text-[10px]">
                                                                        {histEntry.solicitud_codigo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center text-[10px]">
                                                            {histEntry.start_date ? new Date(histEntry.start_date + 'T12:00:00').toLocaleDateString('pt-PT') : 'Não iniciou'}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center text-[10px] text-slate-500">
                                                            Saiu c/ {histEntry.days_worked}d
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center text-[10px] text-slate-400">
                                                            Mesma Vaga
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right font-semibold text-slate-400">
                                                            € 0.00
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                                SUBSTITUÍDO
                                                            </span>
                                                        </td>
                                                        <td className="px-1.5 py-1.5 text-center">
                                                            <History size={13} className="inline text-amber-600" />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL 1: Configurar Parâmetros das Regras de Comissões (Global + Individual por Vendedor) */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Settings className="text-blue-600" size={20} />
                                <div>
                                    <h3 className="text-lg font-bold">Parâmetros e Regras de Comissionamento</h3>
                                    <p className="text-xs text-slate-500">Configure a regra geral ou defina valores diferenciados para um comercial específico</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs: Regra Global vs Regra Individual por Vendedor */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-4 border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setSettingsTab('global')}
                                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    settingsTab === 'global'
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <Users size={15} />
                                <span>Regra Padrão (Global)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSettingsTab('individual');
                                    if (!selectedRuleSellerEmail && activeSellers.length > 0) {
                                        setSelectedRuleSellerEmail(activeSellers[0].email.toLowerCase());
                                    }
                                }}
                                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    settingsTab === 'individual'
                                        ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <User size={15} />
                                <span>Regra Individual por Vendedor</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm">
                            {settingsTab === 'global' ? (
                                <div className="space-y-4">
                                    <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200">
                                        Esta é a <b>Regra Geral Padrão</b> aplicada automaticamente a todos os vendedores que não possuírem uma regra individual ativa na aba ao lado.
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                Bônus Cliente Novo Padrão (€)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.50"
                                                min="0"
                                                value={settingsForm.bonus_novo_cliente}
                                                onChange={e => setSettingsForm({ ...settingsForm, bonus_novo_cliente: e.target.value })}
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 font-semibold"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Padrão: € 30,00 por novo cliente cadastrado.</p>
                                        </div>

                                        <div>
                                            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                Comissão por Contratação / Vaga Padrão (€)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.50"
                                                min="0"
                                                value={settingsForm.comissao_base}
                                                onChange={e => setSettingsForm({ ...settingsForm, comissao_base: e.target.value })}
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 font-semibold"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Padrão: € 20,00 por vaga contratada (mantido em repasses).</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                Carência Mínima Trabalhada (Dias)
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={settingsForm.carencia_dias}
                                                onChange={e => setSettingsForm({ ...settingsForm, carencia_dias: e.target.value })}
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 font-semibold"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Trabalhador precisa cumprir ao menos {settingsForm.carencia_dias || 15} dias.</p>
                                        </div>

                                        <div>
                                            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                Data Corte Novos Clientes
                                            </label>
                                            <input
                                                type="date"
                                                value={settingsForm.data_corte_novos_clientes}
                                                onChange={e => setSettingsForm({ ...settingsForm, data_corte_novos_clientes: e.target.value })}
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Clientes cadastrados a partir desta data geram bônus.</p>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settingsForm.exigir_fatura_quitada}
                                                onChange={e => setSettingsForm({ ...settingsForm, exigir_fatura_quitada: e.target.checked })}
                                                className="mt-1 rounded text-blue-600"
                                            />
                                            <div>
                                                <span className="font-semibold block text-slate-800 dark:text-slate-100">
                                                    Desbloquear pagamento somente após Quitação da Fatura do Cliente
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    A comissão nasce bloqueada na contratação, valida os {settingsForm.carencia_dias || 15} dias trabalhados e só fica Elegível quando a fatura daquele mês for paga pelo cliente no Financeiro.
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Seleção do Vendedor para Regra Individual */}
                                    <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 mb-1">
                                                1. Selecione o Vendedor (Comercial)
                                            </label>
                                            <select
                                                value={selectedRuleSellerEmail}
                                                onChange={e => setSelectedRuleSellerEmail(e.target.value)}
                                                className="w-full border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white"
                                            >
                                                <option value="">Selecione um comercial...</option>
                                                {activeSellers.map(s => {
                                                    const r = settingsForm.regras_vendedores[s.email.toLowerCase()];
                                                    return (
                                                        <option key={s.email} value={s.email.toLowerCase()}>
                                                            {s.name} ({s.email}) {r?.ativo ? `— ★ Regra Individual: €${r.comissao_base} vaga / €${r.bonus_novo_cliente} cliente` : '— (Usando Regra Global)'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {selectedRuleSellerEmail && (
                                            <label className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 cursor-pointer">
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                                        Ativar Regra Individual Diferenciada para este Vendedor
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {currentSellerRuleForm.ativo
                                                            ? 'Ativa: As contratações e novos clientes deste comercial usarão os valores abaixo.'
                                                            : `Inativa: Este comercial está seguindo a Regra Global (€ ${settingsForm.comissao_base} por vaga / € ${settingsForm.bonus_novo_cliente} novo cliente).`}
                                                    </span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={currentSellerRuleForm.ativo}
                                                    onChange={e => updateSelectedSellerRule({ ativo: e.target.checked })}
                                                    className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {selectedRuleSellerEmail && (
                                        <div className={`space-y-4 p-4 rounded-xl border transition-all ${
                                            currentSellerRuleForm.ativo
                                                ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700'
                                                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-75'
                                        }`}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                        Comissão por Contratação / Vaga (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        min="0"
                                                        value={currentSellerRuleForm.comissao_base}
                                                        onChange={e => updateSelectedSellerRule({
                                                            ativo: true,
                                                            comissao_base: parseFloat(e.target.value) || 0
                                                        })}
                                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-base"
                                                    />
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        <span className="text-[11px] text-slate-400">Atalhos:</span>
                                                        {[20, 25, 30, 35, 40, 50].map(val => (
                                                            <button
                                                                key={val}
                                                                type="button"
                                                                onClick={() => updateSelectedSellerRule({ ativo: true, comissao_base: val })}
                                                                className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-colors ${
                                                                    Number(currentSellerRuleForm.comissao_base) === val && currentSellerRuleForm.ativo
                                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-purple-50'
                                                                }`}
                                                            >
                                                                € {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                        Bônus por Novo Cliente (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        min="0"
                                                        value={currentSellerRuleForm.bonus_novo_cliente}
                                                        onChange={e => updateSelectedSellerRule({
                                                            ativo: true,
                                                            bonus_novo_cliente: parseFloat(e.target.value) || 0
                                                        })}
                                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-base"
                                                    />
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        <span className="text-[11px] text-slate-400">Atalhos:</span>
                                                        {[20, 30, 40, 50, 60].map(val => (
                                                            <button
                                                                key={val}
                                                                type="button"
                                                                onClick={() => updateSelectedSellerRule({ ativo: true, bonus_novo_cliente: val })}
                                                                className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-colors ${
                                                                    Number(currentSellerRuleForm.bonus_novo_cliente) === val && currentSellerRuleForm.ativo
                                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-purple-50'
                                                                }`}
                                                            >
                                                                € {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                <div>
                                                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                                        Carência Mínima do Vendedor (Dias)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        value={currentSellerRuleForm.carencia_dias}
                                                        onChange={e => updateSelectedSellerRule({
                                                            ativo: true,
                                                            carencia_dias: parseInt(e.target.value, 10) || 15
                                                        })}
                                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                                                    />
                                                </div>

                                                <div className="flex items-center pt-5">
                                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentSellerRuleForm.exigir_fatura_quitada}
                                                            onChange={e => updateSelectedSellerRule({
                                                                ativo: true,
                                                                exigir_fatura_quitada: e.target.checked
                                                            })}
                                                            className="rounded text-purple-600 w-4 h-4"
                                                        />
                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                            Exigir fatura quitada pelo cliente para liberar
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tabela Resumo de Todos os Vendedores Ativos */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                            Resumo de Regras por Vendedor Ativo ({activeSellers.length})
                                        </div>
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                                <tr>
                                                    <th className="px-3 py-2">Vendedor</th>
                                                    <th className="px-3 py-2">Tipo de Regra</th>
                                                    <th className="px-3 py-2 text-right">Vaga Contratada</th>
                                                    <th className="px-3 py-2 text-right">Novo Cliente</th>
                                                    <th className="px-3 py-2 text-center">Carência</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                                {activeSellers.map(s => {
                                                    const emailKey = s.email.toLowerCase();
                                                    const r = settingsForm.regras_vendedores[emailKey];
                                                    const isIndiv = Boolean(r && r.ativo);
                                                    const vagaVal = isIndiv ? r.comissao_base : (parseFloat(settingsForm.comissao_base) || 20);
                                                    const cliVal = isIndiv ? r.bonus_novo_cliente : (parseFloat(settingsForm.bonus_novo_cliente) || 30);
                                                    const carVal = isIndiv ? r.carencia_dias : (parseInt(settingsForm.carencia_dias, 10) || 15);

                                                    return (
                                                        <tr
                                                            key={s.email}
                                                            onClick={() => setSelectedRuleSellerEmail(emailKey)}
                                                            className={`cursor-pointer transition-colors ${
                                                                selectedRuleSellerEmail === emailKey
                                                                    ? 'bg-purple-50/80 dark:bg-purple-900/25 font-semibold'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                            }`}
                                                        >
                                                            <td className="px-3 py-2">{s.name}</td>
                                                            <td className="px-3 py-2">
                                                                {isIndiv ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                                                        ★ Individual
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                                        Padrão Global
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                                € {Number(vagaVal).toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                                                                € {Number(cliVal).toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                {carVal}d
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5">
                            <button
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {savingSettings ? 'Salvando...' : 'Salvar Regras e Recalcular'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Histórico da Vaga (Repasses, Substituições e Remanejamentos) */}
            {historyModalRow && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <History className="text-blue-600" size={20} />
                                    <h3 className="text-lg font-bold">Histórico da Vaga & Controle de Repasses</h3>
                                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        Comissão Única: € {Number(historyModalRow.valor).toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Cliente: <b>{historyModalRow.cliente_nome}</b> • Pedido: <b>{historyModalRow.pedido_cod}</b> • Vendedor: <b>{historyModalRow.vendedor_nome}</b>
                                </p>
                            </div>
                            <button onClick={() => setHistoryModalRow(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                            <div>
                                <b>Regra de Vaga Única (€ {Number(historyModalRow.valor).toFixed(2)}):</b> Substituições (reemplazos) dentro da mesma vaga mantêm a comissão única da vaga (não duplicam).
                            </div>
                            <div>
                                <b>Regra dos {historyModalRow.carencia_dias_meta || 15} Dias:</b> Os dias de trabalhadores anteriores que saíram/foram substituídos <b>não contam</b>. Apenas o <b>Titular Atual que ficou na vaga ({historyModalRow.desc})</b> precisa completar os <b>{historyModalRow.carencia_dias_meta || 15} dias trabalhados</b> (atualmente com <b>{historyModalRow.dias_trabalhados} dias</b>).
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {/* Seção 1: Rota de Remanejamentos entre Pedidos (se o trabalhador passou por mais de 1 pedido) */}
                            {historyModalRow.historico_remanejamento && historyModalRow.historico_remanejamento.length > 1 && (
                                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                                            ⇄ Movimentações / Remanejamentos de {historyModalRow.desc} entre Pedidos ({historyModalRow.historico_remanejamento.length} pedidos)
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {historyModalRow.historico_remanejamento.map((rem: any, rIdx: number) => (
                                            <div
                                                key={rem.assignment_id || rIdx}
                                                className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                                                    rem.is_current_slot
                                                        ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-600 shadow-xs'
                                                        : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded font-bold bg-indigo-600 text-white text-[10px]">
                                                        {rIdx + 1}º Pedido
                                                    </span>
                                                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                                                        {rem.pedido_cod}
                                                    </span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                        {rem.cliente_nombre}
                                                    </span>
                                                    {rIdx === 0 ? (
                                                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold">
                                                            1ª Alocação (Gera Comissão)
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px] font-bold">
                                                            Remanejado (Sem Duplicar)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right text-[11px] text-slate-600 dark:text-slate-300">
                                                    <span>
                                                        Início: <b>{rem.start_date ? new Date(rem.start_date + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}</b>
                                                    </span>
                                                    <span className="mx-1.5">•</span>
                                                    <span>
                                                        Fim: <b>{rem.end_date ? new Date(rem.end_date + 'T12:00:00').toLocaleDateString('pt-PT') : 'Ativo'}</b>
                                                    </span>
                                                    <span className="ml-2 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-bold">
                                                        {rem.days_worked}d trab.
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Seção 2: Histórico Cronológico da Vaga (Do 1º Contratado até quem ficou na vaga) */}
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Linha do Tempo desta Vaga no Pedido {historyModalRow.pedido_cod} (Do 1º contratado até o titular atual)
                            </div>
                            {(historyModalRow.historico_vaga || []).map((entry: CommissionSlotHistoryEntry, idx: number) => (
                                <div
                                    key={entry.assignment_id}
                                    className={`p-3.5 rounded-xl border ${
                                        entry.is_current
                                            ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/50'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-85'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                                                entry.is_current ? 'bg-emerald-600' : 'bg-slate-500 dark:bg-slate-600'
                                            }`}>
                                                {idx + 1}º
                                            </span>
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                                                    <span>{entry.worker_name}</span>
                                                    {entry.is_current ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-600 text-white">
                                                            ★ Titular da Vaga (Ficou na Vaga)
                                                        </span>
                                                    ) : idx === 0 ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                            1º Contratado na Vaga (Saiu / Substituído)
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                            {idx}º Substituto (Saiu / Substituído)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Doc/Cód: {entry.worker_doc} {entry.solicitud_codigo ? `• Solicitação: ${entry.solicitud_codigo}` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            {entry.is_current ? (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    entry.days_worked >= (historyModalRow.carencia_dias_meta || 15)
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                }`}>
                                                    {entry.days_worked} / {historyModalRow.carencia_dias_meta || 15} dias (Conta p/ Carência)
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    Saiu c/ {entry.days_worked}d (Não soma na carência)
                                                </span>
                                            )}
                                            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                {entry.status_label}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <div>
                                            <b>Início:</b> {entry.start_date ? new Date(entry.start_date + 'T12:00:00').toLocaleDateString('pt-PT') : 'Não iniciado'}
                                        </div>
                                        <div>
                                            <b>Saída / Fim:</b> {entry.end_date ? new Date(entry.end_date + 'T12:00:00').toLocaleDateString('pt-PT') : (entry.is_current ? 'Em atividade' : 'Substituído')}
                                        </div>
                                    </div>

                                    {entry.reason && (
                                        <div className="mt-2 text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                            <b>Histórico / Motivo:</b> {entry.reason}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setHistoryModalRow(null)}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
                            >
                                Fechar Histórico
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Lançamento / Ajuste Manual na Conta Corrente */}
            {isAdjustmentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                            <h3 className="text-lg font-bold">Lançamento / Ajuste na Conta Corrente</h3>
                            <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="block font-semibold mb-1">Tipo de Lançamento</label>
                                <select
                                    value={adjForm.tipo}
                                    onChange={e => setAdjForm({ ...adjForm, tipo: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="ajuste_positivo">Crédito / Bônus Extra (+)</option>
                                    <option value="ajuste_negativo">Débito / Desconto / Estorno (-)</option>
                                    <option value="pagamento">Pagamento Avulso de Comissão</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">Vendedor (Comercial)</label>
                                <select
                                    value={adjForm.email}
                                    onChange={e => {
                                        const name = allSellers.find(s => s.email === e.target.value)?.name || '';
                                        setAdjForm({ ...adjForm, email: e.target.value, name });
                                    }}
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="">Selecione o vendedor ativo...</option>
                                    <optgroup label={`Vendedores Ativos (${activeSellers.length})`}>
                                        {activeSellers.map(s => (
                                            <option key={s.email} value={s.email}>
                                                {s.name} ({s.email})
                                            </option>
                                        ))}
                                    </optgroup>
                                    {inactiveSellers.length > 0 && (
                                        <optgroup label={`Inativos no Sistema (${inactiveSellers.length})`}>
                                            {inactiveSellers.map(s => (
                                                <option key={s.email} value={s.email}>
                                                    {s.name} ({s.email}) — [INATIVO]
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">Descrição / Justificativa</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Adiantamento de comissão, bônus meta..."
                                    value={adjForm.descricao}
                                    onChange={e => setAdjForm({ ...adjForm, descricao: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">Valor (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={adjForm.valor}
                                    onChange={e => setAdjForm({ ...adjForm, valor: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAdjustmentModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveAdjustment}
                                disabled={!adjForm.email || !adjForm.valor}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
                            >
                                Salvar Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
