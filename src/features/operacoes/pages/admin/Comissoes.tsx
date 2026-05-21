import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { commissionService } from '../../services/db/SupabaseCommissionService';
import type {  CommissionGenerated, CommissionLancamento, CommissionSettings  } from '../../types/models';
import { Filter, DollarSign, Wallet, ArrowDownCircle, Info, PlusCircle, Download, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n';
import * as XLSX from 'xlsx';
import { MultiSelect } from '../../components/ui/MultiSelect';

export const Comissoes: React.FC = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [settings, setSettings] = useState<CommissionSettings | null>(null);
    const [geradas, setGeradas] = useState<CommissionGenerated[]>([]);
    const [lancamentos, setLancamentos] = useState<CommissionLancamento[]>([]);

    // Filters
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [vendedorFilter, setVendedorFilter] = useState<string>('');

    // Extra Filters
    const [clienteFilter, setClienteFilter] = useState<string[]>([]);
    const [pedidoFilter, setPedidoFilter] = useState<string[]>([]);
    const [tipoFilter, setTipoFilter] = useState('');

    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal state for manual adjustment
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjForm, setAdjForm] = useState({ email: '', name: '', tipo: 'ajuste_positivo', valor: '', descricao: '' });

    const isSupervisor = user?.isAdmin || user?.isSuperAdmin;

    useEffect(() => {
        loadData();
    }, [startDate, endDate, vendedorFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const config = await commissionService.getSettings();
            setSettings(config);

            const emailToFetch = isSupervisor ? (vendedorFilter || undefined) : user?.email;

            const g = await commissionService.getComissoesGeradas(startDate, endDate, emailToFetch);
            const l = await commissionService.getLancamentos(startDate, endDate, emailToFetch);

            setGeradas(g);
            setLancamentos(l);
            setSelectedIds(new Set()); // Reset selections on reload
        } catch (error) {
            console.error("Failed to load commissions:", error);
            alert(t('comissoes.messages.load_error'));
        } finally {
            setLoading(false);
        }
    };

    // Derived State
    const allSellers = useMemo(() => {
        const sellers = new Map<string, string>();
        geradas.forEach(g => sellers.set(g.vendedor_email, g.vendedor_nome));
        lancamentos.forEach(l => sellers.set(l.vendedor_email, l.vendedor_nome));
        return Array.from(sellers.entries()).map(([email, name]) => ({ email, name }));
    }, [geradas, lancamentos]);

    // Data combining
    const rows = useMemo(() => {
        // Map payments by Reference ID to see what has been paid
        const paymentsByRef = new Map<string, CommissionLancamento>();
        lancamentos.forEach(l => {
            if (l.tipo === 'pagamento' && l.referencia_id) {
                paymentsByRef.set(l.referencia_id, l);
            }
        });

        const combined: any[] = [];

        // Add all 'generated' commissions
        geradas.forEach(g => {
            const payment = paymentsByRef.get(g.id);
            let desc = '';
            if (g.tipo === 'contratacao') {
                desc = `CONTRATAÇÃO - Pedido: ${g.codpedido} - ${g.cliente_nombre} - ${g.nome_colab}`;
            } else if (g.tipo === 'bonus_cliente_novo') {
                desc = `BÔNUS CLIENTE NOVO - Pedido: ${g.codpedido} - ${g.cliente_nombre}`;
            } else if (g.tipo === 'desconto_reemplazo') {
                desc = `SUBSTITUIÇÃO - Pedido: ${g.codpedido} - ${g.cliente_nombre} - ${g.nome_colab}`;
            }

            combined.push({
                _id: g.id,
                _type: 'generated',
                date: g.data_referencia,
                vendedor_nome: g.vendedor_nome,
                vendedor_email: g.vendedor_email,
                cliente_nome: g.cliente_nombre || '',
                pedido_cod: g.codpedido || '',
                tipo_lancamento: g.tipo,
                desc,
                valor: g.valor,
                status: payment ? 'PAGO' : 'PENDENTE',
                paymentInfo: payment
            });
        });

        // Add pure adjustments and disconnected payments (payments not tied to a generated commission in the current view)
        lancamentos.forEach(l => {
            if (l.tipo === 'pagamento') {
                // If it's a payment and its generated commission is in the current view, it's already merged.
                if (geradas.some(g => g.id === l.referencia_id)) {
                    return;
                }
            }

            combined.push({
                _id: l.id,
                _type: l.tipo === 'pagamento' ? 'payment_record' : 'adjustment',
                date: l.created_at,
                vendedor_nome: l.vendedor_nome,
                vendedor_email: l.vendedor_email,
                cliente_nome: '',
                pedido_cod: '',
                tipo_lancamento: l.tipo,
                desc: l.tipo === 'pagamento' ? 'PAGAMENTO DE COMISSÃO' : (l.tipo === 'ajuste_positivo' ? 'AJUSTE (+) ' : 'AJUSTE (-) ') + l.descricao,
                valor: l.tipo === 'ajuste_negativo' ? -Math.abs(l.valor) : Math.abs(l.valor),
                status: l.tipo === 'pagamento' ? 'PAGO' : 'LANÇADO',
                paymentInfo: null
            });
        });

        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [geradas, lancamentos]);

    const clienteOptions = useMemo(() => {
        const unique: string[] = Array.from(new Set(rows.map(r => String(r.cliente_nome)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(c => ({ label: c, value: c })).sort((a, b) => (a.label as string).localeCompare(b.label as string));
    }, [rows]);

    const pedidoOptions = useMemo(() => {
        const unique: string[] = Array.from(new Set(rows.map(r => String(r.pedido_cod)).filter(v => !!v && v !== 'undefined' && v !== 'null')));
        return unique.map(p => ({ label: p, value: p })).sort((a, b) => (a.label as string).localeCompare(b.label as string));
    }, [rows]);

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            const matchCliente = clienteFilter.length === 0 || clienteFilter.includes(r.cliente_nome);
            const matchPedido = pedidoFilter.length === 0 || pedidoFilter.includes(r.pedido_cod);

            let matchTipo = true;
            if (tipoFilter === 'contratacao') matchTipo = r.tipo_lancamento === 'contratacao';
            if (tipoFilter === 'bonus_cliente_novo') matchTipo = r.tipo_lancamento === 'bonus_cliente_novo';
            if (tipoFilter === 'desconto_reemplazo') matchTipo = r.tipo_lancamento === 'desconto_reemplazo';
            if (tipoFilter === 'ajuste') matchTipo = r.tipo_lancamento === 'ajuste_positivo' || r.tipo_lancamento === 'ajuste_negativo' || r.tipo_lancamento === 'pagamento' || r.status === 'PAGO';

            return matchCliente && matchPedido && matchTipo;
        });
    }, [rows, clienteFilter, pedidoFilter, tipoFilter]);

    // Financial calculations
    const calc = useMemo(() => {
        let totalReceber = 0;
        let totalPago = 0;
        let totalAjustes = 0;

        filteredRows.forEach(r => {
            if (r._type === 'generated') {
                if (r.status === 'PENDENTE') {
                    totalReceber += r.valor;
                } else {
                    totalPago += r.valor;
                }
            } else if (r._type === 'adjustment') {
                totalAjustes += r.valor;
                // Adjustments generally affect the final payable amount, 
                // so we add them to 'totalReceber' to represent the total debt to the seller
                totalReceber += r.valor;
            } else if (r._type === 'payment_record') {
                totalPago += Math.abs(r.valor);
                // Disconnected payments don't affect totalReceber in this view because 
                // the corresponding 'generated' debt is not in the filtered rows.
            }
        });

        return { totalReceber, totalPago, totalAjustes };
    }, [filteredRows]);

    const handleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allPayable = filteredRows.filter(r => r._type === 'generated' && r.status === 'PENDENTE').map(r => r._id);
            setSelectedIds(new Set(allPayable));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handlePaySelected = async () => {
        if (selectedIds.size === 0 || !user) return;
        if (!window.confirm(t('comissoes.messages.confirm_pay', { count: selectedIds.size }))) return;

        try {
            const paymentsToMake = rows
                .filter(r => selectedIds.has(r._id))
                .map(r => ({
                    id: r._id,
                    email: r.vendedor_email,
                    name: r.vendedor_nome,
                    mes_referencia: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                    valor: r.valor
                }));

            await commissionService.registerPayments(paymentsToMake, user.id);
            alert(t('comissoes.messages.pay_success'));
            loadData(); // Reload
        } catch (error) {
            console.error('Error paying:', error);
            alert(t('comissoes.messages.pay_error'));
        }
    };

    const handleRevertPayment = async (lancamentoId: string) => {
        if (!user) return;
        if (!window.confirm(t('comissoes.messages.confirm_revert') || 'Tem certeza que deseja reverter este pagamento/ajuste?')) return;

        try {
            await commissionService.deleteLancamento(lancamentoId);
            alert(t('comissoes.messages.revert_success') || 'Lançamento revertido com sucesso!');
            loadData();
        } catch (error) {
            console.error('Error reverting payment:', error);
            alert(t('comissoes.messages.revert_error') || 'Erro ao reverter o lançamento.');
        }
    };

    const handleSaveAdjustment = async () => {
        if (!user) return;
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
            alert(t('comissoes.messages.save_error'));
        }
    };

    const exportToExcel = () => {
        const dataToExport = filteredRows.map(r => ({
            'Data': new Date(r.date).toLocaleDateString(),
            'Vendedor': r.vendedor_nome,
            'Cliente': r.cliente_nome || '-',
            'Pedido': r.pedido_cod || '-',
            'Tipo Lançamento': r.tipo_lancamento,
            'Histórico': r.desc,
            'Valor (€)': r.valor,
            'Status': r.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comissoes");
        XLSX.writeFile(workbook, `Comissoes_${startDate}_a_${endDate}.xlsx`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
            <div className="flex flex-col md:flex-row justify-between break-words gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('comissoes.title')}</h1>
                    <p className="text-slate-500 text-sm">{t('comissoes.subtitle')}</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border dark:border-slate-700 px-3 py-1.5 rounded-lg flex-shrink-0">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">{t('comissoes.filters.start_date') || 'Início'}:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm dark:text-white"
                        />
                        <span className="text-xs text-slate-500 font-medium ml-2">{t('comissoes.filters.end_date') || 'Fim'}:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm dark:text-white"
                        />
                    </div>
                    {isSupervisor && (
                        <select
                            value={vendedorFilter}
                            onChange={e => setVendedorFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-3 py-2 text-sm rounded-lg outline-none max-w-xs"
                        >
                            <option value="">{t('comissoes.filters.all_sellers')}</option>
                            {allSellers.map(s => (
                                <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-500 hidden sm:block">{t('comissoes.filters.label')}</span>
                <div className="w-full sm:w-64 max-w-full">
                    <MultiSelect
                        options={clienteOptions}
                        selectedValues={clienteFilter}
                        onChange={setClienteFilter}
                        placeholder={t('comissoes.filters.client_placeholder') || 'Filtrar por Cliente...'}
                        searchPlaceholder="Buscar cliente..."
                    />
                </div>
                <div className="w-full sm:w-64 max-w-full">
                    <MultiSelect
                        options={pedidoOptions}
                        selectedValues={pedidoFilter}
                        onChange={setPedidoFilter}
                        placeholder={t('comissoes.filters.order_placeholder') || 'Pedido (PO-...)'}
                        searchPlaceholder="Buscar pedido..."
                    />
                </div>
                <select
                    value={tipoFilter}
                    onChange={e => setTipoFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm rounded-lg outline-none w-full sm:w-auto text-slate-700 dark:text-slate-300"
                >
                    <option value="">{t('comissoes.filters.all_entries')}</option>
                    <option value="contratacao">{t('comissoes.filters.type_hire')}</option>
                    <option value="bonus_cliente_novo">{t('comissoes.filters.type_bonus')}</option>
                    <option value="desconto_reemplazo">{t('comissoes.filters.type_discount')}</option>
                    <option value="ajuste">{t('comissoes.filters.type_adjust')}</option>
                </select>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Wallet size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">{t('comissoes.cards.to_receive')}</span>
                    </div>
                    <div className={`text-2xl font-bold ${calc.totalReceber < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                        € {calc.totalReceber.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <DollarSign size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">{t('comissoes.cards.total_paid')}</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        € {calc.totalPago.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <ArrowDownCircle size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">{t('comissoes.cards.adjustments')}</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-500">
                        € {calc.totalAjustes.toFixed(2)}
                    </div>
                </div>
                {/* Settings Block Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <Info size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">{t('comissoes.cards.rules')}</span>
                    </div>
                    <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                        <div>{t('comissoes.rules.base')}: <b>€ {settings?.comissao_base || 0}</b></div>
                        <div>{t('comissoes.rules.new_client')}: <b>€ {settings?.bonus_novo_cliente || 0}</b></div>
                        <div>{t('comissoes.rules.grace_period')}: <b>{settings?.carencia_dias || 0} {t('comissoes.rules.days')}</b></div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="font-semibold">{t('comissoes.table.title')}</h2>
                    {isSupervisor && (
                        <div className="flex gap-2">
                            <button
                                onClick={exportToExcel}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-800 dark:border-slate-600 rounded bg-slate-800 dark:bg-slate-900 text-white hover:bg-slate-700 transition-colors flex items-center gap-1"
                            >
                                <Download size={14} /> {t('comissoes.table.btn_export') || 'Exportar Excel'}
                            </button>
                            <button
                                onClick={() => setIsAdjustmentModalOpen(true)}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
                            >
                                <PlusCircle size={14} /> {t('comissoes.table.btn_extra')}
                            </button>
                            <button
                                onClick={handlePaySelected}
                                disabled={selectedIds.size === 0}
                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${selectedIds.size > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {t('comissoes.table.btn_pay')} ({selectedIds.size})
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Carregando...</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {isSupervisor && (
                                        <th className="px-4 py-3 text-center w-12">
                                            <input type="checkbox" onChange={handleSelectAll} className="rounded" />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{t('comissoes.table.col_date')}</th>
                                    {(!vendedorFilter && isSupervisor) && <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{t('comissoes.table.col_seller')}</th>}
                                    <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{t('comissoes.table.col_history')}</th>
                                    <th className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 font-semibold">{t('comissoes.table.col_value')}</th>
                                    <th className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 font-semibold">{t('comissoes.table.col_status')}</th>
                                    <th className="py-3 px-4 text-left font-medium w-12 rounded-tr-lg"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">{t('comissoes.table.empty')}</td>
                                    </tr>
                                ) : (
                                    filteredRows.map(row => {
                                        const isPayable = row._type === 'generated' && row.status === 'PENDENTE';
                                        return (
                                            <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                                {isSupervisor && (
                                                    <td className="px-4 py-3 text-center">
                                                        {isPayable && (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(row._id)}
                                                                onChange={() => handleSelectRow(row._id)}
                                                                className="rounded"
                                                            />
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {new Date(row.date).toLocaleDateString()}
                                                </td>
                                                {(!vendedorFilter && isSupervisor) && (
                                                    <td className="px-4 py-3 font-medium">
                                                        {row.vendedor_nome}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    {row.desc}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-medium ${row.valor > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {row.valor > 0 ? '+' : ''}{row.valor.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${row.status === 'PAGO'
                                                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                                                        : row.status === 'PENDENTE'
                                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                                                            : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                                        }`}>
                                                        {row.status}
                                                    </span>
                                                    {row.paymentInfo && (
                                                        <div className="text-[10px] text-slate-400 mt-1" title={row.paymentInfo.created_at}>
                                                            {t('comissoes.table.paid_on')} {new Date(row.paymentInfo.created_at).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 w-12">
                                                    {isSupervisor && (
                                                        <>
                                                            {(row._type === 'payment_record' || row._type === 'adjustment') && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRevertPayment(row._id); }}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    title="Reverter/Excluir Lançamento"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                            {(row._type === 'generated' && row.status === 'PAGO' && row.paymentInfo) && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRevertPayment(row.paymentInfo!.id); }}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    title="Reverter Pagamento"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal for Manual Adjustment */}
            {isAdjustmentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl border dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4">{t('comissoes.modal.title')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('comissoes.modal.table_label')}</label>
                                <select
                                    value={adjForm.tipo}
                                    onChange={e => setAdjForm({ ...adjForm, tipo: e.target.value })}
                                    className="w-full border dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="ajuste_positivo">{t('comissoes.modal.type_pos')}</option>
                                    <option value="ajuste_negativo">{t('comissoes.modal.type_neg')}</option>
                                    <option value="pagamento">{t('comissoes.modal.type_pay')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('comissoes.modal.seller_label')}</label>
                                <select
                                    value={adjForm.email}
                                    onChange={e => {
                                        const name = allSellers.find(s => s.email === e.target.value)?.name || '';
                                        setAdjForm({ ...adjForm, email: e.target.value, name });
                                    }}
                                    className="w-full border dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="">{t('comissoes.modal.seller_placeholder')}</option>
                                    {allSellers.map(s => <option key={s.email} value={s.email}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('comissoes.modal.desc_label')}</label>
                                <input
                                    type="text"
                                    placeholder={t('comissoes.modal.desc_placeholder')}
                                    value={adjForm.descricao}
                                    onChange={e => setAdjForm({ ...adjForm, descricao: e.target.value })}
                                    className="w-full border dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('comissoes.modal.value_label')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={adjForm.valor}
                                    onChange={e => setAdjForm({ ...adjForm, valor: e.target.value })}
                                    className="w-full border dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-1">{t('comissoes.modal.value_hint')}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAdjustmentModalOpen(false)}
                                className="px-4 py-2 border dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                {t('comissoes.modal.btn_cancel')}
                            </button>
                            <button
                                onClick={handleSaveAdjustment}
                                disabled={!adjForm.email || !adjForm.valor}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {t('comissoes.modal.btn_save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
