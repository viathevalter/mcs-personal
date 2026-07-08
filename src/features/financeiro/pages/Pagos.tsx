import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Filter, Eye, CheckSquare, Square, Plus, Wallet, Landmark, CreditCard, Banknote, Trash2, CalendarDays, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fetchContasPagar, createContaPagar, deleteContaPagar, savePagamento, savePagamentoLote } from '../data/loader';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

const ALL_STATUSES = ['A vencer', 'Pago', 'Parcial', 'Vencido'];

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'A vencer': return 'A Vencer';
        case 'Pago': return 'Pago';
        case 'Parcial': return 'Parcial';
        case 'Vencido': return 'Vencido';
        default: return status;
    }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status) {
        case 'Pago': return 'default'; // Success green in standard config
        case 'Vencido': return 'destructive';
        case 'Parcial': return 'outline'; // Warning color
        case 'A vencer': return 'secondary';
        default: return 'outline';
    }
};

export const Pagos = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    // Grid State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    // Filter State
    const [filterFornecedor, setFilterFornecedor] = useState('');
    const [filterObra, setFilterObra] = useState('');

    // Modal state for manual creation
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [empresaId, setEmpresaId] = useState('');
    const [fornecedorId, setFornecedorId] = useState('');
    const [obraId, setObraId] = useState('');
    const [valorTotal, setValorTotal] = useState('');
    const [dataEmissao, setDataEmissao] = useState('');
    const [dtVenc, setDtVenc] = useState('');
    const [numDoc, setNumDoc] = useState('');
    const [anexoUrl, setAnexoUrl] = useState('');

    // Modal state for Single Payment
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payingItem, setPayingItem] = useState<any>(null);
    const [payValor, setPayValor] = useState('');
    const [payDate, setPayDate] = useState('');
    const [payForm, setPayForm] = useState('Transferência Bancária');
    const [payBank, setPayBank] = useState('');

    // Modal state for Batch Payment
    const [isBatchPayOpen, setIsBatchPayOpen] = useState(false);
    const [batchDate, setBatchDate] = useState('');
    const [batchForm, setBatchForm] = useState('Transferência Bancária');
    const [batchBank, setBatchBank] = useState('');

    // Queries
    const { data: payables, isLoading } = useQuery({
        queryKey: ['contas_pagar'],
        queryFn: fetchContasPagar
    });

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers_list'],
        queryFn: async () => {
            const { data, error } = await supabase.schema('core_common').from('suppliers').select('*').eq('status', 'active').order('trade_name');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: companies } = useQuery({
        queryKey: ['companies_list'],
        queryFn: async () => {
            const { data, error } = await supabase.schema('core_common').from('empresas').select('*').eq('is_active', true).order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: obras } = useQuery({
        queryKey: ['obras_list'],
        queryFn: async () => {
            const { data, error } = await supabase.from('obras').select('*').order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: banks } = useQuery({
        queryKey: ['banks_list'],
        queryFn: async () => {
            const { data, error } = await supabase.from('bancos').select('*').order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    // Selections
    const toggleSelection = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (paginatedData.length === 0) return;
        if (selectedItems.length === paginatedData.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(paginatedData.map(item => item.id));
        }
    };

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
        setCurrentPage(1);
    };

    const clearStatusFilter = () => {
        setSelectedStatuses([]);
        setIsStatusDropdownOpen(false);
        setCurrentPage(1);
    };

    // Filter Logic
    const filteredPayables = (payables || []).filter(item => {
        // Status filter
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.Status)) return false;

        // Search text filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const provedor = (item.Provedor || '').toLowerCase();
            const empresa = (item.Empresa || '').toLowerCase();
            const doc = (item.Num_doc || '').toLowerCase();
            const tag = (item.prev_pag || '').toLowerCase();
            if (!provedor.includes(term) && !empresa.includes(term) && !doc.includes(term) && !tag.includes(term)) return false;
        }

        // Supplier filter
        if (filterFornecedor && item.CodProvedor !== filterFornecedor) return false;

        // CC Obra filter
        if (filterObra && item.Obra !== filterObra) return false;

        return true;
    });

    // KPIs Calculations
    const todayStr = new Date().toISOString().split('T')[0];
    const kpis = (payables || []).reduce((acc, item) => {
        const valTotal = Number(item.Valor_total) || 0;
        const saldo = Number(item.saldo_a_pagar) !== undefined ? Number(item.saldo_a_pagar) : valTotal;
        const status = item.Status;

        if (status === 'Pago') {
            acc.pago += valTotal;
        } else {
            acc.pendente += saldo;

            // Check if overdue or today
            if (item.Dt_venc) {
                try {
                    const dueTime = new Date(item.Dt_venc).getTime();
                    const todayTime = new Date(todayStr).getTime();
                    if (dueTime < todayTime) {
                        acc.vencido += saldo;
                    } else if (dueTime === todayTime) {
                        acc.vencendoHoje += saldo;
                    }
                } catch(e){}
            }
        }
        return acc;
    }, { pendente: 0, pago: 0, vencido: 0, vencendoHoje: 0 });

    const totalPages = Math.ceil(filteredPayables.length / itemsPerPage);
    const paginatedData = filteredPayables.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async () => {
            const selectedComp = companies?.find(c => c.id === empresaId);
            const selectedSupp = suppliers?.find(s => s.id === fornecedorId);
            const selectedObra = obras?.find(o => o.id === obraId);

            const payload = {
                Empresa: selectedComp?.nome || '',
                CodProvedor: selectedSupp?.codigo || '',
                Provedor: selectedSupp?.trade_name || '',
                Obra: selectedObra?.nome || '',
                Num_doc: numDoc,
                Data_emissao: dataEmissao ? new Date(dataEmissao) : null,
                Dt_venc: dtVenc ? new Date(dtVenc) : null,
                Valor_total: Number(valorTotal) || 0,
                Saldo_a_pagar: Number(valorTotal) || 0,
                Status: 'A vencer',
                categoria_id: selectedSupp?.supplier_type ? undefined : undefined,
                obra_id: obraId,
                anexo_url: anexoUrl
            };
            return createContaPagar(payload);
        },
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Conta a pagar criada manualmente!");
                setIsCreateOpen(false);
                setEmpresaId('');
                setFornecedorId('');
                setObraId('');
                setValorTotal('');
                setDataEmissao('');
                setDtVenc('');
                setNumDoc('');
                setAnexoUrl('');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error("Falha ao cadastrar conta.");
            }
        }
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            if (!payingItem) return;
            const payload = {
                conta_pagar_id: payingItem.id,
                valor: Number(payValor) || 0,
                data_pagamento: payDate || new Date().toISOString().split('T')[0],
                forma_pagamento: payForm,
                tipo_pagamento: Number(payValor) >= payingItem.saldo_a_pagar ? 'Total' : 'Parcial',
                banco_id: payBank || null,
                criado_por: user?.email || 'sistema'
            };
            return savePagamento(payload);
        },
        onSuccess: (res) => {
            if (res?.success) {
                toast.success("Pagamento lançado com sucesso!");
                setIsPayOpen(false);
                setPayingItem(null);
                setPayValor('');
                setPayDate('');
                setPayBank('');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error("Erro ao registrar pagamento.");
            }
        }
    });

    const batchPayMutation = useMutation({
        mutationFn: async () => {
            if (selectedItems.length === 0) return;
            return savePagamentoLote(
                selectedItems,
                batchBank,
                batchDate || new Date().toISOString().split('T')[0],
                batchForm,
                user?.email || 'sistema'
            );
        },
        onSuccess: (res) => {
            if (res?.success) {
                toast.success(`Liquidação em lote efetuada para ${selectedItems.length} registros!`);
                setIsBatchPayOpen(false);
                setSelectedItems([]);
                setBatchBank('');
                setBatchDate('');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error("Erro ao efetuar o pagamento em lote.");
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return deleteContaPagar(id);
        },
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Título a pagar excluído!");
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error("Erro ao excluir título.");
            }
        }
    });

    return (
        <div className="h-full flex flex-col p-6 space-y-6 max-w-7xl mx-auto bg-transparent">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Contas a Pagar (Pagos)</h2>
                        <p className="text-muted-foreground mt-1">Gerencie os títulos a pagar da empresa e liquidações bancárias.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedItems.length > 0 && (
                            <Button onClick={() => setIsBatchPayOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-4 font-bold shadow-lg shadow-emerald-600/10">
                                Pagar em Lote ({selectedItems.length})
                            </Button>
                        )}
                        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 font-semibold transition-all">
                            <Plus size={18} /> Novo Lançamento
                        </Button>
                    </div>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Card className="border-l-4 border-l-blue-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">A Pagar Pendente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-blue-650 dark:text-blue-400">{formatCurrency(kpis.pendente)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago Acumulado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.pago)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Vencido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-650 dark:text-red-400">{formatCurrency(kpis.vencido)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencendo Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(kpis.vencendoHoje)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por fornecedor, empresa, doc ou tag..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-850 dark:text-slate-100"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                        <select 
                            className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-650"
                            value={filterFornecedor}
                            onChange={e => { setFilterFornecedor(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">Todos Fornecedores</option>
                            {suppliers?.map(s => (
                                <option key={s.id} value={s.codigo}>{s.trade_name}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-650"
                            value={filterObra}
                            onChange={e => { setFilterObra(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">Todas Obras / CC</option>
                            {obras?.map(o => (
                                <option key={o.id} value={o.nome}>{o.nome}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <Button variant="outline" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} className="flex items-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl py-2 px-3 text-xs text-slate-600">
                                <Filter size={14} /> Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
                            </Button>
                            {isStatusDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-2">
                                    <div className="flex justify-between items-center px-2 py-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                                        {selectedStatuses.length > 0 && <button onClick={clearStatusFilter} className="text-[10px] text-red-600 font-bold">Limpar</button>}
                                    </div>
                                    <div className="space-y-1">
                                        {ALL_STATUSES.map(status => (
                                            <button key={status} onClick={() => toggleStatus(status)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                                                {selectedStatuses.includes(status) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-slate-400" />}
                                                {getStatusLabel(status)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Card */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 rounded-2xl mt-4">
                <CardContent className="p-0 overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <TableRow>
                                <TableHead className="px-6 w-12">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                        checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                                        onChange={toggleAll}
                                    />
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Doc / Registro</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Fornecedor</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Obra / Centro Custo</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Vencimento</TableHead>
                                <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Total</TableHead>
                                <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Saldo Restante</TableHead>
                                <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-center px-6 text-slate-500 font-bold text-xs uppercase tracking-wider">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">Carregando contas a pagar...</TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? paginatedData.map((item) => (
                                <TableRow key={item.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30">
                                    <TableCell className="px-6">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => toggleSelection(item.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.Num_doc || 'Lançamento Manual'}</div>
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.prev_pag || 'Manual'}</span>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-350">{item.Provedor}</TableCell>
                                    <TableCell className="text-slate-650 dark:text-slate-400">{item.Obra}</TableCell>
                                    <TableCell className="text-slate-650 dark:text-slate-400">{formatDate(item.Dt_venc)}</TableCell>
                                    <TableCell className="text-right font-medium text-slate-800 dark:text-slate-300">{formatCurrency(item.Valor_total)}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.saldo_a_pagar)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusVariant(item.Status)} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                            {getStatusLabel(item.Status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center px-6">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {item.Status !== 'Pago' && (
                                                <Button 
                                                    onClick={() => {
                                                        setPayingItem(item);
                                                        setPayValor(item.saldo_a_pagar.toString());
                                                        setIsPayOpen(true);
                                                    }}
                                                    size="xs" 
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold py-1 px-2.5"
                                                >
                                                    Pagar
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    if(confirm("Deseja realmente excluir este título a pagar?")) {
                                                        deleteMutation.mutate(item.id);
                                                    }
                                                }}
                                                className="text-slate-400 hover:text-red-600 rounded-xl"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2 py-6">
                                            <ClipboardList size={36} className="opacity-20 text-slate-400" />
                                            <p className="font-medium">Nenhum título a pagar encontrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Mostrando <span className="font-semibold text-slate-800 dark:text-slate-200">{paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> até <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, filteredPayables.length)}</span> de <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredPayables.length}</span> resultados
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl border-slate-200">
                            <ChevronLeft size={16} />
                        </Button>
                        <div className="px-4 py-1.5 bg-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Página {currentPage} de {totalPages || 1}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="rounded-xl border-slate-200">
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Novo Registro Manual Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="border-b pb-4 mb-4 border-slate-100 dark:border-slate-850">
                        <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Registrar Conta a Pagar</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Empresa Devedora <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={empresaId}
                                    onChange={e => setEmpresaId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione a Empresa</option>
                                    {companies?.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fornecedor / Credor <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={fornecedorId}
                                    onChange={e => setFornecedorId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione o Fornecedor</option>
                                    {suppliers?.map(s => (
                                        <option key={s.id} value={s.id}>{s.trade_name} ({s.codigo})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor do Título (€) <span className="text-red-500">*</span></label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={valorTotal}
                                    onChange={e => setValorTotal(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vencimento <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={dtVenc}
                                    onChange={e => setDtVenc(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Emissão</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={dataEmissao}
                                    onChange={e => setDataEmissao(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Centro de Custo / Obra <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={obraId}
                                    onChange={e => setObraId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione a Obra</option>
                                    {obras?.map(o => (
                                        <option key={o.id} value={o.id}>{o.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Doc / N° Fatura</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    placeholder="Ex: FT-0012/26"
                                    value={numDoc}
                                    onChange={e => setNumDoc(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link Anexo URL</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                placeholder="http://..."
                                value={anexoUrl}
                                onChange={e => setAnexoUrl(e.target.value)}
                            />
                        </div>

                        <DialogFooter className="border-t pt-4 border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-755 text-white rounded-xl font-bold">
                                {createMutation.isPending ? "Cadastrando..." : "Confirmar Lançamento"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Individual Payment Modal */}
            <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="border-b pb-3 mb-3 border-slate-100 dark:border-slate-850">
                        <DialogTitle className="text-lg font-extrabold text-slate-850 dark:text-slate-150">Confirmar Liquidação Bancária</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }} className="space-y-4">
                        {payingItem && (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-xs space-y-1.5">
                                <div><span className="text-slate-400 font-semibold">Título:</span> {payingItem.Num_doc || 'Lançamento Manual'}</div>
                                <div><span className="text-slate-400 font-semibold">Credor:</span> {payingItem.Provedor}</div>
                                <div><span className="text-slate-400 font-semibold">Saldo Pendente:</span> <span className="font-bold text-red-600">{formatCurrency(payingItem.saldo_a_pagar)}</span></div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Pago (€) <span className="text-red-500">*</span></label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payValor}
                                    onChange={e => setPayValor(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data do Pagamento <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payDate}
                                    onChange={e => setPayDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conta Caixa/Banco <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payBank}
                                    onChange={e => setPayBank(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione o Banco</option>
                                    {banks?.map(b => (
                                        <option key={b.id} value={b.id}>{b.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payForm}
                                    onChange={e => setPayForm(e.target.value)}
                                >
                                    <option value="Transferência Bancária">Transferência Bancária</option>
                                    <option value="Débito Direto">Débito Direto</option>
                                    <option value="Dinheiro">Dinheiro/Espécie</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={payMutation.isPending} className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl font-bold">
                                {payMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Batch Payment Modal */}
            <Dialog open={isBatchPayOpen} onOpenChange={setIsBatchPayOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="border-b pb-3 mb-3 border-slate-100 dark:border-slate-850">
                        <DialogTitle className="text-lg font-extrabold text-slate-850 dark:text-slate-150">Pagamento em Lote ({selectedItems.length} títulos)</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); batchPayMutation.mutate(); }} className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-xs space-y-1.5">
                            <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Títulos Selecionados para Liquidação</div>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-2">
                                {selectedItems.map(id => {
                                    const itemObj = payables?.find(p => p.id === id);
                                    return (
                                        <div key={id} className="flex justify-between font-medium">
                                            <span>{itemObj?.Num_doc || 'Lançamento'} ({itemObj?.Provedor})</span>
                                            <span className="font-bold text-red-650">{formatCurrency(itemObj?.saldo_a_pagar || 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-extrabold text-slate-800 dark:text-slate-200">
                                <span>TOTAL A LIQUIDAR:</span>
                                <span className="text-blue-600">{formatCurrency(
                                    selectedItems.reduce((sum, id) => sum + (payables?.find(p => p.id === id)?.saldo_a_pagar || 0), 0)
                                )}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conta Caixa/Banco <span className="text-red-500">*</span></label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                value={batchBank}
                                onChange={e => setBatchBank(e.target.value)}
                                required
                            >
                                <option value="">Selecione o Banco</option>
                                {banks?.map(b => (
                                    <option key={b.id} value={b.id}>{b.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data do Lote <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={batchDate}
                                    onChange={e => setBatchDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Liquidação</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={batchForm}
                                    onChange={e => setBatchForm(e.target.value)}
                                >
                                    <option value="Transferência Bancária">Transferência Bancária</option>
                                    <option value="Débito Direto">Débito Direto</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsBatchPayOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={batchPayMutation.isPending} className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl font-bold">
                                {batchPayMutation.isPending ? "Processando Lote..." : "Liquiditar Lote"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
