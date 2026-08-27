import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSeguridadeList } from './hooks/useSeguridadeList';
import { updateSeguridadePostit } from './api/seguridadeApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    Loader2, Search, ArrowRight, CheckCircle2, AlertCircle, LayoutGrid, List, 
    Users, ShieldCheck, Calendar, Building2, StickyNote, Pin, Clock, 
    Filter, ArrowUpDown, Pencil, X, AlertTriangle, Briefcase, FileText
} from 'lucide-react';
import type { SeguridadeStatusWithWorker } from '@/shared/types/corePersonal';
import { useClientWorkerKpis } from '../workers/hooks/useClientWorkerKpis';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { MultiSelect } from '@/components/ui/multi-select';
import { ProcessarSeguridadeDialog } from './components/ProcessarSeguridadeDialog';
import { toast } from 'sonner';

// Helper de formatação de data
const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
};

// Helper de urgência e cálculo de dias para a Data Alvo de Execução
const getTargetDateInfo = (dateStr?: string | null, isAlta?: boolean) => {
    if (!dateStr) {
        return {
            formatted: 'A Definir',
            diffDays: null,
            badgeText: 'Data a definir',
            badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
            isUrgent: false
        };
    }

    try {
        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) {
            return {
                formatted: dateStr,
                diffDays: null,
                badgeText: dateStr,
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                isUrgent: false
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const formatted = targetDate.toLocaleDateString('pt-BR');
        const prefix = isAlta ? 'Início' : 'Saída';

        if (diffDays < 0) {
            return {
                formatted,
                diffDays,
                badgeText: `🚨 ${prefix} Passado (${Math.abs(diffDays)}d atrás)`,
                badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30 font-bold',
                isUrgent: true
            };
        } else if (diffDays === 0) {
            return {
                formatted,
                diffDays,
                badgeText: `🚨 EFETIVAR HOJE! (${formatted})`,
                badgeClass: 'bg-rose-600 text-white font-extrabold shadow-sm animate-pulse',
                isUrgent: true
            };
        } else if (diffDays <= 3) {
            return {
                formatted,
                diffDays,
                badgeText: `⚡ ${prefix} em ${diffDays}d (${formatted})`,
                badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400/40 font-bold',
                isUrgent: true
            };
        } else if (diffDays <= 7) {
            return {
                formatted,
                diffDays,
                badgeText: `🗓️ ${prefix} em ${diffDays}d (${formatted})`,
                badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30 font-medium',
                isUrgent: false
            };
        } else {
            return {
                formatted,
                diffDays,
                badgeText: `🟢 ${prefix}: ${formatted} (Faltam ${diffDays}d)`,
                badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
                isUrgent: false
            };
        }
    } catch {
        return {
            formatted: dateStr,
            diffDays: null,
            badgeText: dateStr,
            badgeClass: 'bg-slate-100 text-slate-700',
            isUrgent: false
        };
    }
};

// Helper de badge por Empresa Contratante
const getContratanteBadgeClass = (contratante?: string | null) => {
    if (!contratante) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    const upper = contratante.toUpperCase();
    if (upper.includes('LUMINOUS')) {
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    } else if (upper.includes('WISEOWE') || upper.includes('WISE')) {
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    } else if (upper.includes('STOCCO')) {
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    } else if (upper.includes('LOGIN')) {
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
    }
    return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
};

export function SeguridadePage() {
    const { selectedEmpresaId } = useEmpresa();
    const queryClient = useQueryClient();
    const { data: statuses, isLoading, isError } = useSeguridadeList();
    
    // Filtros e Busca
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilters, setClienteFilters] = useState<string[]>([]);
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');
    const [tipoEventoFilter, setTipoEventoFilter] = useState<string>('all');
    const [hasPostitFilter, setHasPostitFilter] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'target_date_asc' | 'target_date_desc' | 'req_date_desc' | 'worker_asc'>('target_date_asc');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

    // Dialog de Processamento do Kanban
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SeguridadeStatusWithWorker | null>(null);

    // Dialog de Post-it Rápido
    const [postitDialogOpen, setPostitDialogOpen] = useState(false);
    const [activePostitItem, setActivePostitItem] = useState<SeguridadeStatusWithWorker | null>(null);
    const [postitText, setPostitText] = useState('');
    const [savingPostit, setSavingPostit] = useState(false);

    const handleProcessar = (item: SeguridadeStatusWithWorker) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const handleOpenPostit = (item: SeguridadeStatusWithWorker, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setActivePostitItem(item);
        setPostitText(item.lembrete_postit || '');
        setPostitDialogOpen(true);
    };

    const handleSavePostit = async () => {
        if (!activePostitItem) return;
        try {
            setSavingPostit(true);
            await updateSeguridadePostit(activePostitItem.id, postitText.trim() || null);
            await queryClient.invalidateQueries({ queryKey: ['seguridade-status'] });
            toast.success('Lembrete (Post-it) salvo com sucesso!');
            setPostitDialogOpen(false);
        } catch (err: any) {
            console.error("Erro ao salvar post-it:", err);
            toast.error(`Erro ao salvar lembrete: ${err.message || err}`);
        } finally {
            setSavingPostit(false);
        }
    };

    // Debounce search term to avoid spamming the DB
    const debouncedSearch = useDebounce(searchTerm, 400);

    // Fetch KPIs using the same logic as the Workers page
    const { data: kpis, isLoading: kpisLoading } = useClientWorkerKpis(
        selectedEmpresaId || '',
        debouncedSearch || null,
        clienteFilters.length > 0 ? clienteFilters : null,
        null,
        null
    );

    // Lista dinâmica de clientes e contratantes únicos
    const clients = useMemo(() => {
        const set = new Set<string>();
        (statuses || []).forEach(s => {
            if (s.origem_cliente_nome) set.add(s.origem_cliente_nome);
        });
        return Array.from(set).sort();
    }, [statuses]);

    const contratantes = useMemo(() => {
        const set = new Set<string>();
        (statuses || []).forEach(s => {
            const cont = s.origem_contratante || s.worker?.contratante;
            if (cont) set.add(cont.trim());
        });
        return Array.from(set).sort();
    }, [statuses]);

    // Filtragem e Ordenação
    const filteredStatuses = useMemo(() => {
        const list = (statuses || []).filter(s => {
            // Busca textual
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchesSearch = 
                    s.worker.nome.toLowerCase().includes(search) ||
                    s.worker.cod_colab.toLowerCase().includes(search) ||
                    s.origem.toLowerCase().includes(search) ||
                    (s.origem_cliente_nome && s.origem_cliente_nome.toLowerCase().includes(search)) ||
                    (s.origem_contratante && s.origem_contratante.toLowerCase().includes(search)) ||
                    (s.worker.niss && s.worker.niss.toLowerCase().includes(search)) ||
                    (s.lembrete_postit && s.lembrete_postit.toLowerCase().includes(search));
                if (!matchesSearch) return false;
            }

            // Filtro por Cliente
            if (clienteFilters.length > 0) {
                if (!s.origem_cliente_nome || !clienteFilters.includes(s.origem_cliente_nome)) return false;
            }

            // Filtro por Contratante
            if (contratanteFilter !== 'all') {
                const cont = (s.origem_contratante || s.worker?.contratante || '').toLowerCase();
                if (!cont.includes(contratanteFilter.toLowerCase())) return false;
            }

            // Filtro por Tipo de Evento
            if (tipoEventoFilter !== 'all') {
                if (s.tipo_evento !== tipoEventoFilter) return false;
            }

            // Filtro por Post-it
            if (hasPostitFilter === 'with_postit') {
                if (!s.lembrete_postit || s.lembrete_postit.trim() === '') return false;
            } else if (hasPostitFilter === 'without_postit') {
                if (s.lembrete_postit && s.lembrete_postit.trim() !== '') return false;
            }

            return true;
        });

        // Ordenação
        return list.sort((a, b) => {
            if (sortOrder === 'target_date_asc' || sortOrder === 'target_date_desc') {
                const dateA = a.data_alvo_execucao ? new Date(a.data_alvo_execucao).getTime() : 9999999999999;
                const dateB = b.data_alvo_execucao ? new Date(b.data_alvo_execucao).getTime() : 9999999999999;
                return sortOrder === 'target_date_asc' ? dateA - dateB : dateB - dateA;
            } else if (sortOrder === 'req_date_desc') {
                const dateA = a.data_solicitacao ? new Date(a.data_solicitacao).getTime() : 0;
                const dateB = b.data_solicitacao ? new Date(b.data_solicitacao).getTime() : 0;
                return dateB - dateA;
            } else if (sortOrder === 'worker_asc') {
                return (a.worker.nome || '').localeCompare(b.worker.nome || '');
            }
            return 0;
        });
    }, [statuses, searchTerm, clienteFilters, contratanteFilter, tipoEventoFilter, hasPostitFilter, sortOrder]);

    const pendentes = filteredStatuses.filter(s => s.status === 'pendente');
    const confirmados = filteredStatuses.filter(s => s.status === 'confirmado');
    const erros = filteredStatuses.filter(s => s.status === 'erro');

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Carregando fila de seguridade social...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Erro ao carregar dados
                </h2>
                <p>Não foi possível buscar a fila de seguridade social. Tente novamente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        Seguridade Social
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gestão centralizada de fluxo contábil: controle cronológico de Altas e Baixas com empresa e datas-alvo de efetivação.
                    </p>
                </div>
            </header>

            {/* KPIs Section */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="shadow-sm border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Total Ativos
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">
                            {kpisLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : kpis?.ativos || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Trabalhadores na empresa
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-emerald-500 hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Ativos de Alta
                        </CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-emerald-600">
                            {kpisLoading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500/50" /> : kpis?.seguridade_alta || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Completamente regularizados
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-amber-500 hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider" title="Pendente de Alta">
                            Pendente de Alta
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-amber-600">
                            {kpisLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-500/50" /> : kpis?.seguridade_pendente_alta || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Aguardando documentação de Alta
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-rose-500 hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider" title="Pendente de Baixa">
                            Pendente de Baixa
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-rose-600">
                            {kpisLoading ? <Loader2 className="h-4 w-4 animate-spin text-rose-500/50" /> : kpis?.seguridade_pendente_baixa || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Aguardando documentação de Baixa
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-purple-500 hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider" title="Em Regularização">
                            Em Regularização
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-purple-600">
                            {kpisLoading ? <Loader2 className="h-4 w-4 animate-spin text-purple-500/50" /> : kpis?.seguridade_em_regularizacao || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Trabalhadores em processo de acerto
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar de Busca, Filtros e Ordenação */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                    {/* Input de Busca */}
                    <div className="relative lg:col-span-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar trabalhador, cód, NISS, post-it..."
                            className="pl-9 bg-white dark:bg-slate-950 h-9 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filtro por Tipo de Evento */}
                    <div className="lg:col-span-2">
                        <Select value={tipoEventoFilter} onValueChange={setTipoEventoFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-9 text-xs">
                                <SelectValue placeholder="Tipo de Evento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Eventos</SelectItem>
                                <SelectItem value="alta">🟢 Apenas Altas</SelectItem>
                                <SelectItem value="baixa">🔴 Apenas Baixas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filtro por Contratante */}
                    <div className="lg:col-span-2">
                        <Select value={contratanteFilter} onValueChange={setContratanteFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-9 text-xs">
                                <SelectValue placeholder="Empresa Contratante" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Empresas</SelectItem>
                                {contratantes.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filtro por Cliente */}
                    <div className="lg:col-span-4">
                        <MultiSelect
                            options={clients.map(c => ({ value: c, label: c }))}
                            selected={clienteFilters}
                            onChange={setClienteFilters}
                            placeholder="Filtrar por Cliente"
                            emptyText="Nenhum cliente encontrado"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filtro de Post-it */}
                        <div className="w-[180px]">
                            <Select value={hasPostitFilter} onValueChange={setHasPostitFilter}>
                                <SelectTrigger className="bg-white dark:bg-slate-950 h-8 text-xs">
                                    <SelectValue placeholder="Post-its" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Cards</SelectItem>
                                    <SelectItem value="with_postit">📌 Com Post-it</SelectItem>
                                    <SelectItem value="without_postit">Sem Post-it</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ordenação */}
                        <div className="w-[230px]">
                            <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                                <SelectTrigger className="bg-white dark:bg-slate-950 h-8 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                                    <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="target_date_asc">📅 Data Efetivação (Mais Urgentes)</SelectItem>
                                    <SelectItem value="target_date_desc">📅 Data Efetivação (Mais Distantes)</SelectItem>
                                    <SelectItem value="req_date_desc">🕒 Data de Solicitação (Recentes)</SelectItem>
                                    <SelectItem value="worker_asc">👤 Nome do Trabalhador (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(searchTerm || clienteFilters.length > 0 || contratanteFilter !== 'all' || tipoEventoFilter !== 'all' || hasPostitFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setClienteFilters([]);
                                    setContratanteFilter('all');
                                    setTipoEventoFilter('all');
                                    setHasPostitFilter('all');
                                }}
                                className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Limpar Filtros
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-2 font-medium">
                            {filteredStatuses.length} processo(s)
                        </span>
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
                            <Button
                                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('kanban')}
                                className="h-7 text-xs px-2.5"
                            >
                                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                                Kanban
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="h-7 text-xs px-2.5"
                            >
                                <List className="h-3.5 w-3.5 mr-1.5" />
                                Lista
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban / Lista View */}
            {viewMode === 'kanban' ? (
                <main className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Board Column: Pendentes */}
                    <div className="flex flex-col gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b pb-2.5 px-1">
                            <h2 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse"></span>
                                Ação Pendente
                            </h2>
                            <Badge variant="secondary" className="font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300">
                                {pendentes.length}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                            {pendentes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-12 gap-2">
                                    <CheckCircle2 className="h-6 w-6 text-slate-300" />
                                    <span>Nenhuma pendência para os filtros aplicados.</span>
                                </div>
                            ) : (
                                pendentes.map(item => (
                                    <PremiumStatusCard 
                                        key={item.id} 
                                        item={item} 
                                        onProcessar={handleProcessar}
                                        onEditPostit={handleOpenPostit}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Board Column: Em Erro (Atenção Requerida) */}
                    <div className="flex flex-col gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b pb-2.5 px-1">
                            <h2 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <span className="h-2.5 w-2.5 rounded-full bg-destructive shadow-sm"></span>
                                Atenção Requerida
                            </h2>
                            <Badge variant="secondary" className="font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300">
                                {erros.length}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                            {erros.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-12 gap-2">
                                    <ShieldCheck className="h-6 w-6 text-emerald-400/50" />
                                    <span>Nenhum erro reportado.</span>
                                </div>
                            ) : (
                                erros.map(item => (
                                    <PremiumStatusCard 
                                        key={item.id} 
                                        item={item} 
                                        onProcessar={handleProcessar}
                                        onEditPostit={handleOpenPostit}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Board Column: Confirmados (Recent) */}
                    <div className="flex flex-col gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b pb-2.5 px-1">
                            <h2 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                                Confirmados (Efetivados)
                            </h2>
                            <Badge variant="secondary" className="font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                {confirmados.length}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                            {confirmados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-12 gap-2">
                                    <Calendar className="h-6 w-6 text-slate-300" />
                                    <span>Nenhum item confirmado recentemente.</span>
                                </div>
                            ) : (
                                confirmados.map(item => (
                                    <PremiumStatusCard 
                                        key={item.id} 
                                        item={item} 
                                        onProcessar={handleProcessar}
                                        onEditPostit={handleOpenPostit}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </main>
            ) : (
                <Card className="shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status / Evento</TableHead>
                                <TableHead>Data de Efetivação</TableHead>
                                <TableHead>Contratante (Portal)</TableHead>
                                <TableHead>Trabalhador</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Lembrete (Post-it)</TableHead>
                                <TableHead>Data Solícita</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStatuses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                                        Nenhum registro encontrado buscando pelos filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStatuses.map((item) => {
                                    const isAlta = item.tipo_evento === 'alta';
                                    const isPendente = item.status === 'pendente';
                                    const targetInfo = getTargetDateInfo(item.data_alvo_execucao, isAlta);
                                    const contratante = item.origem_contratante || item.worker.contratante || 'N/A';
                                    const contratanteBadgeClass = getContratanteBadgeClass(contratante);

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${item.status === 'pendente' ? 'bg-amber-500' : item.status === 'confirmado' ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
                                                    <Badge variant={isAlta ? 'default' : 'destructive'} className="uppercase text-[10px] tracking-wider font-semibold">
                                                        {item.tipo_evento}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-xs ${targetInfo.badgeClass}`}>
                                                    {targetInfo.badgeText}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`font-semibold text-xs ${contratanteBadgeClass}`}>
                                                    🏢 {contratante}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-sm">{item.worker.nome}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{item.worker.cod_colab}</div>
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {item.origem_cliente_nome || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {item.lembrete_postit ? (
                                                    <div 
                                                        onClick={() => handleOpenPostit(item)}
                                                        className="cursor-pointer group flex items-start gap-1.5 p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 max-w-[220px]"
                                                        title="Clique para editar lembrete"
                                                    >
                                                        <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                                        <span className="text-xs text-amber-900 dark:text-amber-200 line-clamp-1 group-hover:underline">
                                                            {item.lembrete_postit}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleOpenPostit(item)}
                                                        className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                                                    >
                                                        + Post-it
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatDateBR(item.data_solicitacao)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant={isPendente ? 'default' : 'secondary'} className="h-8 text-xs font-semibold" onClick={() => handleProcessar(item)}>
                                                    {isPendente ? 'Tratar' : 'Detalhes'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Modal de Processamento */}
            <ProcessarSeguridadeDialog 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                item={selectedItem} 
            />

            {/* Modal de Post-it / Lembrete Rápido da Tarefa */}
            <Dialog open={postitDialogOpen} onOpenChange={setPostitDialogOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <StickyNote className="h-5 w-5" />
                            Lembrete da Tarefa (Post-it)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {activePostitItem ? `${activePostitItem.worker.nome} (${activePostitItem.worker.cod_colab})` : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 shadow-inner">
                            <label className="text-xs font-semibold text-amber-900 dark:text-amber-200 block mb-1.5">
                                📌 Anote instruções, lembretes ou condições antes da efetivação:
                            </label>
                            <Textarea
                                value={postitText}
                                onChange={(e) => setPostitText(e.target.value)}
                                placeholder="Ex: Entrar no portal da Luminous no dia 05/09 para emitir a alta. Conferir NIF antes de finalizar..."
                                className="bg-white/80 dark:bg-slate-900/80 border-amber-300 dark:border-amber-800 text-sm min-h-[110px] focus-visible:ring-amber-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
                        {postitText ? (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() => setPostitText('')}
                            >
                                Limpar Post-it
                            </Button>
                        ) : <div></div>}

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPostitDialogOpen(false)} disabled={savingPostit}>
                                Cancelar
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleSavePostit} 
                                disabled={savingPostit}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                                {savingPostit ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                                Salvar Post-it
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Card Premium do Kanban
function PremiumStatusCard({ 
    item, 
    onProcessar, 
    onEditPostit 
}: { 
    item: SeguridadeStatusWithWorker; 
    onProcessar: (item: SeguridadeStatusWithWorker) => void;
    onEditPostit: (item: SeguridadeStatusWithWorker, e?: React.MouseEvent) => void;
}) {
    const isAlta = item.tipo_evento === 'alta';
    const isPendente = item.status === 'pendente';
    
    // Formatar rótulo de tipo
    const badgeText = isPendente 
        ? (isAlta ? 'Pendente Alta' : 'Pendente Baixa') 
        : item.tipo_evento;

    // Calcular data alvo de execução e urgência
    const targetInfo = getTargetDateInfo(item.data_alvo_execucao, isAlta);

    // Contratante
    const contratante = item.origem_contratante || item.worker.contratante || 'LUMINOUS';
    const contratanteBadgeClass = getContratanteBadgeClass(contratante);

    return (
        <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4 ${
            isAlta ? 'border-l-emerald-500 hover:border-emerald-400' : 'border-l-rose-500 hover:border-rose-400'
        } bg-white dark:bg-slate-950`}>
            
            {/* Header com Badges de Tipo e Empresa Contratante */}
            <CardHeader className="p-3.5 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge 
                            variant={isAlta ? 'default' : 'destructive'} 
                            className="uppercase text-[10px] tracking-wider font-extrabold px-2 py-0.5"
                        >
                            {badgeText}
                        </Badge>
                        <Badge 
                            variant="outline" 
                            className={`text-[10px] font-bold tracking-tight uppercase px-2 py-0.5 ${contratanteBadgeClass}`}
                            title={`Contratante para acesso ao portal: ${contratante}`}
                        >
                            🏢 {contratante}
                        </Badge>
                    </div>
                </div>

                <div className="mt-2">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
                        {item.worker.nome}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                            {item.worker.cod_colab}
                        </span>
                        {item.worker.funcion && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[170px]" title={item.worker.funcion}>
                                • {item.worker.funcion}
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-3.5 pt-1 space-y-2.5">
                {/* Cliente */}
                {item.origem_cliente_nome && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-900 p-1.5 rounded border border-slate-200/60 dark:border-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{item.origem_cliente_nome}</span>
                    </div>
                )}

                {/* Destaque Principal: DATA ALVO DE EXECUÇÃO */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {isAlta ? 'Data de Início (Efetivação)' : 'Data de Saída (Efetivação)'}:
                        </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {targetInfo.formatted}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.2 ${targetInfo.badgeClass}`}>
                            {targetInfo.badgeText}
                        </Badge>
                    </div>
                </div>

                {/* Widget de Post-it (Lembrete da Tarefa) */}
                {item.lembrete_postit ? (
                    <div 
                        onClick={(e) => onEditPostit(item, e)}
                        className="group relative cursor-pointer p-2 rounded-md bg-amber-100/75 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 shadow-sm hover:border-amber-400 transition-colors"
                        title="Clique para editar este lembrete"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                Lembrete / Post-it
                            </span>
                            <Pencil className="h-2.5 w-2.5 text-amber-700 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-100 font-medium line-clamp-3 leading-relaxed whitespace-pre-wrap">
                            {item.lembrete_postit}
                        </p>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => onEditPostit(item, e)}
                        className="w-full text-left flex items-center justify-between py-1.5 px-2 rounded-md text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-dashed border-slate-300 dark:border-slate-800 hover:border-amber-300 transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <StickyNote className="h-3 w-3" />
                            + Adicionar Post-it / Lembrete
                        </span>
                        <span className="text-[10px] opacity-60">📌</span>
                    </button>
                )}

                {/* Rodapé do Card */}
                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-muted-foreground">
                    <span>
                        Req: {formatDateBR(item.data_solicitacao)}
                    </span>
                    {item.autor_inativacao && (
                        <span className="truncate max-w-[110px]" title={`Solicitado por: ${item.autor_inativacao}`}>
                            {item.autor_inativacao}
                        </span>
                    )}
                </div>

                <div className="pt-1">
                    <Button 
                        size="sm" 
                        variant={isPendente ? 'default' : 'outline'} 
                        className={`w-full text-xs font-semibold h-8 ${
                            isPendente 
                                ? (isAlta ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white')
                                : ''
                        }`} 
                        onClick={() => onProcessar(item)}
                    >
                        {item.status === 'confirmado' ? (
                            <>
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                                Ver Detalhes
                            </>
                        ) : (
                            <>
                                Tratar Processo
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
