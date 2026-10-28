import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { commissionService } from '../../services/db/SupabaseCommissionService';
import type {
    CommissionGenerated,
    CommissionLancamento,
    CommissionSettings,
    CommissionSeller,
    CommissionSlotHistoryEntry
} from '../../types/models';
import {
    Filter,
    DollarSign,
    Wallet,
    ArrowDownCircle,
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
    AlertCircle,
    UserCheck,
    ArrowRightLeft,
    Calendar,
    Building2,
    X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MultiSelect } from '../../components/ui/MultiSelect';

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
    const [vendedorFilter, setVendedorFilter] = useState<string>('');
    const [mesRefFilter, setMesRefFilter] = useState<string>('');

    // Extra Filters
    const [clienteFilter, setClienteFilter] = useState<string[]>([]);
    const [pedidoFilter, setPedidoFilter] = useState<string[]>([]);
    const [tipoFilter, setTipoFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

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

    // Modal state for Parameters / Rules Configuration
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        bonus_novo_cliente: '30',
        comissao_base: '20',
        carencia_dias: '15',
        exigir_fatura_quitada: true,
        data_corte_novos_clientes: '2026-07-05'
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
                data_corte_novos_clientes: config.data_corte_novos_clientes || '2026-07-05'
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

    // Merge commercial sellers with any additional sellers present in generated/lancamentos
    const allSellers = useMemo(() => {
        const map = new Map<string, string>();
        sellers.forEach(s => map.set(s.email.toLowerCase(), s.name));
        geradas.forEach(g => {
            if (g.vendedor_email) map.set(g.vendedor_email.toLowerCase(), g.vendedor_nome);
        });
        lancamentos.forEach(l => {
            if (l.vendedor_email) map.set(l.vendedor_email.toLowerCase(), l.vendedor_nome);
        });
        return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
    }, [sellers, geradas, lancamentos]);

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
        const exigeFatura = settings?.exigir_fatura_quitada ?? true;

        geradas.forEach(g => {
            const payment = paymentsByRef.get(g.id);
            const manualRelease = manualReleasesByRef.get(g.id);

            const isFaturaQuitada = Boolean(g.fatura_quitada || manualRelease);
            const isCarenciaOk = Boolean(g.carencia_cumprida);
            const isElegivel = isCarenciaOk && (!exigeFatura || isFaturaQuitada);

            let statusConta: 'PAGO' | 'ELEGIVEL' | 'BLOQUEADA_FATURA' | 'BLOQUEADA_CARENCIA' = 'BLOQUEADA_CARENCIA';
            if (payment) {
                statusConta = 'PAGO';
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

            combined.push({
                _id: g.id,
                _type: 'generated',
                raw: g,
                date: g.data_referencia,
                mes_referencia: g.mes_referencia,
                mes_referencia_label: g.mes_referencia_label || g.mes_referencia,
                vendedor_nome: g.vendedor_nome,
                vendedor_email: g.vendedor_email,
                cliente_nome: g.cliente_nombre || '',
                cliente_cod: g.cliente_cod || '',
                cliente_created_at: g.cliente_created_at || null,
                pedido_cod: g.codpedido || '',
                tipo_lancamento: g.tipo,
                desc,
                job_function: g.job_function || '',
                worker_doc: g.worker_doc || '',
                dias_trabalhados: g.dias_trabalhados ?? 0,
                carencia_dias_meta: g.carencia_dias_meta ?? (settings?.carencia_dias || 15),
                carencia_cumprida: isCarenciaOk,
                is_pending_start: g.is_pending_start ?? false,
                is_remanejado: g.is_remanejado ?? false,
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
            if (l.tipo === 'pagamento' && l.referencia_id && geradas.some(g => g.id === l.referencia_id)) {
                return;
            }

            combined.push({
                _id: l.id,
                _type: l.tipo === 'pagamento' ? 'payment_record' : 'adjustment',
                raw: l,
                date: l.created_at ? l.created_at.split('T')[0] : '',
                mes_referencia: l.mes_referencia || '',
                mes_referencia_label: l.mes_referencia || '-',
                vendedor_nome: l.vendedor_nome,
                vendedor_email: l.vendedor_email,
                cliente_nome: '',
                cliente_cod: '',
                cliente_created_at: null,
                pedido_cod: '',
                tipo_lancamento: l.tipo,
                desc:
                    l.tipo === 'pagamento'
                        ? `PAGAMENTO DE COMISSÃO — ${l.descricao || ''}`
                        : `${l.tipo === 'ajuste_positivo' ? 'AJUSTE CRÉDITO (+)' : 'AJUSTE DÉBITO (-)'}: ${l.descricao || ''}`,
                job_function: '',
                worker_doc: '',
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

        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [geradas, lancamentos, settings]);

    const clienteOptions = useMemo(() => {
        const unique = Array.from(new Set(rows.map(r => String(r.cliente_nome)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(c => ({ label: c, value: c })).sort((a, b) => a.label.localeCompare(b.label));
    }, [rows]);

    const pedidoOptions = useMemo(() => {
        const unique = Array.from(new Set(rows.map(r => String(r.pedido_cod)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(p => ({ label: p, value: p })).sort((a, b) => a.label.localeCompare(b.label));
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

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            const matchCliente = clienteFilter.length === 0 || clienteFilter.includes(r.cliente_nome);
            const matchPedido = pedidoFilter.length === 0 || pedidoFilter.includes(r.pedido_cod);
            const matchMes = !mesRefFilter || r.mes_referencia === mesRefFilter;

            let matchTipo = true;
            if (tipoFilter === 'contratacao') matchTipo = r.tipo_lancamento === 'contratacao';
            else if (tipoFilter === 'bonus_cliente_novo') matchTipo = r.tipo_lancamento === 'bonus_cliente_novo';
            else if (tipoFilter === 'com_repasses') matchTipo = (r.repasses_count || 0) > 0;
            else if (tipoFilter === 'ajuste') matchTipo = r._type === 'adjustment' || r._type === 'payment_record';

            let matchStatus = true;
            if (statusFilter === 'ELEGIVEL') matchStatus = r.status === 'ELEGIVEL';
            else if (statusFilter === 'BLOQUEADA_FATURA') matchStatus = r.status === 'BLOQUEADA_FATURA';
            else if (statusFilter === 'BLOQUEADA_CARENCIA') matchStatus = r.status === 'BLOQUEADA_CARENCIA';
            else if (statusFilter === 'BLOQUEADAS_TODAS') matchStatus = r.status === 'BLOQUEADA_CARENCIA' || r.status === 'BLOQUEADA_FATURA';
            else if (statusFilter === 'PAGO') matchStatus = r.status === 'PAGO';

            return matchCliente && matchPedido && matchMes && matchTipo && matchStatus;
        });
    }, [rows, clienteFilter, pedidoFilter, mesRefFilter, tipoFilter, statusFilter]);

    // Conta Corrente Financial Calculations
    const calc = useMemo(() => {
        let totalBrutoGerado = 0;
        let totalBloqueadoCarencia = 0;
        let totalBloqueadoFatura = 0;
        let totalElegivelReceber = 0;
        let totalPago = 0;
        let totalAjustes = 0;
        let countVagas = 0;
        let countClientesNovos = 0;

        filteredRows.forEach(r => {
            if (r._type === 'generated') {
                totalBrutoGerado += r.valor;
                if (r.tipo_lancamento === 'contratacao') countVagas++;
                if (r.tipo_lancamento === 'bonus_cliente_novo') countClientesNovos++;

                if (r.status === 'PAGO') {
                    totalPago += r.valor;
                } else if (r.status === 'ELEGIVEL') {
                    totalElegivelReceber += r.valor;
                } else if (r.status === 'BLOQUEADA_FATURA') {
                    totalBloqueadoFatura += r.valor;
                } else {
                    totalBloqueadoCarencia += r.valor;
                }
            } else if (r._type === 'adjustment') {
                totalAjustes += r.valor;
                totalElegivelReceber += r.valor;
            } else if (r._type === 'payment_record') {
                totalPago += Math.abs(r.valor);
            }
        });

        const totalBloqueado = totalBloqueadoCarencia + totalBloqueadoFatura;

        return {
            totalBrutoGerado,
            totalBloqueado,
            totalBloqueadoCarencia,
            totalBloqueadoFatura,
            totalElegivelReceber,
            totalPago,
            totalAjustes,
            countVagas,
            countClientesNovos
        };
    }, [filteredRows]);

    const handleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
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

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await commissionService.updateSettings({
                bonus_novo_cliente: parseFloat(settingsForm.bonus_novo_cliente) || 30,
                comissao_base: parseFloat(settingsForm.comissao_base) || 20,
                carencia_dias: parseInt(settingsForm.carencia_dias, 10) || 15,
                exigir_fatura_quitada: settingsForm.exigir_fatura_quitada,
                data_corte_novos_clientes: settingsForm.data_corte_novos_clientes || '2026-07-05'
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

    const exportToExcel = () => {
        const dataToExport = filteredRows.map(r => ({
            'Data Referência': r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('pt-PT') : '-',
            'Mês Faturamento': r.mes_referencia_label || '-',
            'Vendedor': r.vendedor_nome,
            'Cliente': r.cliente_nome || '-',
            'Cadastro Cliente': r.cliente_created_at ? new Date(r.cliente_created_at + 'T12:00:00').toLocaleDateString('pt-PT') : '-',
            'Pedido': r.pedido_cod || '-',
            'Tipo': r.tipo_lancamento === 'bonus_cliente_novo' ? 'Bônus Cliente Novo' : r.tipo_lancamento === 'contratacao' ? 'Contratação (Vaga)' : r.tipo_lancamento,
            'Trabalhador Titular / Histórico': r.desc,
            'Função': r.job_function || '-',
            'Repasses na Vaga': r.repasses_count || 0,
            'Dias Trabalhados': r._type === 'generated' && r.tipo_lancamento === 'contratacao' ? `${r.dias_trabalhados}/${r.carencia_dias_meta}` : '-',
            'Fatura do Mês': r.fatura_status_label || '-',
            'Valor (€)': r.valor,
            'Status Conta Corrente': r.status,
            'Observação / Bloqueio': r.motivo_bloqueio || 'Liberado'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Conta_Corrente_Comissoes');
        XLSX.writeFile(workbook, `Conta_Corrente_Comissoes_${startDate}_a_${endDate}.xlsx`);
    };

    return (
        <div className="w-full px-1 sm:px-2 py-2 space-y-4 text-slate-800 dark:text-slate-100">
            {/* Header & Primary Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight">Conta Corrente de Comissões</h1>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Comercial & Contratações
                        </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                        Controle de bônus de novos clientes (€ {settings?.bonus_novo_cliente ?? 30}), contratações por vaga (€ {settings?.comissao_base ?? 20}), carência de {settings?.carencia_dias ?? 15} dias e liberação por quitação de fatura
                    </p>
                </div>

                {/* Period & Seller Selector */}
                <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                            onClick={() => applyQuickPeriod('all_2026')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${startDate === '2026-07-01' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
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

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg">
                        <Filter size={15} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">De:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm dark:text-white"
                        />
                        <span className="text-xs text-slate-500 font-medium ml-1">Até:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm dark:text-white"
                        />
                    </div>

                    {isSupervisor && (
                        <select
                            value={vendedorFilter}
                            onChange={e => setVendedorFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium rounded-lg outline-none min-w-[210px]"
                        >
                            <option value="">Todos os Vendedores ({allSellers.length})</option>
                            {allSellers.map(s => (
                                <option key={s.email} value={s.email}>
                                    {s.name} ({s.email.split('@')[0]})
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={loadData}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Atualizar Conta Corrente"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>
            </div>

            {/* 5 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Saldo Bruto Gerado */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Gerado (Conta)</span>
                        <Wallet size={16} className="text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        € {calc.totalBrutoGerado.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span><b>{calc.countVagas}</b> vagas (€ {settings?.comissao_base ?? 20})</span>
                        <span>•</span>
                        <span><b>{calc.countClientesNovos}</b> clientes novos (€ {settings?.bonus_novo_cliente ?? 30})</span>
                    </div>
                </div>

                {/* 2. Bloqueado (Carência < 15d) */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'BLOQUEADA_CARENCIA' ? '' : 'BLOQUEADA_CARENCIA')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                        statusFilter === 'BLOQUEADA_CARENCIA'
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 ring-1 ring-amber-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Bloqueado (Carência &lt; {settings?.carencia_dias ?? 15}d)</span>
                        <Lock size={16} />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        € {calc.totalBloqueadoCarencia.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Trabalhadores em início ou &lt; {settings?.carencia_dias ?? 15} dias
                    </div>
                </div>

                {/* 3. Bloqueado (15d OK, Aguardando Fatura) */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'BLOQUEADA_FATURA' ? '' : 'BLOQUEADA_FATURA')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                        statusFilter === 'BLOQUEADA_FATURA'
                            ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-400 ring-1 ring-orange-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">15d OK • Aguard. Fatura</span>
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
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
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
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                        <span>Já Pago: <b className="text-slate-700 dark:text-slate-200">€ {calc.totalPago.toFixed(2)}</b></span>
                        {calc.totalAjustes !== 0 && (
                            <span>Ajustes: <b>€ {calc.totalAjustes.toFixed(2)}</b></span>
                        )}
                    </div>
                </div>

                {/* 5. Parâmetros & Regras Vigentes */}
                <div className="bg-blue-50/90 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800/80 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Info size={14} /> Parâmetros Vigentes
                        </span>
                        {isSupervisor && (
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="px-2 py-0.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-colors shadow-xs"
                            >
                                <Settings size={11} /> Configurar
                            </button>
                        )}
                    </div>
                    <div className="text-xs text-blue-900 dark:text-blue-200 space-y-0.5 leading-snug">
                        <div className="flex justify-between">
                            <span>Novo Cliente:</span>
                            <b>€ {Number(settings?.bonus_novo_cliente ?? 30).toFixed(2)}</b>
                        </div>
                        <div className="flex justify-between">
                            <span>Contratação (por Vaga):</span>
                            <b>€ {Number(settings?.comissao_base ?? 20).toFixed(2)}</b>
                        </div>
                        <div className="flex justify-between">
                            <span>Carência Mínima:</span>
                            <b>{settings?.carencia_dias ?? 15} dias trab.</b>
                        </div>
                        <div className="flex justify-between">
                            <span>Liberação Fatura:</span>
                            <b>{settings?.exigir_fatura_quitada !== false ? 'Fatura Quitada' : 'Após Carência'}</b>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-2.5 items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Filtros:</span>

                <div className="w-full sm:w-60">
                    <MultiSelect
                        options={clienteOptions}
                        selectedValues={clienteFilter}
                        onChange={setClienteFilter}
                        placeholder="Filtrar por Cliente..."
                        searchPlaceholder="Buscar cliente..."
                    />
                </div>

                <div className="w-full sm:w-48">
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
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Meses Ref.</option>
                    {mesRefOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                <select
                    value={tipoFilter}
                    onChange={e => setTipoFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Tipos</option>
                    <option value="contratacao">Contratação por Vaga (€ {settings?.comissao_base ?? 20})</option>
                    <option value="bonus_cliente_novo">Bônus Cliente Novo (€ {settings?.bonus_novo_cliente ?? 30})</option>
                    <option value="com_repasses">Vagas com Repasse / Substituição</option>
                    <option value="ajuste">Ajustes Manuais / Pagamentos</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm rounded-lg outline-none text-slate-700 dark:text-slate-300"
                >
                    <option value="">Todos os Status da Conta</option>
                    <option value="ELEGIVEL">✅ Elegível / Liberada para Pagar</option>
                    <option value="BLOQUEADA_FATURA">⏳ 15d OK — Aguard. Quitação Fatura</option>
                    <option value="BLOQUEADA_CARENCIA">🔒 Bloqueada (Carência &lt; 15 dias)</option>
                    <option value="BLOQUEADAS_TODAS">🔒 Todas as Bloqueadas</option>
                    <option value="PAGO">💰 Pago</option>
                </select>

                {(clienteFilter.length > 0 || pedidoFilter.length > 0 || mesRefFilter || tipoFilter || statusFilter || vendedorFilter) && (
                    <button
                        onClick={() => {
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

            {/* Main Conta Corrente Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm sm:text-base">Extrato da Conta Corrente ({filteredRows.length} registros)</h2>
                        {selectedIds.size > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                {selectedIds.size} selecionado(s)
                            </span>
                        )}
                    </div>

                    {isSupervisor && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={exportToExcel}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-700 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                            >
                                <Download size={14} /> Exportar Excel
                            </button>

                            <button
                                onClick={() => setIsAdjustmentModalOpen(true)}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
                            >
                                <PlusCircle size={14} /> Lançamento / Ajuste Extra
                            </button>

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

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-blue-600" />
                            <span>Sincronizando contratações, histórico de vagas e faturamento...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-100/80 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                <tr>
                                    {isSupervisor && (
                                        <th className="px-3 py-3 text-center w-10">
                                            <input type="checkbox" onChange={handleSelectAll} className="rounded" />
                                        </th>
                                    )}
                                    <th className="px-3 py-3 font-bold">Data / Mês Ref.</th>
                                    <th className="px-3 py-3 font-bold">Vendedor</th>
                                    <th className="px-3 py-3 font-bold">Cliente & Pedido</th>
                                    <th className="px-3 py-3 font-bold">Vaga / Trabalhador & Histórico</th>
                                    <th className="px-3 py-3 text-center font-bold">Carência ({settings?.carencia_dias ?? 15}d)</th>
                                    <th className="px-3 py-3 text-center font-bold">Fatura do Mês (Cliente)</th>
                                    <th className="px-3 py-3 text-right font-bold">Valor (€)</th>
                                    <th className="px-3 py-3 text-center font-bold">Status Conta Corrente</th>
                                    <th className="px-3 py-3 text-center font-bold w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-slate-400 italic">
                                            Nenhum registro encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(row => {
                                        const isSelectable = row._type === 'generated' && row.status !== 'PAGO';
                                        const pctCarencia = Math.min(100, Math.round(((row.dias_trabalhados || 0) / (row.carencia_dias_meta || 15)) * 100));

                                        return (
                                            <tr
                                                key={row._id}
                                                className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/70 transition-colors ${
                                                    selectedIds.has(row._id) ? 'bg-blue-50/40 dark:bg-blue-900/15' : ''
                                                }`}
                                            >
                                                {isSupervisor && (
                                                    <td className="px-3 py-3 text-center">
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

                                                {/* Data / Mês Ref */}
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                                                        {row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('pt-PT') : '-'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Ref: {row.mes_referencia_label}
                                                    </div>
                                                </td>

                                                {/* Vendedor */}
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                                                        {row.vendedor_nome}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {row.vendedor_email}
                                                    </div>
                                                </td>

                                                {/* Cliente & Pedido */}
                                                <td className="px-3 py-3">
                                                    {row.cliente_nome ? (
                                                        <div>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                                <span>{row.cliente_nome}</span>
                                                                {row.cliente_cod && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded font-mono">
                                                                        {row.cliente_cod}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                                                {row.pedido_cod && (
                                                                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                                                        {row.pedido_cod}
                                                                    </span>
                                                                )}
                                                                {row.cliente_created_at && (
                                                                    <span title="Data de cadastro do cliente no sistema">
                                                                        • Cad. Cliente: {new Date(row.cliente_created_at + 'T12:00:00').toLocaleDateString('pt-PT')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>

                                                {/* Vaga / Trabalhador & Histórico de Repasses */}
                                                <td className="px-3 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {row.tipo_lancamento === 'bonus_cliente_novo' ? (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                    ★ Bônus Novo Cliente
                                                                </span>
                                                            ) : row.tipo_lancamento === 'contratacao' ? (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                    Vaga Contratação
                                                                </span>
                                                            ) : null}

                                                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                                {row.desc}
                                                            </span>

                                                            {row.job_function && row.tipo_lancamento === 'contratacao' && (
                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                    ({row.job_function})
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Repasses / Substituições Badge */}
                                                        {row.tipo_lancamento === 'contratacao' && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {row.repasses_count > 0 ? (
                                                                    <button
                                                                        onClick={() => setHistoryModalRow(row)}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100/90 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 transition-colors"
                                                                    >
                                                                        <ArrowRightLeft size={11} />
                                                                        {row.repasses_count} {row.repasses_count === 1 ? 'Repasse / Substituição' : 'Repasses / Substituições'} na Vaga (Ver Histórico)
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setHistoryModalRow(row)}
                                                                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                                                                    >
                                                                        <History size={11} /> Ver histórico da vaga
                                                                    </button>
                                                                )}

                                                                {row.is_remanejado && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                                        Remanejado (Vaga Única)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Carência 15 Dias */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {row._type === 'generated' ? (
                                                        <div className="flex flex-col items-center gap-1 min-w-[110px]">
                                                            <div className="flex items-center justify-between w-full text-[11px] font-semibold">
                                                                <span className={row.carencia_cumprida ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                                    {row.dias_trabalhados} / {row.carencia_dias_meta} dias
                                                                </span>
                                                                {row.carencia_cumprida ? (
                                                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                                                ) : (
                                                                    <Lock size={12} className="text-amber-500" />
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
                                                            {row.is_pending_start && (
                                                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                                    Pendente Início
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>

                                                {/* Fatura do Mês (Cliente) */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {row._type === 'generated' ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                                    row.fatura_quitada
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : row.fatura_status === 'FATURA_ABERTA'
                                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600'
                                                                }`}
                                                            >
                                                                {row.fatura_quitada ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                                                {row.fatura_status_label}
                                                            </span>

                                                            {isSupervisor && !row.fatura_quitada && row.status !== 'PAGO' && (
                                                                <button
                                                                    onClick={() => handleReleaseInvoiceForRows([row])}
                                                                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                                                    title="Confirmar manualmente que a fatura deste mês foi paga pelo cliente"
                                                                >
                                                                    <Unlock size={10} /> Confirmar Quitação
                                                                </button>
                                                            )}

                                                            {isSupervisor && row.manualReleaseInfo && (
                                                                <button
                                                                    onClick={() => handleRevertLancamento(row.manualReleaseInfo.id, 'desbloqueio manual de fatura')}
                                                                    className="text-[10px] text-slate-400 hover:text-red-500 hover:underline"
                                                                >
                                                                    Reverter liberação
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">{row.fatura_status_label}</span>
                                                    )}
                                                </td>

                                                {/* Valor (€) */}
                                                <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${
                                                    row.valor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {row.valor >= 0 ? '+' : ''}€ {row.valor.toFixed(2)}
                                                </td>

                                                {/* Status Conta Corrente */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {row.status === 'PAGO' && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
                                                                <CheckCircle2 size={12} /> PAGO
                                                            </span>
                                                            {row.paymentInfo && (
                                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                                    Pago em {new Date(row.paymentInfo.created_at).toLocaleDateString('pt-PT')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {row.status === 'ELEGIVEL' && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                                                                <Unlock size={12} /> ELEGÍVEL / LIBERADA
                                                            </span>
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                                                Pronta para pagamento
                                                            </span>
                                                        </div>
                                                    )}

                                                    {row.status === 'BLOQUEADA_FATURA' && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700">
                                                                <Lock size={12} /> BLOQUEADA (FATURA)
                                                            </span>
                                                            <span className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5" title={row.motivo_bloqueio || ''}>
                                                                15d OK • Aguard. Fatura
                                                            </span>
                                                        </div>
                                                    )}

                                                    {row.status === 'BLOQUEADA_CARENCIA' && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                                                                <Lock size={12} /> BLOQUEADA ({row.dias_trabalhados}/{row.carencia_dias_meta}d)
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[160px] truncate" title={row.motivo_bloqueio || ''}>
                                                                {row.motivo_bloqueio}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {row.status === 'AJUSTE' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300">
                                                            AJUSTE CONTA
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Ações */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {row.tipo_lancamento === 'contratacao' && (
                                                            <button
                                                                onClick={() => setHistoryModalRow(row)}
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                title="Ver Histórico de Trabalhadores e Repasses da Vaga"
                                                            >
                                                                <History size={16} />
                                                            </button>
                                                        )}

                                                        {isSupervisor && (row._type === 'payment_record' || row._type === 'adjustment') && (
                                                            <button
                                                                onClick={() => handleRevertLancamento(row._id, 'lançamento')}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                title="Excluir Lançamento"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}

                                                        {isSupervisor && row._type === 'generated' && row.status === 'PAGO' && row.paymentInfo && (
                                                            <button
                                                                onClick={() => handleRevertLancamento(row.paymentInfo.id, 'pagamento')}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                title="Estornar Pagamento"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL 1: Configurar Parâmetros das Regras de Comissões */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Settings className="text-blue-600" size={20} />
                                <h3 className="text-lg font-bold">Parâmetros das Regras de Comissão</h3>
                            </div>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                        Bônus Cliente Novo (€)
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
                                        Comissão por Contratação / Vaga (€)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.50"
                                        min="0"
                                        value={settingsForm.comissao_base}
                                        onChange={e => setSettingsForm({ ...settingsForm, comissao_base: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 font-semibold"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Padrão: € 20,00 por vaga (mantido em repasses).</p>
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

                        <div className="mt-6 flex justify-end gap-2.5">
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
                                {savingSettings ? 'Salvando...' : 'Salvar Parâmetros'}
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

                        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 text-xs text-blue-900 dark:text-blue-200">
                            <b>Regra de Vaga Única (€ {settings?.comissao_base ?? 20}):</b> Substituições (reemplazos) ou remanejamentos dentro da mesma vaga não duplicam a comissão. Para desbloquear os € {settings?.comissao_base ?? 20}, o trabalhador alocado na vaga precisa completar <b>{historyModalRow.carencia_dias_meta} dias trabalhados</b> e a fatura do mês (<b>{historyModalRow.mes_referencia_label}</b>) deve estar quitada pelo cliente.
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {(historyModalRow.historico_vaga || []).map((entry: CommissionSlotHistoryEntry, idx: number) => (
                                <div
                                    key={entry.assignment_id}
                                    className={`p-3.5 rounded-xl border ${
                                        entry.is_current
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-slate-800 text-white dark:bg-slate-700 text-xs font-bold flex items-center justify-center">
                                                {idx + 1}º
                                            </span>
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-2">
                                                    <span>{entry.worker_name}</span>
                                                    {entry.is_current && (
                                                        <span className="px-2 py-0.2 text-[10px] font-bold uppercase rounded bg-emerald-600 text-white">
                                                            Titular da Vaga
                                                        </span>
                                                    )}
                                                    {idx > 0 && (
                                                        <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                            {idx}º Repasse / Substituto
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Doc/Cód: {entry.worker_doc} {entry.solicitud_codigo ? `• Solicitação: ${entry.solicitud_codigo}` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                entry.days_worked >= (historyModalRow.carencia_dias_meta || 15)
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                            }`}>
                                                {entry.days_worked} dias trabalhados
                                            </span>
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
                                            <b>Saída / Fim:</b> {entry.end_date ? new Date(entry.end_date + 'T12:00:00').toLocaleDateString('pt-PT') : 'Em atividade'}
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
                                    <option value="">Selecione o vendedor...</option>
                                    {allSellers.map(s => (
                                        <option key={s.email} value={s.email}>
                                            {s.name} ({s.email})
                                        </option>
                                    ))}
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
