import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { useClientHoursSummary } from './hooks/useClientHoursSummary';
import { Loader2, FileText, ChevronRight, Users, Clock, Upload, CheckCircle, CheckCircle2, Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { useUniqueContratantes } from '../workers/hooks/useUniqueContratantes';
import { useUniqueClients } from '../workers/hooks/useUniqueClients';
import { Combobox } from '../../components/ui/combobox';
import { MultiSelect } from '../../components/ui/multi-select';
import { useTranslation } from 'react-i18next';
import { ExportPendingHoursDialog } from './components/ExportPendingHoursDialog';
import { ExportHoursControlWorkersDialog } from './components/ExportHoursControlWorkersDialog';

export function HoursControlPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { selectedEmpresaId } = useEmpresa();
    const [searchParams, setSearchParams] = useSearchParams();

    // Default to previous month
    const currentDate = new Date();
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    const getInitialPeriod = () => {
        const paramYear = searchParams.get('year');
        const paramMonth = searchParams.get('month');
        if (paramYear && paramMonth) {
            return { year: parseInt(paramYear), month: parseInt(paramMonth) };
        }
        try {
            const stored = localStorage.getItem('mcs:selectedPeriod');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.year && parsed.month) {
                    return { year: parsed.year, month: parsed.month };
                }
            }
        } catch (e) {
            console.error("Error reading stored period in HoursControlPage", e);
        }
        return { year: prevMonthDate.getFullYear(), month: prevMonthDate.getMonth() + 1 };
    };

    const initialPeriod = getInitialPeriod();
    const periodYear = initialPeriod.year;
    const periodMonth = initialPeriod.month;

    // Sync selectors to page URL and localStorage
    useEffect(() => {
        const paramYear = searchParams.get('year');
        const paramMonth = searchParams.get('month');
        if (paramYear !== periodYear.toString() || paramMonth !== periodMonth.toString()) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('year', periodYear.toString());
            newParams.set('month', periodMonth.toString());
            setSearchParams(newParams, { replace: true });
        }
        localStorage.setItem('mcs:selectedPeriod', JSON.stringify({ year: periodYear, month: periodMonth }));
    }, [periodYear, periodMonth, searchParams, setSearchParams]);

    const clientFilter = searchParams.get('clientFilter')?.split('||').filter(Boolean) || [];
    const contratanteFilter = searchParams.get('contratante') || null;
    const workerStatusFilter = searchParams.get('workerStatus') || 'all';
    
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            const newParams = new URLSearchParams(searchParams);
            if (searchQuery.trim()) {
                newParams.set('q', searchQuery.trim());
            } else {
                newParams.delete('q');
            }
            setSearchParams(newParams, { replace: true });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchParams, setSearchParams]);


    const updateSearchParams = (updates: Record<string, string | string[] | null>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '' || (Array.isArray(value) && value.length === 0) || value === 'all') {
                newParams.delete(key);
            } else if (Array.isArray(value)) {
                newParams.set(key, value.join('||'));
            } else {
                newParams.set(key, value);
            }
        });
        setSearchParams(newParams, { replace: true });
    };

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    const { data: contratantes } = useUniqueContratantes();
    const { data: clientsList } = useUniqueClients();
    const { data: clients, isLoading, isError, error } = useClientHoursSummary(periodYear, periodMonth, contratanteFilter, debouncedQuery);

    // Filter controls
    const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
    const months = Array.from({ length: 12 }, (_, i) => {
        const locale = i18n.language.startsWith('es') ? 'es-ES' : 'pt-BR';
        return {
            value: i + 1,
            label: new Date(2000, i, 1).toLocaleString(locale, { month: 'long' }).toUpperCase()
        };
    });

    const filteredClients = (clients || []).filter(c => {
        // 1. Client filter
        if (clientFilter.length > 0 && !clientFilter.some(filtro => c.cliente_nombre?.toLowerCase() === filtro.toLowerCase())) {
            return false;
        }

        // 2. Worker Status filter
        if (workerStatusFilter === 'active' && !c.has_active_workers) return false;
        if (workerStatusFilter === 'inactive' && !c.has_inactive_workers) return false;

        return true;
    });

    type KpiFilterType = 'all' | 'pendentes' | 'enviadas' | 'validadas' | 'finalizados';
    const kpiFilter = (searchParams.get('kpi') as KpiFilterType) || 'all';

    const handleKpiFilterToggle = (filter: KpiFilterType) => {
        updateSearchParams({ kpi: filter === kpiFilter ? 'all' : filter });
    };

    const calculateStatus = (summary: any) => {
        if (summary.pending_hours > 0) return 'processing'; // Still waiting for some workers
        if (summary.submitted_hours > 0) return 'review'; // Waiting for admin validation
        return 'completed'; // All validated
    };

    const clientsWithPending = filteredClients.filter(c => (c.pending_hours || 0) > 0).length;
    const clientsWithSubmitted = filteredClients.filter(c => (c.submitted_hours || 0) > 0).length;
    const clientsWithValidated = filteredClients.filter(c => (c.validated_hours || 0) > 0).length;
    const completedClients = filteredClients.filter(c => calculateStatus(c) === 'completed' && (c.total_workers || 0) > 0);

    const kpis = {
        ativos: filteredClients.reduce((acc, c) => acc + (c.total_workers || 0), 0),
        pendentes: filteredClients.reduce((acc, c) => acc + (c.pending_hours || 0), 0),
        enviadas: filteredClients.reduce((acc, c) => acc + (c.submitted_hours || 0), 0),
        validadas: filteredClients.reduce((acc, c) => acc + (c.validated_hours || 0), 0),
        finalizados: completedClients.length,
        finalizadosTrabalhadores: completedClients.reduce((acc, c) => acc + (c.total_workers || 0), 0),
    };

    const displayedClients = filteredClients.filter(c => {
        if (kpiFilter === 'pendentes') return (c.pending_hours || 0) > 0;
        if (kpiFilter === 'enviadas') return (c.submitted_hours || 0) > 0;
        if (kpiFilter === 'validadas') return (c.validated_hours || 0) > 0;
        if (kpiFilter === 'finalizados') return calculateStatus(c) === 'completed' && (c.total_workers || 0) > 0;
        return true;
    });

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-3">
            {portalNode && createPortal(
                <div className="flex w-[90%] md:w-full items-center justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight">{t('hoursControl.title')}</h1>
                        <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">{t('hoursControl.subtitle')}</span>
                    </div>
                    {selectedEmpresaId && (
                        <div className="flex gap-2">
                            <ExportHoursControlWorkersDialog 
                                periodYear={periodYear}
                                periodMonth={periodMonth}
                                contratanteFilter={contratanteFilter}
                                clientFilter={clientFilter}
                                workerStatusFilter={workerStatusFilter}
                                searchQuery={debouncedQuery}
                            />
                            <ExportPendingHoursDialog 
                                periodYear={periodYear}
                                periodMonth={periodMonth}
                                contratanteFilter={contratanteFilter}
                                clientFilter={clientFilter}
                                workerStatusFilter={workerStatusFilter}
                            />
                        </div>
                    )}
                </div>,
                portalNode
            )}

            {/* Fila superior com Seletores e Busca */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between shrink-0 bg-card p-4 rounded-md border shadow-sm">
                <div className="flex gap-4 items-center flex-wrap">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">{t('hoursControl.month')}</label>
                        <Select value={periodMonth.toString()} onValueChange={(v) => updateSearchParams({ month: v })}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">{t('hoursControl.year')}</label>
                        <Select value={periodYear.toString()} onValueChange={(v) => updateSearchParams({ year: v })}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {/* Worker Search */}
                    <div className="space-y-1 ml-0 xl:ml-4 w-full sm:w-80">
                         <label className="text-sm font-medium text-muted-foreground">Pesquisar Trabalhador</label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Nome ou telemóvel..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full lg:w-auto mt-2 xl:mt-0 items-center">

                    <div className="space-y-1">
                        <Select 
                            value={workerStatusFilter} 
                            onValueChange={(v) => updateSearchParams({ workerStatus: v })}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={t('hoursControl.filterStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('hoursControl.statusAll')}</SelectItem>
                                <SelectItem value="active">{t('hoursControl.statusActive')}</SelectItem>
                                <SelectItem value="inactive">{t('hoursControl.statusInactive')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full sm:w-48">
                        <Combobox
                            options={contratantes?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                            value={contratanteFilter}
                            onChange={(val) => updateSearchParams({ contratante: val })}
                            placeholder={t('hoursControl.filterCompany')}
                            emptyText={t('hoursControl.noCompany')}
                        />
                    </div>

                    <div className="w-full sm:w-80">
                        <MultiSelect
                            options={clientsList?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                            selected={clientFilter}
                            onChange={(val) => updateSearchParams({ clientFilter: val })}
                            placeholder={t('hoursControl.filterClient')}
                            emptyText={t('hoursControl.noCompany')}
                        />
                    </div>
                </div>
            </div>

            {/* KPIs Interativos com Filtro Direto */}
            {selectedEmpresaId && !isError && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
                    {/* 1. Ativos no Mês / Todos */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('all')}
                        className={`p-4 rounded-xl border border-l-4 text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'all'
                                ? 'border-l-slate-700 bg-slate-100/90 dark:bg-slate-800/80 shadow-md ring-2 ring-slate-400/50'
                                : 'border-l-slate-400 bg-card hover:bg-muted/50 hover:shadow-sm'
                        }`}
                        title={kpiFilter === 'all' ? 'Exibindo todos os clientes' : 'Filtrar todos os clientes'}
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('hoursControl.kpis.active')}
                            </span>
                            <Users className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="text-2xl font-bold tracking-tight">{kpis.ativos}</span>
                            <span className="text-xs text-muted-foreground font-medium">{filteredClients.length} clientes</span>
                        </div>
                    </button>

                    {/* 2. Faltam Enviar */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('pendentes')}
                        className={`p-4 rounded-xl border border-l-4 text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'pendentes'
                                ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-500/50 border-amber-300 dark:border-amber-700'
                                : 'border-l-amber-400 bg-card hover:bg-amber-50/40 dark:hover:bg-amber-950/20 hover:shadow-sm'
                        }`}
                        title="Filtrar clientes com horas a enviar"
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                {t('hoursControl.kpis.pending')}
                            </span>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                                {kpis.pendentes}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{clientsWithPending} clientes</span>
                        </div>
                    </button>

                    {/* 3. Para Validar */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('enviadas')}
                        className={`p-4 rounded-xl border border-l-4 text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'enviadas'
                                ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/50 border-blue-300 dark:border-blue-700'
                                : 'border-l-blue-400 bg-card hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:shadow-sm'
                        }`}
                        title="Filtrar clientes com horas para validar"
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                {t('hoursControl.kpis.toValidate')}
                            </span>
                            <Upload className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                {kpis.enviadas}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{clientsWithSubmitted} clientes</span>
                        </div>
                    </button>

                    {/* 4. Validadas */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('validadas')}
                        className={`p-4 rounded-xl border border-l-4 text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'validadas'
                                ? 'border-l-green-500 bg-green-50 dark:bg-green-950/40 shadow-md ring-2 ring-green-500/50 border-green-300 dark:border-green-700'
                                : 'border-l-green-400 bg-card hover:bg-green-50/40 dark:hover:bg-green-950/20 hover:shadow-sm'
                        }`}
                        title="Filtrar clientes com horas validadas"
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                                {t('hoursControl.kpis.validated')}
                            </span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                {kpis.validadas}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{clientsWithValidated} clientes</span>
                        </div>
                    </button>

                    {/* 5. Finalizados */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('finalizados')}
                        className={`p-4 rounded-xl border border-l-4 text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'finalizados'
                                ? 'border-l-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/50 border-indigo-300 dark:border-indigo-700'
                                : 'border-l-indigo-500 bg-card hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:shadow-sm'
                        }`}
                        title="Filtrar clientes 100% finalizados"
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                {t('hoursControl.kpis.completed')}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                                {kpis.finalizados}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{kpis.finalizadosTrabalhadores} trab.</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Banner de Filtro Ativo */}
            {selectedEmpresaId && !isError && kpiFilter !== 'all' && (
                <div className="flex items-center justify-between bg-muted/60 px-3.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Filtro de visualização ativo:</span>
                        <Badge variant="secondary" className="font-semibold px-2 py-0.5">
                            {kpiFilter === 'pendentes' && t('hoursControl.kpis.pending')}
                            {kpiFilter === 'enviadas' && t('hoursControl.kpis.toValidate')}
                            {kpiFilter === 'validadas' && t('hoursControl.kpis.validated')}
                            {kpiFilter === 'finalizados' && t('hoursControl.kpis.completed')}
                        </Badge>
                        <span className="text-muted-foreground">({displayedClients.length} de {filteredClients.length} clientes exibidos)</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleKpiFilterToggle('all')}
                    >
                        <X className="h-3 w-3 mr-1" />
                        Limpar filtro
                    </Button>
                </div>
            )}

            {/* Listagem de Clientes */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border">
                <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-md">
                            <TableRow className="border-b-0">
                                <TableHead className="font-semibold text-foreground">{t('hoursControl.table.client')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('hoursControl.table.activeWorkers')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('hoursControl.table.pending')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('hoursControl.table.submitted')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('hoursControl.table.validated')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('hoursControl.table.status')}</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        {t('hoursControl.empty.selectCompany')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>{t('hoursControl.empty.loading')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-destructive">
                                        {t('hoursControl.empty.error')} {error?.message}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && displayedClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        {kpiFilter !== 'all' ? (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <p>Nenhum cliente encontrado para o filtro "{kpiFilter === 'pendentes' ? t('hoursControl.kpis.pending') : kpiFilter === 'enviadas' ? t('hoursControl.kpis.toValidate') : kpiFilter === 'validadas' ? t('hoursControl.kpis.validated') : t('hoursControl.kpis.completed')}".</p>
                                                <Button variant="outline" size="sm" onClick={() => handleKpiFilterToggle('all')}>
                                                    Ver todos os clientes
                                                </Button>
                                            </div>
                                        ) : (
                                            t('hoursControl.empty.noClients')
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && displayedClients.map((client) => {
                                const status = calculateStatus(client);
                                return (
                                    <TableRow
                                        key={client.cliente_nombre}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams);
                                            params.set('year', periodYear.toString());
                                            params.set('month', periodMonth.toString());
                                            if (contratanteFilter) {
                                                params.set('contratante', contratanteFilter);
                                            }
                                            navigate(`/hours-control/client/${encodeURIComponent(client.cliente_nombre)}?${params.toString()}`);
                                        }}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-100 rounded-md">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                {client.cliente_nombre}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{client.total_workers}</TableCell>
                                        <TableCell className="text-center">
                                            {client.pending_hours > 0 ? (
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    {client.pending_hours} {t('hoursControl.badges.missing')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.submitted_hours > 0 ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                    {client.submitted_hours} {t('hoursControl.badges.toValidate')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.validated_hours > 0 ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    {client.validated_hours} {t('hoursControl.badges.ready')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {status === 'processing' && <Badge variant="secondary" className="bg-slate-100">{t('hoursControl.status.collecting')}</Badge>}
                                            {status === 'review' && <Badge variant="default" className="bg-blue-500">{t('hoursControl.status.review')}</Badge>}
                                            {status === 'completed' && <Badge variant="outline" className="border-green-500 text-green-600">{t('hoursControl.status.completed')}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
