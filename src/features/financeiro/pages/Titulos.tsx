import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Filter, Eye, CheckSquare, Square, Plus, Trash2, X, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createOrdemPagamento } from '../data/loader';
import { toast } from 'sonner';

const ALL_STATUSES = ['rascunho', 'aguardando_aprovacao', 'aprovado', 'pago', 'rejeitado'];

const getStatusLabel = (status: string) => {
    switch(status) {
        case 'rascunho': return 'Rascunho';
        case 'aguardando_aprovacao': return 'Aguardando Aprovação';
        case 'aprovado': return 'Aprovado';
        case 'pago': return 'Pago';
        case 'rejeitado': return 'Rejeitado';
        default: return status;
    }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status) {
        case 'pago': return 'default'; // Success green in standard config
        case 'rejeitado': return 'destructive';
        case 'aguardando_aprovacao': return 'secondary';
        case 'aprovado': return 'outline';
        case 'rascunho': return 'secondary';
        default: return 'outline';
    }
};

interface FormItem {
    categoria_orden: string;
    valor_orden: string;
    vencimento_orden: string;
    obra_id: string;
    centro_custo: string;
    otros_gastos: string;
}

export const Titulos = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Form Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [descricao, setDescricao] = useState('');
    const [empresaId, setEmpresaId] = useState('');
    const [fornecedorId, setFornecedorId] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [anexoUrl, setAnexoUrl] = useState('');
    const [formItens, setFormItens] = useState<FormItem[]>([
        { categoria_orden: 'Aluguel', valor_orden: '', vencimento_orden: '', obra_id: '', centro_custo: '', outros_gastos: '' }
    ]);

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

    // Fetch suppliers, companies, and works for the dropdowns
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

    // Fetch ordens de pagamento from core_finance
    const { data: ordens, isLoading } = useQuery({
        queryKey: ['ordens_pagamento'],
        queryFn: async () => {
            const { data: ordensData, error } = await supabase.schema('core_finance').from('ordens_pagamento').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return ordensData || [];
        }
    });

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

    const localFilteredData = (ordens || []).filter(item => {
        // Status filter
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
        
        // Search filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            const desc = (item.descricao || '').toLowerCase();
            const code = (item.cod_orden_pago || '').toLowerCase();
            if (!desc.includes(lowerTerm) && !code.includes(lowerTerm)) return false;
        }
        return true;
    });

    const kpis = localFilteredData.reduce((acc, item) => {
        acc.count += 1;
        acc.totalValue += Number(item.valor) || 0;
        switch (item.status) {
            case 'pago': acc.pago += Number(item.valor) || 0; break;
            case 'aguardando_aprovacao': acc.aguardando += Number(item.valor) || 0; break;
            case 'aprovado': acc.aprovado += Number(item.valor) || 0; break;
            case 'rascunho': acc.rascunho += Number(item.valor) || 0; break;
        }
        return acc;
    }, { count: 0, totalValue: 0, pago: 0, aguardando: 0, aprovado: 0, rascunho: 0 });

    const totalPages = Math.ceil(localFilteredData.length / itemsPerPage);
    const paginatedData = localFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Form Handling Functions
    const addFormItem = () => {
        setFormItens(prev => [...prev, { categoria_orden: 'Aluguel', valor_orden: '', vencimento_orden: '', obra_id: '', centro_custo: '', outros_gastos: '' }]);
    };

    const removeFormItem = (index: number) => {
        if (formItens.length === 1) return;
        setFormItens(prev => prev.filter((_, idx) => idx !== index));
    };

    const updateFormItem = (index: number, field: keyof FormItem, value: string) => {
        setFormItens(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            
            const updated = { ...item, [field]: value };
            // If Obra is updated, auto-set centro_custo from name of selected work
            if (field === 'obra_id') {
                const selectedObra = obras?.find(o => o.id === value);
                if (selectedObra) {
                    updated.centro_custo = selectedObra.nome;
                }
            }
            return updated;
        }));
    };

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error("Usuário não autenticado");

            // Calculate total sum
            const totalSum = formItens.reduce((sum, item) => sum + (Number(item.valor_orden) || 0), 0);
            
            const selectedSupplier = suppliers?.find(s => s.id === fornecedorId);
            const supplierCode = selectedSupplier?.codigo || '';

            const header = {
                descricao,
                fornecedor_id: fornecedorId || null,
                cod_provedor: supplierCode,
                valor: totalSum,
                data_vencimento: formItens[0]?.vencimento_orden || new Date().toISOString().split('T')[0],
                status: 'rascunho' as const,
                criador_id: userData.user.id,
                id_empresa: empresaId,
                observaciones,
                anexos: anexoUrl,
                tipo_orden: formItens[0]?.categoria_orden || 'Outros'
            };

            const items = formItens.map(item => ({
                cod_provedor: supplierCode,
                cod_contrato: '',
                cod_alojamiento: '',
                cod_cliente: item.obra_id, // link to Obra ID
                categoria_orden: item.categoria_orden,
                id_empresa: empresaId,
                tipo_origem: 'Manual',
                valor_orden: Number(item.valor_orden) || 0,
                vencimento_orden: item.vencimento_orden,
                centro_custo: item.centro_custo,
                otros_gastos: item.outros_gastos
            }));

            return createOrdemPagamento(header, items);
        },
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Ordem de pagamento criada com sucesso!");
                setIsCreateOpen(false);
                setDescricao('');
                setEmpresaId('');
                setFornecedorId('');
                setObservacoes('');
                setAnexoUrl('');
                setFormItens([{ categoria_orden: 'Aluguel', valor_orden: '', vencimento_orden: '', obra_id: '', centro_custo: '', outros_gastos: '' }]);
                queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            } else {
                toast.error(`Falha ao criar ordem: ${res.error?.message || 'Erro desconhecido'}`);
            }
        },
        onError: (err: any) => {
            toast.error(`Erro ao criar ordem de pagamento: ${err.message}`);
        }
    });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao || !empresaId || !fornecedorId) {
            toast.warning("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        for (const item of formItens) {
            if (!item.valor_orden || !item.vencimento_orden || !item.obra_id) {
                toast.warning("Por favor, preencha valor, vencimento e obra em todos os itens.");
                return;
            }
        }
        createMutation.mutate();
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 max-w-7xl mx-auto bg-slate-50/30">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Ordens de Pagamento</h2>
                        <p className="text-muted-foreground mt-1">Gerencie pagamentos e aprovações (Maker-Checker).</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 font-semibold transition-all">
                        <Plus size={18} /> Nova Ordem
                    </Button>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    <Card className="rounded-2xl border-slate-100 shadow-sm bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ordens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpis.count}</div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-slate-100 shadow-sm bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCompactCurrency(kpis.totalValue)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-slate-400 rounded-2xl border-slate-100 shadow-sm bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rascunho</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{formatCompactCurrency(kpis.rascunho)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500 rounded-2xl border-slate-100 shadow-sm bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Aprovação</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCompactCurrency(kpis.aguardando)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 rounded-2xl border-slate-100 shadow-sm bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCompactCurrency(kpis.pago)}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 shadow-sm mt-4">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por descrição ou código (ex: OP-0001)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-slate-800 dark:text-slate-100"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="relative">
                        <Button
                            variant="outline"
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 rounded-xl py-2 px-4 text-slate-600"
                        >
                            <Filter size={16} /> Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
                        </Button>

                        {isStatusDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-2">
                                <div className="flex justify-between items-center px-2 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-semibold text-slate-400">Filtrar Status</span>
                                    {selectedStatuses.length > 0 && (
                                        <button onClick={clearStatusFilter} className="text-xs text-red-600 hover:text-red-500 font-medium">Limpar</button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {ALL_STATUSES.map(status => (
                                        <button key={status} onClick={() => toggleStatus(status)} className="w-full flex items-center gap-3 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm text-slate-700 dark:text-slate-300">
                                            {selectedStatuses.includes(status) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
                                            {getStatusLabel(status)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-slate-100 shadow-sm bg-white dark:bg-slate-950 rounded-2xl">
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
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Código</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Descrição</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Fornecedor</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Vencimento</TableHead>
                                <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Valor</TableHead>
                                <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-center px-6 text-slate-500 font-bold text-xs uppercase tracking-wider">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">Carregando ordens...</TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? paginatedData.map((item) => {
                                const supplierName = suppliers?.find(s => s.codigo === item.cod_provedor || s.id === item.fornecedor_id)?.trade_name || item.cod_provedor || 'Não informado';
                                return (
                                    <TableRow key={item.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30">
                                        <TableCell className="px-6">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-700 dark:text-slate-300">{item.cod_orden_pago || 'Pendente'}</TableCell>
                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">{item.descricao}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{supplierName}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{formatDate(item.data_vencimento)}</TableCell>
                                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.valor)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusVariant(item.status)} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                                                {getStatusLabel(item.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center px-6">
                                            <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 transition-colors">
                                                <Link to={`/financeiro/titulos/${item.id}`} className="text-slate-400 hover:text-blue-600">
                                                    <Eye size={18} />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2 py-6">
                                            <Filter size={36} className="opacity-20 text-slate-400" />
                                            <p className="font-medium">Nenhuma ordem de pagamento encontrada.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Mostrando <span className="font-semibold text-slate-800 dark:text-slate-200">{paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> até <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, localFilteredData.length)}</span> de <span className="font-semibold text-slate-800 dark:text-slate-200">{localFilteredData.length}</span> resultados
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

            {/* Nova Ordem Dialog Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="flex flex-row justify-between items-center border-b pb-4 mb-4 border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Nova Ordem de Pagamento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição Principal <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="Ex: Pagamento Aluguel Logística Julho"
                                    value={descricao}
                                    onChange={e => setDescricao(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
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
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações Internas</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="Informações adicionais para o faturamento/financeiro..."
                                    rows={2}
                                    value={observacoes}
                                    onChange={e => setObservacoes(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link/URL do Comprovante ou Fatura</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="Ex: http://provedor.com/fatura.pdf"
                                    value={anexoUrl}
                                    onChange={e => setAnexoUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Itens e Parcelas da Ordem</h3>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={addFormItem} 
                                    className="flex items-center gap-1.5 text-xs text-blue-600 border-blue-100 hover:bg-blue-50 py-1.5 px-3 rounded-xl font-bold"
                                >
                                    <PlusCircle size={14} /> Adicionar Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formItens.map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 items-end">
                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                                            <select 
                                                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                                                value={item.categoria_orden}
                                                onChange={e => updateFormItem(index, 'categoria_orden', e.target.value)}
                                            >
                                                <option value="Aluguel">Aluguel</option>
                                                <option value="Fiança">Fiança</option>
                                                <option value="Luz">Luz</option>
                                                <option value="Água">Água</option>
                                                <option value="Internet">Internet</option>
                                                <option value="Gás">Gás</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor (€) <span className="text-red-500">*</span></label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                                                placeholder="0.00"
                                                value={item.valor_orden}
                                                onChange={e => updateFormItem(index, 'valor_orden', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimento <span className="text-red-500">*</span></label>
                                            <input 
                                                type="date" 
                                                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                                                value={item.vencimento_orden}
                                                onChange={e => updateFormItem(index, 'vencimento_orden', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5 md:col-span-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Obra Relacionada <span className="text-red-500">*</span></label>
                                            <select 
                                                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                                                value={item.obra_id}
                                                onChange={e => updateFormItem(index, 'obra_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Selecione a Obra</option>
                                                {obras?.map(o => (
                                                    <option key={o.id} value={o.id}>{o.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalhamento (Outros)</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                                                placeholder="Ex: Pintura ou Reparos"
                                                value={item.otros_gastos}
                                                onChange={e => updateFormItem(index, 'otros_gastos', e.target.value)}
                                            />
                                        </div>

                                        <div className="flex justify-center pb-1">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removeFormItem(index)}
                                                disabled={formItens.length === 1}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 rounded-xl"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-xl border-slate-200 px-4 font-semibold text-slate-700"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={createMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold"
                            >
                                {createMutation.isPending ? "Gravando..." : "Criar Rascunho"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
