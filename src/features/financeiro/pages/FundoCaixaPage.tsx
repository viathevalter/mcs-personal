import React, { useState, useEffect } from 'react';
import { 
    caixaService, 
    type CaixaDespesa, 
    type MovimentoExtrato, 
    type ColaboradorOption 
} from '../services/caixaService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { 
    Wallet, 
    TrendingUp, 
    TrendingDown, 
    Coins, 
    Plus, 
    Search, 
    RefreshCw, 
    ArrowUpRight, 
    ArrowDownLeft, 
    FileText, 
    Car, 
    Building2, 
    User, 
    Copy, 
    ExternalLink, 
    Eye, 
    Check, 
    Loader2, 
    X,
    Filter,
    Clock,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function FundoCaixaPage() {
    // Listas principais
    const [caixas, setCaixas] = useState<CaixaDespesa[]>([]);
    const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
    const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
    const [coches, setCoches] = useState<{ id: string; matricula: string; marca: string; modelo: string }[]>([]);
    const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);

    // Estados de carregamento
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [extratoLoading, setExtratoLoading] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    // Filtros e abas
    const [activeTab, setActiveTab] = useState<'caixas' | 'historico'>('caixas');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Inativo'>('todos');
    const [empresaFilter, setEmpresaFilter] = useState('todas');

    // Modais e Item Selecionado
    const [selectedCaixa, setSelectedCaixa] = useState<CaixaDespesa | null>(null);
    const [extrato, setExtrato] = useState<MovimentoExtrato[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const [isNovoCaixaOpen, setIsNovoCaixaOpen] = useState(false);
    const [isRecargaOpen, setIsRecargaOpen] = useState(false);
    const [isDespesaOpen, setIsDespesaOpen] = useState(false);
    const [isExtratoOpen, setIsExtratoOpen] = useState(false);

    // Formulários
    const [formNovoCaixa, setFormNovoCaixa] = useState({
        nombre: '',
        trabajador_id: '',
        id_empresa: '',
        saldo_inicial: ''
    });

    const [formRecarga, setFormRecarga] = useState({
        valor: '',
        data_recarga: new Date().toISOString().split('T')[0],
        observacoes: '',
        gerar_op: true,
        comprovante_url: ''
    });

    const [formDespesa, setFormDespesa] = useState({
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
        categoria: 'Combustível' as any,
        coche_id: '',
        descricao: '',
        comprovante_url: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [caixasData, colabsData, empsData, cochesData, geralData] = await Promise.all([
                caixaService.getCaixas(),
                caixaService.getColaboradores(),
                caixaService.getEmpresas(),
                caixaService.getCoches(),
                caixaService.getTodosMovimentos()
            ]);

            setCaixas(caixasData);
            setColaboradores(colabsData);
            setEmpresas(empsData);
            setCoches(cochesData);
            setHistoricoGeral(geralData);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            toast.error('Erro ao carregar dados do Fundo de Caixa.');
        } finally {
            setLoading(false);
        }
    };

    // Submissão: Novo Caixa
    const handleCreateCaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formNovoCaixa.nombre.trim() || !formNovoCaixa.trabajador_id) {
            toast.error('Informe o nome da caixa e selecione o colaborador.');
            return;
        }

        setSubmitting(true);
        try {
            await caixaService.createCaixa({
                nombre: formNovoCaixa.nombre.trim(),
                trabajador_id: formNovoCaixa.trabajador_id,
                id_empresa: formNovoCaixa.id_empresa || null,
                status: 'Ativo',
                saldo_inicial: Number(formNovoCaixa.saldo_inicial) || 0
            });

            toast.success('Fundo de Caixa criado com sucesso!');
            setIsNovoCaixaOpen(false);
            setFormNovoCaixa({ nombre: '', trabajador_id: '', id_empresa: '', saldo_inicial: '' });
            await loadData();
        } catch (err: any) {
            console.error('Erro ao criar caixa:', err);
            toast.error(err?.message || 'Erro ao criar caixa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Submissão: Nova Recarga
    const handleAddRecarga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;
        const val = parseFloat(formRecarga.valor);
        if (isNaN(val) || val <= 0) {
            toast.error('Informe um valor de recarga válido.');
            return;
        }

        setSubmitting(true);
        try {
            await caixaService.addRecarga({
                caixa_id: selectedCaixa.id,
                valor: val,
                data_recarga: formRecarga.data_recarga,
                observacoes: formRecarga.observacoes || null,
                gerar_op: formRecarga.gerar_op,
                id_empresa: selectedCaixa.id_empresa,
                comprovante_url: formRecarga.comprovante_url || null
            });

            toast.success('Recarga adicionada com sucesso!');
            setIsRecargaOpen(false);
            setFormRecarga({
                valor: '',
                data_recarga: new Date().toISOString().split('T')[0],
                observacoes: '',
                gerar_op: true,
                comprovante_url: ''
            });
            await loadData();
            if (isExtratoOpen) {
                await openExtrato(selectedCaixa);
            }
        } catch (err: any) {
            console.error('Erro ao adicionar recarga:', err);
            toast.error(err?.message || 'Erro ao adicionar recarga.');
        } finally {
            setSubmitting(false);
        }
    };

    // Submissão: Nova Despesa
    const handleAddDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;
        const val = parseFloat(formDespesa.valor);
        if (isNaN(val) || val <= 0) {
            toast.error('Informe um valor de despesa válido.');
            return;
        }

        setSubmitting(true);
        try {
            await caixaService.addDespesa({
                caixa_id: selectedCaixa.id,
                valor: val,
                data_despesa: formDespesa.data_despesa,
                categoria: formDespesa.categoria,
                coche_id: formDespesa.coche_id || null,
                id_empresa: selectedCaixa.id_empresa,
                descricao: formDespesa.descricao || null,
                comprovante_url: formDespesa.comprovante_url || null
            });

            toast.success('Despesa registrada com sucesso!');
            setIsDespesaOpen(false);
            setFormDespesa({
                valor: '',
                data_despesa: new Date().toISOString().split('T')[0],
                categoria: 'Combustível',
                coche_id: '',
                descricao: '',
                comprovante_url: ''
            });
            await loadData();
            if (isExtratoOpen) {
                await openExtrato(selectedCaixa);
            }
        } catch (err: any) {
            console.error('Erro ao adicionar despesa:', err);
            toast.error(err?.message || 'Erro ao adicionar despesa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Abrir Extrato
    const openExtrato = async (caixa: CaixaDespesa) => {
        setSelectedCaixa(caixa);
        setIsExtratoOpen(true);
        setExtratoLoading(true);
        try {
            const data = await caixaService.getExtratoCompleto(caixa.id);
            setExtrato(data);
        } catch (err) {
            console.error('Erro ao buscar extrato:', err);
            toast.error('Erro ao carregar extrato do caixa.');
        } finally {
            setExtratoLoading(false);
        }
    };

    // Deletar despesa do extrato
    const handleDeleteDespesa = async (despesaId: string) => {
        if (!confirm('Deseja realmente excluir este lançamento de despesa?')) return;
        try {
            await caixaService.deleteDespesa(despesaId);
            toast.success('Despesa excluída.');
            if (selectedCaixa) {
                await openExtrato(selectedCaixa);
            }
            await loadData();
        } catch (err) {
            toast.error('Erro ao excluir despesa.');
        }
    };

    // Upload de arquivo / comprovante
    const handleFileUpload = async (file: File, target: 'recarga' | 'despesa') => {
        setUploadingReceipt(true);
        try {
            const url = await caixaService.uploadComprovante(file);
            if (target === 'recarga') {
                setFormRecarga(prev => ({ ...prev, comprovante_url: url }));
            } else {
                setFormDespesa(prev => ({ ...prev, comprovante_url: url }));
            }
            toast.success('Comprovante anexado com sucesso!');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao enviar comprovante.');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Copiar Link do Trabalhador
    const copyWorkerLink = (caixa: CaixaDespesa) => {
        const link = `${window.location.origin}/portal/fundo-caixa?caixaId=${caixa.id}`;
        navigator.clipboard.writeText(link);
        toast.success('Link do Trabalhador copiado! Envie pelo WhatsApp ou E-mail.', {
            description: link
        });
    };

    // Alternar status do Caixa
    const toggleCaixaStatus = async (caixa: CaixaDespesa) => {
        const nextStatus = caixa.status === 'Ativo' ? 'Inativo' : 'Ativo';
        try {
            await caixaService.updateCaixa(caixa.id, { status: nextStatus });
            toast.success(`Caixa ${nextStatus === 'Ativo' ? 'ativado' : 'encerrado/arquivado'}.`);
            await loadData();
        } catch (err) {
            toast.error('Erro ao alterar status da caixa.');
        }
    };

    // Cálculos de KPIs
    const totalSaldoCustodiado = caixas.reduce((sum, c) => sum + c.saldo, 0);
    const totalRecarregadoGeral = caixas.reduce((sum, c) => sum + c.total_recargas, 0);
    const totalGastoGeral = caixas.reduce((sum, c) => sum + c.total_despesas, 0);
    const caixasAtivas = caixas.filter(c => c.status === 'Ativo').length;

    // Filtragem de caixas
    const filteredCaixas = caixas.filter(c => {
        const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.trabajador?.Nombre && c.trabajador.Nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
        const matchesEmpresa = empresaFilter === 'todas' || c.id_empresa === empresaFilter;
        return matchesSearch && matchesStatus && matchesEmpresa;
    });

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Fundo de Caixa & Adiantamentos
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Gestão de caixas para viagens, compras e despesas operacionais dos colaboradores
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={loadData}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button
                        onClick={() => setIsNovoCaixaOpen(true)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Fundo de Caixa
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Saldo em Aberto (Custodiado)
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalSaldoCustodiado < 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                            {formatMoney(totalSaldoCustodiado)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Saldo total nas mãos dos colaboradores</p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Recarregado
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {formatMoney(totalRecarregadoGeral)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Adiantamentos transferidos aos caixas</p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Comprovado (Gastos)
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                            <TrendingDown className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatMoney(totalGastoGeral)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Despesas com comprovantes lançados</p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Caixas Ativas
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                            <Coins className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {caixasAtivas} <span className="text-sm font-normal text-slate-400">/ {caixas.length}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Colaboradores com viagem em andamento</p>
                    </CardContent>
                </Card>
            </div>

            {/* Abas e Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('caixas')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'caixas'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Caixas por Colaborador ({caixas.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('historico')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'historico'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Extrato Consolidado ({historicoGeral.length})
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar caixa ou colaborador..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>

                        {activeTab === 'caixas' && (
                            <>
                                <select
                                    value={statusFilter}
                                    onChange={(e: any) => setStatusFilter(e.target.value)}
                                    className="h-9 text-xs px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                                >
                                    <option value="todos">Status: Todos</option>
                                    <option value="Ativo">Ativos</option>
                                    <option value="Inativo">Inativos</option>
                                </select>

                                <select
                                    value={empresaFilter}
                                    onChange={e => setEmpresaFilter(e.target.value)}
                                    className="h-9 text-xs px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                                >
                                    <option value="todas">Empresa: Todas</option>
                                    {empresas.map(e => (
                                        <option key={e.id} value={e.id}>{e.nome}</option>
                                    ))}
                                </select>
                            </>
                        )}
                    </div>
                </div>

                {/* Conteúdo Aba 1: Grid de Caixas */}
                {activeTab === 'caixas' && (
                    <div>
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
                                <span>Carregando caixas...</span>
                            </div>
                        ) : filteredCaixas.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <Wallet className="h-10 w-10 mx-auto mb-2 stroke-1 opacity-50" />
                                <p className="font-medium">Nenhum fundo de caixa encontrado.</p>
                                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Fundo de Caixa" para criar um novo adiantamento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCaixas.map(cx => (
                                    <div 
                                        key={cx.id} 
                                        className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-400/50 transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                                                            {cx.nombre}
                                                        </h3>
                                                        <Badge variant={cx.status === 'Ativo' ? 'default' : 'secondary'} className="text-[10px]">
                                                            {cx.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {cx.trabajador?.Nombre || 'Não especificado'}
                                                        </span>
                                                        {cx.trabajador?.tipo && (
                                                            <span className="text-[10px] text-slate-400 uppercase">
                                                                ({cx.trabajador.tipo})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {cx.empresa && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                                            <Building2 className="h-3.5 w-3.5" />
                                                            <span>{cx.empresa.nome}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Saldo Destaque */}
                                            <div className="my-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-xs text-slate-400 font-medium">Saldo Disponível</div>
                                                <div className={`text-2xl font-black mt-0.5 ${
                                                    cx.saldo > 0 ? 'text-emerald-600' : cx.saldo < 0 ? 'text-red-600' : 'text-slate-600'
                                                }`}>
                                                    {formatMoney(cx.saldo)}
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                                        Recargas: {formatMoney(cx.total_recargas)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <ArrowDownLeft className="h-3.5 w-3.5" />
                                                        Gastos: {formatMoney(cx.total_despesas)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs font-semibold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                                    onClick={() => {
                                                        setSelectedCaixa(cx);
                                                        setIsRecargaOpen(true);
                                                    }}
                                                >
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    + Recarregar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs font-semibold gap-1 text-red-700 hover:text-red-800 hover:bg-red-50"
                                                    onClick={() => {
                                                        setSelectedCaixa(cx);
                                                        setIsDespesaOpen(true);
                                                    }}
                                                >
                                                    <TrendingDown className="h-3.5 w-3.5" />
                                                    + Lançar Gasto
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="flex-1 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                                                    onClick={() => openExtrato(cx)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Ver Extrato
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    title="Copiar Link para o Trabalhador registrar no celular"
                                                    className="text-xs px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => copyWorkerLink(cx)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    title={cx.status === 'Ativo' ? 'Encerrar Caixa' : 'Reativar Caixa'}
                                                    className="text-xs px-2 text-slate-400 hover:text-slate-700"
                                                    onClick={() => toggleCaixaStatus(cx)}
                                                >
                                                    <Clock className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Conteúdo Aba 2: Histórico Geral */}
                {activeTab === 'historico' && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                    <TableHead className="w-28">Data</TableHead>
                                    <TableHead>Caixa / Viagem</TableHead>
                                    <TableHead>Colaborador</TableHead>
                                    <TableHead>Tipo & Descrição</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-center w-24">Comprovante</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historicoGeral.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                                            Nenhum lançamento registrado até o momento.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    historicoGeral.map((mov, idx) => (
                                        <TableRow key={mov.id || idx}>
                                            <TableCell className="font-mono text-xs">
                                                {mov.data}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                                                {mov.caixa_nome}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {mov.trabalhador_nome}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge 
                                                        variant="outline"
                                                        className={`text-[10px] ${
                                                            mov.tipo === 'entrada' 
                                                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50' 
                                                                : 'text-red-700 border-red-300 bg-red-50'
                                                        }`}
                                                    >
                                                        {mov.tipo === 'entrada' ? 'Recarga' : 'Despesa'}
                                                    </Badge>
                                                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                                        {mov.descricao}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {mov.categoria || '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono text-xs font-bold ${
                                                mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                                {mov.tipo === 'entrada' ? '+' : '-'}{formatMoney(mov.valor)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {mov.comprovante_url ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                                        onClick={() => setLightboxImage(mov.comprovante_url)}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* MODAL 1: Novo Fundo de Caixa */}
            <Dialog open={isNovoCaixaOpen} onOpenChange={setIsNovoCaixaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-600" />
                            Novo Fundo de Caixa
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCaixa} className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Nome do Caixa / Viagem *
                            </label>
                            <Input
                                placeholder="Ex: Viagem Itália - Omar"
                                value={formNovoCaixa.nombre}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, nombre: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Colaborador Responsável *
                            </label>
                            <select
                                value={formNovoCaixa.trabajador_id}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, trabajador_id: e.target.value }))}
                                required
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Selecione um colaborador...</option>
                                <optgroup label="Escritório / Administrativo">
                                    {colaboradores.filter(c => c.tipo === 'escritorio').map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} ({c.identificador})</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Trabalhadores / Motoristas">
                                    {colaboradores.filter(c => c.tipo === 'campo').map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} ({c.identificador})</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Empresa Pagadora / Vinculada
                            </label>
                            <select
                                value={formNovoCaixa.id_empresa}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, id_empresa: e.target.value }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Selecione a empresa...</option>
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Saldo Inicial (€)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formNovoCaixa.saldo_inicial}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, saldo_inicial: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                O valor será lançado como recarga inicial sem necessidade de aprovação.
                            </p>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsNovoCaixaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Caixa'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: Nova Recarga */}
            <Dialog open={isRecargaOpen} onOpenChange={setIsRecargaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                            Adicionar Recarga de Saldo
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCaixa && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedCaixa.nombre}</p>
                            <p className="text-slate-500">Colaborador: {selectedCaixa.trabajador?.Nombre}</p>
                            <p className="text-slate-500 mt-1">Saldo Atual: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(selectedCaixa.saldo)}</strong></p>
                        </div>
                    )}
                    <form onSubmit={handleAddRecarga} className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Valor da Recarga (€) *
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 500.00"
                                value={formRecarga.valor}
                                onChange={e => setFormRecarga(prev => ({ ...prev, valor: e.target.value }))}
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Data da Recarga *
                            </label>
                            <Input
                                type="date"
                                value={formRecarga.data_recarga}
                                onChange={e => setFormRecarga(prev => ({ ...prev, data_recarga: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Observações / Descrição
                            </label>
                            <Input
                                placeholder="Ex: Adiantamento para viagem a Milão"
                                value={formRecarga.observacoes}
                                onChange={e => setFormRecarga(prev => ({ ...prev, observacoes: e.target.value }))}
                            />
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formRecarga.gerar_op}
                                    onChange={e => setFormRecarga(prev => ({ ...prev, gerar_op: e.target.checked }))}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                    Gerar Ordem de Pagamento no Financeiro
                                </span>
                            </label>
                            <p className="text-[11px] text-slate-400 mt-1 pl-6">
                                Se marcado, uma OP será criada para a equipe financeira aprovar e efetuar o PIX/Transferência bancária.
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Comprovante de Transferência (Opcional)
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(e.target.files[0], 'recarga');
                                    }
                                }}
                                className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingReceipt && <p className="text-xs text-blue-600 mt-1">Enviando arquivo...</p>}
                            {formRecarga.comprovante_url && (
                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Arquivo anexado com sucesso
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsRecargaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting || uploadingReceipt}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Recarga'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: Nova Despesa */}
            <Dialog open={isDespesaOpen} onOpenChange={setIsDespesaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <TrendingDown className="h-5 w-5" />
                            Lançar Gasto / Despesa
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCaixa && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedCaixa.nombre}</p>
                            <p className="text-slate-500">Colaborador: {selectedCaixa.trabajador?.Nombre}</p>
                            <p className="text-slate-500 mt-1">Saldo Atual: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(selectedCaixa.saldo)}</strong></p>
                        </div>
                    )}
                    <form onSubmit={handleAddDespesa} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Valor do Gasto (€) *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 45.00"
                                    value={formDespesa.valor}
                                    onChange={e => setFormDespesa(prev => ({ ...prev, valor: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Data da Despesa *
                                </label>
                                <Input
                                    type="date"
                                    value={formDespesa.data_despesa}
                                    onChange={e => setFormDespesa(prev => ({ ...prev, data_despesa: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Categoria do Gasto *
                            </label>
                            <select
                                value={formDespesa.categoria}
                                onChange={e => setFormDespesa(prev => ({ ...prev, categoria: e.target.value as any }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                required
                            >
                                <option value="Combustível">⛽ Combustível / Abastecimento</option>
                                <option value="Viagem/Transporte">🛣️ Pedágio / Transporte / Estacionamento</option>
                                <option value="Alimentação">🍽️ Alimentação / Refeição</option>
                                <option value="Alojamento">🏨 Hotel / Alojamento</option>
                                <option value="Manutenção">🔧 Manutenção do Veículo</option>
                                <option value="Outros">📦 Outros Gastos</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Veículo Envolvido (Opcional)
                            </label>
                            <select
                                value={formDespesa.coche_id}
                                onChange={e => setFormDespesa(prev => ({ ...prev, coche_id: e.target.value }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Sem veículo vinculado</option>
                                {coches.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.matricula} — {c.marca} {c.modelo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Descrição / Justificativa
                            </label>
                            <Input
                                placeholder="Ex: Abastecimento em posto na rodovia de Bolonha"
                                value={formDespesa.descricao}
                                onChange={e => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Foto do Recibo / Comprovante (Câmera ou Arquivo)
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                capture="environment"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(e.target.files[0], 'despesa');
                                    }
                                }}
                                className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingReceipt && <p className="text-xs text-blue-600 mt-1">Fazendo upload da imagem...</p>}
                            {formDespesa.comprovante_url && (
                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Foto anexada com sucesso
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsDespesaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting || uploadingReceipt}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar Despesa'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: Extrato Completo do Caixa */}
            <Dialog open={isExtratoOpen} onOpenChange={setIsExtratoOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Extrato: {selectedCaixa?.nombre}
                            </DialogTitle>
                            {selectedCaixa && (
                                <Badge variant={selectedCaixa.status === 'Ativo' ? 'default' : 'secondary'}>
                                    {selectedCaixa.status}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedCaixa && (
                        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div>
                                <span className="text-slate-400 block">Colaborador:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {selectedCaixa.trabajador?.Nombre}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Empresa:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {selectedCaixa.empresa?.nome || '—'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 block">Saldo Atual:</span>
                                <span className={`text-base font-bold ${selectedCaixa.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatMoney(selectedCaixa.saldo)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto mt-2 border border-slate-200 dark:border-slate-800 rounded-xl">
                        {extratoLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-600" />
                                <span>Calculando extrato...</span>
                            </div>
                        ) : extrato.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <p>Nenhum movimento registrado neste caixa.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                        <TableHead className="w-24">Data</TableHead>
                                        <TableHead>Movimento</TableHead>
                                        <TableHead>Categoria / Veículo</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Saldo Acum.</TableHead>
                                        <TableHead className="text-center w-24">Recibo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extrato.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-mono text-xs text-slate-500">
                                                {m.data}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`p-1 rounded-md ${
                                                        m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {m.tipo === 'entrada' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {m.descricao}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {m.categoria ? (
                                                    <div>
                                                        <span>{m.categoria}</span>
                                                        {m.coche && (
                                                            <span className="block text-[11px] text-slate-400 font-mono">
                                                                🚗 {m.coche.matricula}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono text-xs font-bold ${
                                                m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                                {m.tipo === 'entrada' ? '+' : '-'}{formatMoney(m.valor)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {m.runningBalance !== undefined ? formatMoney(m.runningBalance) : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {m.comprovante_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                                            onClick={() => setLightboxImage(m.comprovante_url || null)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {m.tipo === 'saida' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                                            title="Excluir despesa"
                                                            onClick={() => handleDeleteDespesa(m.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter className="mt-3 flex justify-between sm:justify-between items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 text-blue-600"
                            onClick={() => selectedCaixa && copyWorkerLink(selectedCaixa)}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Link do Trabalhador
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => setIsExtratoOpen(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* LIGHTBOX: Visualizador de Comprovante */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 bg-slate-900 text-white">
                            <span className="text-xs font-semibold">Comprovante de Despesa</span>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={lightboxImage} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Abrir Original
                                </a>
                                <button 
                                    onClick={() => setLightboxImage(null)}
                                    className="p-1 hover:bg-slate-800 rounded-md"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-auto bg-slate-950">
                            {lightboxImage.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={lightboxImage} className="w-full h-[70vh]" />
                            ) : (
                                <img src={lightboxImage} alt="Comprovante" className="max-w-full max-h-[75vh] object-contain rounded" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
