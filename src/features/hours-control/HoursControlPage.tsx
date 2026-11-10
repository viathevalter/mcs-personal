import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { useClientHoursSummary } from './hooks/useClientHoursSummary';
import { Loader2, Building2, ChevronRight, Users, Clock, Upload, CheckCircle, CheckCircle2, Search, X, Sparkles } from 'lucide-react';
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
        const locale = i18n.language.startsWith('es') ? 'es-ES' : i18n.language.startsWith('fr') ? 'fr-FR' : 'pt-BR';
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

    const totalClientsCount = filteredClients.length;
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

    const calcPct = (val: number, total: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

    const pctPendentesWorkers = calcPct(kpis.pendentes, kpis.ativos);
    const pctPendentesClients = calcPct(clientsWithPending, totalClientsCount);

    const pctEnviadasWorkers = calcPct(kpis.enviadas, kpis.ativos);
    const pctEnviadasClients = calcPct(clientsWithSubmitted, totalClientsCount);

    const pctValidadasWorkers = calcPct(kpis.validadas, kpis.ativos);
    const pctValidadasClients = calcPct(clientsWithValidated, totalClientsCount);

    const pctFinalizadosClients = calcPct(kpis.finalizados, totalClientsCount);
    const pctFinalizadosWorkers = calcPct(kpis.finalizadosTrabalhadores, kpis.ativos);

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

            {/* Barra de Filtros Executiva */}
            <div className="flex flex-col xl:flex-row gap-3.5 items-start xl:items-end justify-between shrink-0 bg-card/95 backdrop-blur-sm p-3.5 px-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="flex gap-3.5 items-end flex-wrap w-full xl:w-auto">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {t('hoursControl.month')}
                        </label>
                        <Select value={periodMonth.toString()} onValueChange={(v) => updateSearchParams({ month: v })}>
                            <SelectTrigger className="w-[165px] h-9 rounded-xl font-semibold text-xs bg-background">
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
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {t('hoursControl.year')}
                        </label>
                        <Select value={periodYear.toString()} onValueChange={(v) => updateSearchParams({ year: v })}>
                            <SelectTrigger className="w-[105px] h-9 rounded-xl font-semibold text-xs bg-background">
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
                    <div className="space-y-1 flex-1 sm:flex-initial sm:w-72">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {t('hoursControl.searchWorkerLabel')}
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('hoursControl.searchWorkerPlaceholder')}
                                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full xl:w-auto items-center">
                    <Select 
                        value={workerStatusFilter} 
                        onValueChange={(v) => updateSearchParams({ workerStatus: v })}
                    >
                        <SelectTrigger className="w-full sm:w-[155px] h-9 rounded-xl text-xs font-medium bg-background">
                            <SelectValue placeholder={t('hoursControl.filterStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('hoursControl.statusAll')}</SelectItem>
                            <SelectItem value="active">{t('hoursControl.statusActive')}</SelectItem>
                            <SelectItem value="inactive">{t('hoursControl.statusInactive')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="w-full sm:w-44">
                        <Combobox
                            options={contratantes?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                            value={contratanteFilter}
                            onChange={(val) => updateSearchParams({ contratante: val })}
                            placeholder={t('hoursControl.filterCompany')}
                            emptyText={t('hoursControl.noCompany')}
                        />
                    </div>

                    <div className="w-full sm:w-64">
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

            {/* Galeria de KPIs Executivos Interativos */}
            {selectedEmpresaId && !isError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                    {/* 1. Ativos no Mês / Todos */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('all')}
                        title={t('hoursControl.kpis.tooltipAll')}
                        className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'all'
                                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-800 shadow-lg shadow-slate-900/15 ring-2 ring-slate-900/20 dark:from-slate-100 dark:to-slate-200 dark:text-slate-900'
                                : 'bg-card hover:bg-slate-50/80 dark:hover:bg-slate-900/40 border-border/80 hover:border-slate-300 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                                kpiFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.active')}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    kpiFilter === 'all'
                                        ? 'bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                    100%
                                </span>
                                <div className={`p-1.5 rounded-xl ${
                                    kpiFilter === 'all' ? 'bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                    <Users className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>

                        <div className="my-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight leading-none">{kpis.ativos}</span>
                            <span className={`text-xs font-semibold truncate ${
                                kpiFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.workers')}
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-current/10">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={kpiFilter === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-600 dark:text-slate-400'}>
                                    <Building2 className="h-3 w-3 inline mr-1 opacity-75" />
                                    {totalClientsCount} {t('hoursControl.kpis.clients')}
                                </span>
                                <span className={`text-[10px] ${kpiFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'}`}>
                                    100%
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                                kpiFilter === 'all' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                    kpiFilter === 'all' ? 'bg-emerald-400 dark:bg-slate-900' : 'bg-slate-600'
                                }`} style={{ width: '100%' }} />
                            </div>
                        </div>
                    </button>

                    {/* 2. Faltam Enviar */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('pendentes')}
                        title={t('hoursControl.kpis.tooltipPending')}
                        className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'pendentes'
                                ? 'bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 text-white border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30'
                                : 'bg-gradient-to-br from-amber-50/50 via-card to-card dark:from-amber-950/20 dark:to-card border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                                kpiFilter === 'pendentes' ? 'text-amber-50' : 'text-amber-800 dark:text-amber-300'
                            }`}>
                                {t('hoursControl.kpis.pending')}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    kpiFilter === 'pendentes'
                                        ? 'bg-white/25 text-white'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                }`}>
                                    {pctPendentesWorkers}%
                                </span>
                                <div className={`p-1.5 rounded-xl ${
                                    kpiFilter === 'pendentes' ? 'bg-white/20 text-white' : 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                                }`}>
                                    <Clock className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>

                        <div className="my-2 flex items-baseline gap-1.5">
                            <span className={`text-3xl font-black tracking-tight leading-none ${
                                kpiFilter === 'pendentes' ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                                {kpis.pendentes}
                            </span>
                            <span className={`text-xs font-semibold truncate ${
                                kpiFilter === 'pendentes' ? 'text-amber-100' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.ofTotalWorkers', { total: kpis.ativos })}
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-current/10">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={kpiFilter === 'pendentes' ? 'text-white' : 'text-amber-900/80 dark:text-amber-200'}>
                                    <Building2 className="h-3 w-3 inline mr-1 opacity-75" />
                                    {clientsWithPending} {t('hoursControl.kpis.ofTotalClients', { total: totalClientsCount })}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                    kpiFilter === 'pendentes' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                    {pctPendentesClients}% {t('hoursControl.kpis.clients')}
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                                kpiFilter === 'pendentes' ? 'bg-black/20' : 'bg-amber-100 dark:bg-amber-950'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                    kpiFilter === 'pendentes' ? 'bg-white' : 'bg-amber-500'
                                }`} style={{ width: `${Math.max(pctPendentesWorkers, kpis.pendentes > 0 ? 4 : 0)}%` }} />
                            </div>
                        </div>
                    </button>

                    {/* 3. Para Validar */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('enviadas')}
                        title={t('hoursControl.kpis.tooltipToValidate')}
                        className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'enviadas'
                                ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/25 ring-2 ring-blue-500/30'
                                : 'bg-gradient-to-br from-blue-50/50 via-card to-card dark:from-blue-950/20 dark:to-card border-blue-200/80 dark:border-blue-800/50 hover:border-blue-400 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                                kpiFilter === 'enviadas' ? 'text-blue-100' : 'text-blue-800 dark:text-blue-300'
                            }`}>
                                {t('hoursControl.kpis.toValidate')}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    kpiFilter === 'enviadas'
                                        ? 'bg-white/25 text-white'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                }`}>
                                    {pctEnviadasWorkers}%
                                </span>
                                <div className={`p-1.5 rounded-xl ${
                                    kpiFilter === 'enviadas' ? 'bg-white/20 text-white' : 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                }`}>
                                    <Upload className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>

                        <div className="my-2 flex items-baseline gap-1.5">
                            <span className={`text-3xl font-black tracking-tight leading-none ${
                                kpiFilter === 'enviadas' ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                            }`}>
                                {kpis.enviadas}
                            </span>
                            <span className={`text-xs font-semibold truncate ${
                                kpiFilter === 'enviadas' ? 'text-blue-100' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.ofTotalWorkers', { total: kpis.ativos })}
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-current/10">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={kpiFilter === 'enviadas' ? 'text-white' : 'text-blue-900/80 dark:text-blue-200'}>
                                    <Building2 className="h-3 w-3 inline mr-1 opacity-75" />
                                    {clientsWithSubmitted} {t('hoursControl.kpis.ofTotalClients', { total: totalClientsCount })}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                    kpiFilter === 'enviadas' ? 'text-blue-100' : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                    {pctEnviadasClients}% {t('hoursControl.kpis.clients')}
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                                kpiFilter === 'enviadas' ? 'bg-black/20' : 'bg-blue-100 dark:bg-blue-950'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                    kpiFilter === 'enviadas' ? 'bg-white' : 'bg-blue-600'
                                }`} style={{ width: `${Math.max(pctEnviadasWorkers, kpis.enviadas > 0 ? 4 : 0)}%` }} />
                            </div>
                        </div>
                    </button>

                    {/* 4. Validadas */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('validadas')}
                        title={t('hoursControl.kpis.tooltipValidated')}
                        className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'validadas'
                                ? 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                                : 'bg-gradient-to-br from-emerald-50/50 via-card to-card dark:from-emerald-950/20 dark:to-card border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                                kpiFilter === 'validadas' ? 'text-emerald-100' : 'text-emerald-800 dark:text-emerald-300'
                            }`}>
                                {t('hoursControl.kpis.validated')}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    kpiFilter === 'validadas'
                                        ? 'bg-white/25 text-white'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                }`}>
                                    {pctValidadasWorkers}%
                                </span>
                                <div className={`p-1.5 rounded-xl ${
                                    kpiFilter === 'validadas' ? 'bg-white/20 text-white' : 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                }`}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>

                        <div className="my-2 flex items-baseline gap-1.5">
                            <span className={`text-3xl font-black tracking-tight leading-none ${
                                kpiFilter === 'validadas' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                                {kpis.validadas}
                            </span>
                            <span className={`text-xs font-semibold truncate ${
                                kpiFilter === 'validadas' ? 'text-emerald-100' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.ofTotalWorkers', { total: kpis.ativos })}
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-current/10">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={kpiFilter === 'validadas' ? 'text-white' : 'text-emerald-900/80 dark:text-emerald-200'}>
                                    <Building2 className="h-3 w-3 inline mr-1 opacity-75" />
                                    {clientsWithValidated} {t('hoursControl.kpis.ofTotalClients', { total: totalClientsCount })}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                    kpiFilter === 'validadas' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'
                                }`}>
                                    {pctValidadasClients}% {t('hoursControl.kpis.clients')}
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                                kpiFilter === 'validadas' ? 'bg-black/20' : 'bg-emerald-100 dark:bg-emerald-950'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                    kpiFilter === 'validadas' ? 'bg-white' : 'bg-emerald-500'
                                }`} style={{ width: `${Math.max(pctValidadasWorkers, kpis.validadas > 0 ? 4 : 0)}%` }} />
                            </div>
                        </div>
                    </button>

                    {/* 5. Finalizados (100% Concluídos) */}
                    <button
                        type="button"
                        onClick={() => handleKpiFilterToggle('finalizados')}
                        title={t('hoursControl.kpis.tooltipCompleted')}
                        className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                            kpiFilter === 'finalizados'
                                ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white border-indigo-600 shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-500/30'
                                : 'bg-gradient-to-br from-indigo-50/60 via-violet-50/30 to-card dark:from-indigo-950/30 dark:to-card border-indigo-200/90 dark:border-indigo-800/60 hover:border-indigo-400 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate flex items-center gap-1 ${
                                kpiFilter === 'finalizados' ? 'text-indigo-100' : 'text-indigo-800 dark:text-indigo-300'
                            }`}>
                                <Sparkles className="h-3 w-3 shrink-0" />
                                {t('hoursControl.kpis.completed')}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    kpiFilter === 'finalizados'
                                        ? 'bg-white/25 text-white'
                                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                                }`}>
                                    {pctFinalizadosClients}%
                                </span>
                                <div className={`p-1.5 rounded-xl ${
                                    kpiFilter === 'finalizados' ? 'bg-white/20 text-white' : 'bg-indigo-100/80 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                }`}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>

                        <div className="my-2 flex items-baseline gap-1.5">
                            <span className={`text-3xl font-black tracking-tight leading-none ${
                                kpiFilter === 'finalizados' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
                            }`}>
                                {kpis.finalizados}
                            </span>
                            <span className={`text-xs font-semibold truncate ${
                                kpiFilter === 'finalizados' ? 'text-indigo-100' : 'text-muted-foreground'
                            }`}>
                                {t('hoursControl.kpis.ofTotalClients', { total: totalClientsCount })}
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-current/10">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={kpiFilter === 'finalizados' ? 'text-white' : 'text-indigo-950/80 dark:text-indigo-200'}>
                                    <Users className="h-3 w-3 inline mr-1 opacity-75" />
                                    {kpis.finalizadosTrabalhadores} / {kpis.ativos} {t('hoursControl.kpis.workersShort')}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                    kpiFilter === 'finalizados' ? 'text-indigo-100' : 'text-indigo-700 dark:text-indigo-300'
                                }`}>
                                    {pctFinalizadosWorkers}% {t('hoursControl.kpis.workersShort')}
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                                kpiFilter === 'finalizados' ? 'bg-black/20' : 'bg-indigo-100 dark:bg-indigo-950'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                    kpiFilter === 'finalizados' ? 'bg-white' : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                                }`} style={{ width: `${Math.max(pctFinalizadosClients, kpis.finalizados > 0 ? 4 : 0)}%` }} />
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* Banner de Filtro Ativo */}
            {selectedEmpresaId && !isError && kpiFilter !== 'all' && (
                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/50 dark:from-indigo-950/40 dark:to-slate-900/40 px-4 py-2 rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 text-xs font-medium shrink-0 animate-in fade-in duration-200 shadow-2xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                        <span className="text-muted-foreground font-semibold">{t('hoursControl.filterBanner.activeLabel')}</span>
                        <Badge variant="secondary" className="font-bold px-2.5 py-0.5 bg-white dark:bg-slate-800 border shadow-2xs text-foreground">
                            {kpiFilter === 'pendentes' && t('hoursControl.kpis.pending')}
                            {kpiFilter === 'enviadas' && t('hoursControl.kpis.toValidate')}
                            {kpiFilter === 'validadas' && t('hoursControl.kpis.validated')}
                            {kpiFilter === 'finalizados' && t('hoursControl.kpis.completed')}
                        </Badge>
                        <span className="text-muted-foreground font-medium">
                            {t('hoursControl.filterBanner.showingCount', {
                                shown: displayedClients.length,
                                total: totalClientsCount,
                                pct: calcPct(displayedClients.length, totalClientsCount)
                            })}
                        </span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 rounded-lg"
                        onClick={() => handleKpiFilterToggle('all')}
                    >
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t('hoursControl.filterBanner.clearFilter')}
                    </Button>
                </div>
            )}

            {/* Listagem Executiva de Clientes */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border/80 rounded-2xl shadow-xs">
                <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 shadow-2xs backdrop-blur-md">
                            <TableRow className="border-b border-border/60">
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground pl-4">{t('hoursControl.table.client')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('hoursControl.table.activeWorkers')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('hoursControl.table.pending')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('hoursControl.table.submitted')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('hoursControl.table.validated')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center w-[150px]">{t('hoursControl.table.progress')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('hoursControl.table.status')}</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        {t('hoursControl.empty.selectCompany')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>{t('hoursControl.empty.loading')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-destructive">
                                        {t('hoursControl.empty.error')} {error?.message}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && displayedClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                                        {kpiFilter !== 'all' ? (
                                            <div className="flex flex-col items-center justify-center gap-2.5">
                                                <p className="text-sm font-medium">
                                                    {t('hoursControl.filterBanner.emptyFilter', {
                                                        filter: kpiFilter === 'pendentes'
                                                            ? t('hoursControl.kpis.pending')
                                                            : kpiFilter === 'enviadas'
                                                            ? t('hoursControl.kpis.toValidate')
                                                            : kpiFilter === 'validadas'
                                                            ? t('hoursControl.kpis.validated')
                                                            : t('hoursControl.kpis.completed')
                                                    })}
                                                </p>
                                                <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={() => handleKpiFilterToggle('all')}>
                                                    {t('hoursControl.filterBanner.viewAllClients')}
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
                                const clientPct = calcPct(client.validated_hours || 0, client.total_workers || 0);
                                return (
                                    <TableRow
                                        key={client.cliente_nombre}
                                        className="group cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-900/40 transition-colors"
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
                                        <TableCell className="font-semibold pl-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border transition-colors ${
                                                    status === 'completed'
                                                        ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800'
                                                        : status === 'review'
                                                        ? 'bg-blue-50 border-blue-200/80 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800'
                                                        : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-slate-800 dark:border-slate-700'
                                                }`}>
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {client.cliente_nombre}
                                                    </span>
                                                    {client.legal_name && client.legal_name.trim().toLowerCase() !== client.cliente_nombre.trim().toLowerCase() && (
                                                        <span className="text-[11px] font-normal text-muted-foreground leading-tight">
                                                            {client.legal_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs text-foreground">
                                                {client.total_workers}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.pending_hours > 0 ? (
                                                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-semibold rounded-lg px-2.5 py-0.5">
                                                    {client.pending_hours} {t('hoursControl.badges.missing')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground/40 font-medium">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.submitted_hours > 0 ? (
                                                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 font-semibold rounded-lg px-2.5 py-0.5">
                                                    {client.submitted_hours} {t('hoursControl.badges.toValidate')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground/40 font-medium">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.validated_hours > 0 ? (
                                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold rounded-lg px-2.5 py-0.5">
                                                    {client.validated_hours} {t('hoursControl.badges.ready')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground/40 font-medium">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center gap-2 justify-center px-2">
                                                <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            clientPct === 100
                                                                ? 'bg-emerald-500'
                                                                : clientPct >= 50
                                                                ? 'bg-blue-500'
                                                                : clientPct > 0
                                                                ? 'bg-amber-500'
                                                                : 'bg-slate-300'
                                                        }`}
                                                        style={{ width: `${clientPct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-bold text-muted-foreground w-8 text-right">
                                                    {clientPct}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {status === 'processing' && (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold rounded-lg">
                                                    {t('hoursControl.status.collecting')}
                                                </Badge>
                                            )}
                                            {status === 'review' && (
                                                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg">
                                                    {t('hoursControl.status.review')}
                                                </Badge>
                                            )}
                                            {status === 'completed' && (
                                                <Badge variant="outline" className="border-emerald-500/60 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-lg gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                    {t('hoursControl.status.completed')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-3">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
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
