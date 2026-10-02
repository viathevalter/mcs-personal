import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import { 
    Search, ChevronLeft, ChevronRight, Filter, Eye, CheckSquare, Square, 
    Plus, Trash2, X, PlusCircle, Users, ChevronDown, ArrowUpRight, 
    CheckCircle2, AlertTriangle, Copy, CreditCard, Building2, User, 
    Calendar, FileText, ExternalLink, HelpCircle, Paperclip, Plane
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createOrdemPagamento, updateOrdemPagamentoStatus } from '../data/loader';
import { logisticsService } from '@/features/logistica/services/logisticsService';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

const ALL_STATUSES = ['rascunho', 'aguardando_aprovacao', 'correcao_solicitada', 'aprovado', 'pago', 'rejeitado', 'cancelado'];

const getStatusLabel = (status: string) => {
    switch(status) {
        case 'rascunho': return 'Rascunho';
        case 'aguardando_aprovacao': return 'Aguardando Aprovação';
        case 'correcao_solicitada': return 'Correção Solicitada';
        case 'aprovado': return 'Aprovado';
        case 'pago': return 'Pago';
        case 'rejeitado': return 'Rejeitado';
        case 'cancelado': return 'Cancelado';
        default: return status;
    }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status) {
        case 'pago': return 'default'; // Success green
        case 'rejeitado':
        case 'cancelado': return 'destructive';
        case 'aguardando_aprovacao': return 'secondary';
        case 'correcao_solicitada': return 'outline';
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
    const navigate = useNavigate();
    const { user } = useAuth();
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [isQuickActionLoading, setIsQuickActionLoading] = useState(false);

    // Quick correction dialog state
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
    const [targetOrdemId, setTargetOrdemId] = useState<string | null>(null);
    const [motivoCorrecao, setMotivoCorrecao] = useState('');

    const toggleExpand = (id: string) => {
        setExpandedRowId(prev => prev === id ? null : id);
    };

    const handleQuickAprovar = async (id: string) => {
        try {
            setIsQuickActionLoading(true);
            const res = await updateOrdemPagamentoStatus(id, 'aprovado', 'Aprovado via painel de ordens', user?.id);
            if (res.success) {
                toast.success("Ordem de pagamento aprovada com sucesso!");
                queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            } else {
                toast.error(`Falha ao aprovar: ${res.error?.message || 'Erro desconhecido'}`);
            }
        } catch (err: any) {
            toast.error(`Erro ao aprovar ordem: ${err.message}`);
        } finally {
            setIsQuickActionLoading(false);
        }
    };

    const handleQuickSolicitarCorrecao = async () => {
        if (!targetOrdemId || !motivoCorrecao.trim()) {
            toast.warning("Por favor, descreva o que precisa ser corrigido.");
            return;
        }
        try {
            setIsQuickActionLoading(true);
            const res = await updateOrdemPagamentoStatus(targetOrdemId, 'correcao_solicitada', motivoCorrecao.trim(), user?.id);
            if (res.success) {
                toast.success("Correção solicitada ao responsável!");
                setCorrectionModalOpen(false);
                setMotivoCorrecao('');
                setTargetOrdemId(null);
                queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            } else {
                toast.error(`Falha ao solicitar correção: ${res.error?.message || 'Erro desconhecido'}`);
            }
        } catch (err: any) {
            toast.error(`Erro ao solicitar correção: ${err.message}`);
        } finally {
            setIsQuickActionLoading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

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

    // Fetch alocações ativas para sincronizar ocupantes dinâmicos
    const { data: alocacoes = [] } = useQuery({
        queryKey: ['alocacoes_ativas'],
        queryFn: () => logisticsService.fetchAlocacoesAtivas(),
        staleTime: 1000 * 60 * 2
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
            const creator = (item.criador_email || '').toLowerCase();
            const dept = (item.departamento_origem || '').toLowerCase();
            const supplier = (suppliers?.find(s => s.codigo === item.cod_provedor || s.id === item.fornecedor_id)?.trade_name || item.cod_provedor || '').toLowerCase();
            if (!desc.includes(lowerTerm) && !code.includes(lowerTerm) && !creator.includes(lowerTerm) && !dept.includes(lowerTerm) && !supplier.includes(lowerTerm)) return false;
        }
        return true;
    });

    const kpis = localFilteredData.reduce((acc, item) => {
        acc.count += 1;
        acc.totalValue += Number(item.valor) || 0;
        switch (item.status) {
            case 'pago': acc.pago += Number(item.valor) || 0; break;
            case 'aguardando_aprovacao': acc.aguardando += Number(item.valor) || 0; break;
            case 'correcao_solicitada': acc.correcao += Number(item.valor) || 0; break;
            case 'aprovado': acc.aprovado += Number(item.valor) || 0; break;
            case 'rascunho': acc.rascunho += Number(item.valor) || 0; break;
        }
        return acc;
    }, { count: 0, totalValue: 0, pago: 0, aguardando: 0, aprovado: 0, correcao: 0, rascunho: 0 });

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
        <div className="h-full flex flex-col p-4 md:p-6 pt-0 md:pt-0 space-y-4 w-full max-w-[1850px] mx-auto">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6">
                    <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ordens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpis.count}</div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCompactCurrency(kpis.totalValue)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Aprovação</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCompactCurrency(kpis.aguardando)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correção Solicitada</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCompactCurrency(kpis.correcao)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-indigo-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprovado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCompactCurrency(kpis.aprovado)}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCompactCurrency(kpis.pago)}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4">
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
                            className="flex items-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl py-2 px-4 text-slate-650 dark:text-slate-350"
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

            {/* Barra de Ações em Lote */}
            {selectedItems.length > 0 && (
                <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                            <CheckSquare size={16} />
                        </div>
                        <div>
                            <span className="font-bold text-sm">
                                {selectedItems.length} {selectedItems.length === 1 ? 'ordem selecionada' : 'ordens selecionadas'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (confirm(`¿Está seguro de eliminar permanentemente las ${selectedItems.length} órdenes seleccionadas?`)) {
                                    const { error } = await supabase.schema('core_finance').from('ordens_pagamento').delete().in('id', selectedItems);
                                    if (error) {
                                        toast.error(`Falha ao eliminar: ${error.message}`);
                                    } else {
                                        toast.success(`${selectedItems.length} ordens eliminadas com sucesso.`);
                                        setSelectedItems([]);
                                        queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
                                    }
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                        >
                            <Trash2 size={13} className="mr-1.5" />
                            Eliminar Selecionadas ({selectedItems.length})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItems([])}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 rounded-2xl">
                <CardContent className="p-0 overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <TableRow>
                                <TableHead className="px-4 w-16">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5" />
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                            checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                                            onChange={toggleAll}
                                            title="Selecionar todos"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Código</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Descrição</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Fornecedor</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Solicitante</TableHead>
                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Vencimento</TableHead>
                                <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Valor</TableHead>
                                <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-center px-6 text-slate-500 font-bold text-xs uppercase tracking-wider">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">Carregando ordens...</TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? paginatedData.map((item) => {
                                const supplierName = suppliers?.find(s => s.codigo === item.cod_provedor || s.id === item.fornecedor_id)?.trade_name || item.cod_provedor || 'Não informado';
                                const isLodging = Boolean(
                                    item.departamento_origem?.toLowerCase().includes('log') ||
                                    item.cod_alojamiento ||
                                    item.descricao?.toLowerCase().includes('aluguel') ||
                                    item.descricao?.toLowerCase().includes('alquiler') ||
                                    item.descricao?.toLowerCase().includes('alojamiento')
                                );
                                const matchingOccupants = isLodging
                                    ? alocacoes.filter(a =>
                                        a.status !== 'Checkout' &&
                                        (
                                            (item.cod_alojamiento && (a.alojamento_codigo === item.cod_alojamiento || a.alojamento_id === item.cod_alojamiento)) ||
                                            (a.alojamento_nome && (
                                                item.descricao?.toLowerCase().includes(a.alojamento_nome.toLowerCase()) ||
                                                a.alojamento_nome.toLowerCase().includes(item.descricao?.toLowerCase())
                                            ))
                                        )
                                      )
                                    : [];
                                const isExpanded = expandedRowId === item.id;

                                // Extrair dados bancários se presentes nas observações
                                const textObs = item.observaciones || '';
                                const ibanMatch = textObs.match(/(?:IBAN:?\s*)?([A-Z]{2}[0-9]{2}(?:[\s\-]?[0-9]{4}){4,6}(?:[\s\-]?[0-9]{1,4})?)/i);
                                const extractedIban = ibanMatch ? ibanMatch[1].replace(/[\t\r\n]+/g, ' ').trim() : null;
                                const bancoMatch = textObs.match(/(?:BANCO:?\s*|BANCO\s+)([A-Z0-9\s\.\-]{2,30}?)(?=\s+IBAN|\s+TITULAR|\n|$)/i);
                                const extractedBanco = bancoMatch ? bancoMatch[1].trim() : null;
                                const titularMatch = textObs.match(/(?:TITULAR:?\s*)([^\n\r]+)/i);
                                let extractedTitular = titularMatch ? titularMatch[1].trim() : null;
                                if (!extractedTitular) {
                                    if (supplierName && supplierName !== 'Não informado') {
                                        extractedTitular = supplierName;
                                    } else if (item.departamento_origem && !['Logística', 'Financeiro', 'Geral'].includes(item.departamento_origem)) {
                                        extractedTitular = item.departamento_origem;
                                    } else {
                                        extractedTitular = item.descricao;
                                    }
                                }

                                return (
                                    <React.Fragment key={item.id}>
                                        <TableRow 
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('input, button, a')) return;
                                                toggleExpand(item.id);
                                            }}
                                            onDoubleClick={(e) => {
                                                if ((e.target as HTMLElement).closest('input, button, a')) return;
                                                navigate(`/financeiro/titulos/${item.id}`);
                                            }}
                                            className={`group border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none transition-colors ${
                                                isExpanded 
                                                    ? 'bg-blue-50/50 dark:bg-blue-950/25 border-b-transparent' 
                                                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <TableCell className="px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleExpand(item.id);
                                                        }}
                                                        className={`p-1 rounded-lg transition-all ${
                                                            isExpanded 
                                                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' 
                                                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                        title={isExpanded ? "Recolher informações" : "Expandir informações inline"}
                                                    >
                                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                                        checked={selectedItems.includes(item.id)}
                                                        onChange={() => toggleSelection(item.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-700 dark:text-slate-300">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-mono text-xs">{item.cod_orden_pago || 'Pendente'}</span>
                                                    {item.departamento_origem && (
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                                                            item.departamento_origem.toLowerCase().includes('log')
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                        }`}>
                                                            {item.departamento_origem}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold">{item.descricao}</span>
                                                        {item.forma_pagamento && (item.forma_pagamento.toLowerCase().includes('reserva') || item.forma_pagamento.toLowerCase().includes('cart')) && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                💳 Tarjeta Reserva
                                                            </span>
                                                        )}
                                                        {item.anexos && (
                                                            <a
                                                                href={item.anexos}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 p-0.5"
                                                                title="Ver anexo / billete"
                                                            >
                                                                <Paperclip size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        {item.cod_alojamiento && (
                                                            <span className="text-[10px] font-mono text-slate-400">
                                                                Inmueble: {item.cod_alojamiento}
                                                            </span>
                                                        )}
                                                        {matchingOccupants.length > 0 && (
                                                            <span
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-help"
                                                                title={matchingOccupants.map(o => `${o.worker_nome} (${o.codigo_colab || 'S/C'}) - ${o.obra_nome || 'Obra'}`).join('\n')}
                                                            >
                                                                <Users size={10} /> {matchingOccupants.length} ocupante(s)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{supplierName}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-2" title={`Usuário Solicitante: ${item.criador_email || 'Não informado'}`}>
                                                    <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-200 dark:border-blue-900/40 flex-shrink-0">
                                                        {item.criador_email ? item.criador_email.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                                            {item.criador_email ? item.criador_email.split('@')[0] : 'Sistema'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                                            {item.departamento_origem || 'Geral'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{formatDate(item.data_vencimento)}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.valor)}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                    item.status === 'pago' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' :
                                                    item.status === 'aguardando_aprovacao' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200' :
                                                    item.status === 'correcao_solicitada' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 animate-pulse' :
                                                    item.status === 'aprovado' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200' :
                                                    (item.status === 'rejeitado' || item.status === 'cancelado') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200' :
                                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                                                }`}>
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center px-6">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 transition-colors">
                                                        <Link to={`/financeiro/titulos/${item.id}`} className="text-slate-400 hover:text-blue-600" title="Ver detalhes completos">
                                                            <Eye size={18} />
                                                        </Link>
                                                    </Button>
                                                    {item.status !== 'pago' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`¿Está seguro de eliminar permanentemente la orden ${item.cod_orden_pago}?`)) {
                                                                    const { error } = await supabase.schema('core_finance').from('ordens_pagamento').delete().eq('id', item.id);
                                                                    if (error) {
                                                                        toast.error(`Falha ao eliminar: ${error.message}`);
                                                                    } else {
                                                                        toast.success(`Orden ${item.cod_orden_pago} eliminada com sucesso.`);
                                                                        queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
                                                                    }
                                                                }
                                                            }}
                                                            className="rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 transition-colors"
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Gaveta Inline Expansível */}
                                        {isExpanded && (
                                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/60 border-b-2 border-b-blue-200 dark:border-b-blue-900/40">
                                                <TableCell colSpan={9} className="p-0">
                                                    <div className="p-5 pl-12 pr-6 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/40 via-transparent to-transparent space-y-4">
                                                        {/* Header do Resumo Rápido */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/70 px-2.5 py-1 rounded-lg">
                                                                    {item.cod_orden_pago || 'Sem Código'}
                                                                </span>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.descricao}</h4>
                                                                    <p className="text-xs text-slate-500">
                                                                        Solicitante: <strong className="text-slate-700 dark:text-slate-300">{item.criador_email || 'Sistema'}</strong> ({item.departamento_origem || 'Geral'}) • Vencimento: <strong>{formatDate(item.data_vencimento)}</strong>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    onClick={() => navigate(`/financeiro/titulos/${item.id}`)}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs gap-1.5 shadow-sm font-semibold"
                                                                >
                                                                    <ArrowUpRight size={15} />
                                                                    Abrir Detalhe Completo
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Grid de Informações: Dados Bancários, Centro de Custo, Observações */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                            {/* Card Dados de Pagamento / IBAN */}
                                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-2 font-bold text-slate-700 dark:text-slate-200 mb-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <CreditCard size={15} className="text-blue-600" />
                                                                            <span>Dados para Transferência</span>
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg gap-1"
                                                                            onClick={() => {
                                                                                const summary = [
                                                                                    `Favorecido: ${extractedTitular || supplierName}`,
                                                                                    extractedIban ? `IBAN: ${extractedIban}` : null,
                                                                                    extractedBanco ? `Banco: ${extractedBanco}` : null,
                                                                                    `Valor: ${formatCurrency(item.valor)}`,
                                                                                    `Referência: ${item.cod_orden_pago || item.descricao}`
                                                                                ].filter(Boolean).join('\n');
                                                                                copyToClipboard(summary, 'Dados completos');
                                                                            }}
                                                                            title="Copiar resumo completo"
                                                                        >
                                                                            <Copy size={11} /> Copiar Todos
                                                                        </Button>
                                                                    </div>
                                                                    {extractedIban ? (
                                                                        <div className="space-y-2 mt-1">
                                                                            {extractedTitular && (
                                                                                <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
                                                                                    <span className="truncate max-w-[150px]">
                                                                                        <span className="text-slate-400">Titular:</span> <strong className="text-slate-800 dark:text-slate-200">{extractedTitular}</strong>
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => copyToClipboard(extractedTitular!, 'Nome do Favorecido')}
                                                                                        className="text-[10px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5 flex-shrink-0"
                                                                                    >
                                                                                        <Copy size={10} /> Copiar
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {extractedBanco && (
                                                                                <p className="text-slate-600 dark:text-slate-400">
                                                                                    <span className="text-slate-400">Banco:</span> <strong className="text-slate-800 dark:text-slate-200">{extractedBanco}</strong>
                                                                                </p>
                                                                            )}
                                                                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                                                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 select-all truncate text-[11px]">
                                                                                    {extractedIban}
                                                                                </span>
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-100/60 rounded-md gap-1 flex-shrink-0"
                                                                                    onClick={() => copyToClipboard(extractedIban, 'IBAN')}
                                                                                    title="Copiar IBAN"
                                                                                >
                                                                                    <Copy size={11} /> Copiar
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1 mt-1">
                                                                            <div className="flex items-center justify-between gap-1">
                                                                                <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
                                                                                    {supplierName}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => copyToClipboard(supplierName, 'Nome do Fornecedor')}
                                                                                    className="text-[10px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                                                                >
                                                                                    <Copy size={10} /> Copiar
                                                                                </button>
                                                                            </div>
                                                                            <span className="text-slate-400 italic text-[11px] block">IBAN não detectado nas observações</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                                                                    <span className="text-slate-400">Valor Total:</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(item.valor)}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyToClipboard(Number(item.valor).toFixed(2).replace('.', ','), 'Valor')}
                                                                            className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 p-1"
                                                                            title="Copiar valor"
                                                                        >
                                                                            <Copy size={11} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Card Centro de Custos / Obra */}
                                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                                                                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-2">
                                                                    <Building2 size={15} className="text-emerald-600" />
                                                                    <span>Classificação & Centro de Custo</span>
                                                                </div>
                                                                <div className="space-y-1 mt-1 text-slate-600 dark:text-slate-300">
                                                                    <p><span className="text-slate-400">Setor Origem:</span> <strong className="text-slate-700 dark:text-slate-200">{item.departamento_origem || 'Geral'}</strong></p>
                                                                    <p><span className="text-slate-400">Centro:</span> <strong className="text-slate-700 dark:text-slate-200">{item.centro_custos || 'Não especificado'}</strong></p>
                                                                    {item.forma_pagamento && (
                                                                        <p className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-slate-400">Forma de Pago:</span>
                                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                                item.forma_pagamento.toLowerCase().includes('reserva') || item.forma_pagamento.toLowerCase().includes('cart')
                                                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                            }`}>
                                                                                💳 {item.forma_pagamento}
                                                                            </span>
                                                                        </p>
                                                                    )}
                                                                    {item.cod_alojamiento && (
                                                                        <p><span className="text-slate-400">Imóvel:</span> <span className="font-mono font-semibold text-blue-600">{item.cod_alojamiento}</span></p>
                                                                    )}
                                                                    {item.tipo_orden && (
                                                                        <p><span className="text-slate-400">Tipo:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{item.tipo_orden}</span></p>
                                                                    )}
                                                                    {item.anexos && (
                                                                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                                                                            <a
                                                                                href={item.anexos}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                onClick={e => e.stopPropagation()}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
                                                                            >
                                                                                <Paperclip size={12} />
                                                                                Ver Billete / Fatura Adjunta
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Card Observações / Motivo Correção */}
                                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-2">
                                                                        <FileText size={15} className="text-amber-600" />
                                                                        <span>Observações</span>
                                                                    </div>
                                                                    {item.motivo_correcao && (
                                                                        <div className="p-2 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 text-[11px]">
                                                                            <strong>Correção Solicitada:</strong> {item.motivo_correcao}
                                                                        </div>
                                                                    )}
                                                                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line max-h-24 overflow-y-auto text-[11px] leading-relaxed">
                                                                        {item.observaciones || 'Sem observações adicionais.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Ocupantes da Obra / Imóvel (se houver) */}
                                                        {matchingOccupants.length > 0 && (
                                                            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                                                                    <Users size={15} />
                                                                    <span>Ocupantes Vinculados ao Aluguel ({matchingOccupants.length})</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {matchingOccupants.map((occ: any, idx: number) => (
                                                                        <div key={idx} className="bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-2xs text-[11px] flex items-center gap-2">
                                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{occ.worker_nome}</span>
                                                                            {occ.codigo_colab && <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{occ.codigo_colab}</span>}
                                                                            {occ.obra_nome && <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">({occ.obra_nome})</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Barra de Ações Rápidas */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                                                            <span className="text-xs text-slate-400 italic">
                                                                💡 Dica: Dê duplo clique em qualquer linha para navegar direto aos detalhes completos
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {item.status === 'aguardando_aprovacao' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setTargetOrdemId(item.id);
                                                                                setMotivoCorrecao('');
                                                                                setCorrectionModalOpen(true);
                                                                            }}
                                                                            disabled={isQuickActionLoading}
                                                                            className="rounded-xl border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold gap-1.5"
                                                                        >
                                                                            <AlertTriangle size={14} />
                                                                            Pedir Correção
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/financeiro/titulos/${item.id}`);
                                                                            }}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                                                                        >
                                                                            <CreditCard size={14} />
                                                                            Pagar Agora
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleQuickAprovar(item.id);
                                                                            }}
                                                                            disabled={isQuickActionLoading}
                                                                            className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-xs font-semibold gap-1.5"
                                                                        >
                                                                            <CheckCircle2 size={14} />
                                                                            Apenas Aprovar
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {item.status === 'aprovado' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/financeiro/titulos/${item.id}`);
                                                                        }}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                                                                    >
                                                                        <CreditCard size={14} />
                                                                        Ir para Pagamento
                                                                    </Button>
                                                                )}
                                                                {item.status === 'pago' && (
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                                        <CheckCircle2 size={15} />
                                                                        Ordem Liquidada e Paga
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="px-6 py-12 text-center text-slate-400">
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

            {/* Modal de Solicitação Rápida de Correção */}
            <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={20} />
                            Solicitar Correção na Ordem
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 text-sm">
                        <p className="text-slate-600 dark:text-slate-300">
                            Descreva claramente o motivo da correção para que o responsável (Logística ou solicitante) possa revisar e ajustar os dados da ordem.
                        </p>
                        <textarea
                            value={motivoCorrecao}
                            onChange={(e) => setMotivoCorrecao(e.target.value)}
                            placeholder="Ex: Valor divergente da fatura, falta anexo do comprovante, alterar centro de custo..."
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none bg-slate-50/50 dark:bg-slate-900"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setCorrectionModalOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleQuickSolicitarCorrecao} 
                            disabled={isQuickActionLoading || !motivoCorrecao.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold gap-1.5"
                        >
                            Confirmar e Devolver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
