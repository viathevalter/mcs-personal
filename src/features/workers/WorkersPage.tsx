import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { useWorkersList } from './hooks/useWorkersList';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Users,
    ShieldAlert,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    DownloadCloud,
    UserCheck,
    AlertTriangle,
    UserX,
    RefreshCw,
    Ban,
    Home,
    X,
    Calendar
} from 'lucide-react';

import { useUniqueContratantes } from './hooks/useUniqueContratantes';
import { useUniqueFunciones } from './hooks/useUniqueFunciones';
import { useClientWorkerKpis } from './hooks/useClientWorkerKpis';
import { useUniqueClients } from './hooks/useUniqueClients';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportTarifasDialog } from './components/ImportTarifasDialog';
import { ExportWorkersDialog } from './components/ExportWorkersDialog';
import { WorkerStatusManagerDialog } from './components/WorkerStatusManagerDialog';
import { useTranslation } from 'react-i18next';

function formatShortDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length !== 3) return clean;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function WorkersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedEmpresaId } = useEmpresa();
    const { t } = useTranslation();
    const { role: globalRole } = useRole();

    const search = searchParams.get('search') || '';
    const clienteNombre = searchParams.get('clienteNombre')?.split('||').filter(Boolean) || [];
    const contratante = searchParams.get('contratante') || null;
    const funcion = searchParams.get('funcion') || null;
    const alertaFilter = searchParams.get('alertaFilter') || null;

    // Quando um filtro de alerta operacional está ativo, não restringimos a 'ativos' por padrão
    // para que o responsável veja todos os trabalhadores pendentes (Ativos, Pendentes, Desistiu, Inativos sem baixa SS)
    const rawStatusParam = searchParams.get('statusTrabajador');
    const statusTrabajador = rawStatusParam !== null
        ? rawStatusParam.split('||').filter(Boolean)
        : (alertaFilter ? [] : ['ativos']);

    const statusSeguridad = searchParams.get('statusSeguridad')?.split('||').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortColumn = searchParams.get('sortColumn') || 'nome';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc';
    
    const currentDate = new Date();
    const periodYear = searchParams.get('periodYear') ? parseInt(searchParams.get('periodYear') as string, 10) : currentDate.getFullYear();
    const periodMonth = searchParams.get('periodMonth') ? parseInt(searchParams.get('periodMonth') as string, 10) : currentDate.getMonth() + 1;
    const onlyNovos = searchParams.get('onlyNovos') === 'true';

    const anosDisponiveis = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
    const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()
    }));

    const updateSearchParams = (updates: Record<string, string | string[] | null | undefined>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || (typeof value === 'string' && value === '' && key !== 'statusTrabajador') || (Array.isArray(value) && value.length === 0 && key !== 'statusTrabajador')) {
                newParams.delete(key);
            } else if (Array.isArray(value)) {
                newParams.set(key, value.join('||'));
            } else {
                newParams.set(key, value.toString());
            }
        });
        setSearchParams(newParams, { replace: true });
    };

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    const debouncedSearch = useDebounce(search, 400);
    const activeSearch = debouncedSearch || undefined;

    const { data: contratantes } = useUniqueContratantes();
    const { data: funciones } = useUniqueFunciones();
    const { data: clientsList } = useUniqueClients();
    const { data: kpis, isLoading: kpisLoading, isError: kpisIsError, error: kpisError } = useClientWorkerKpis(
        selectedEmpresaId || '',
        activeSearch || null,
        clienteNombre.length > 0 ? clienteNombre : null,
        contratante,
        funcion,
        statusTrabajador.length > 0 ? statusTrabajador : null
    );

    const { data, isLoading, isError, error } = useWorkersList({
        empresaId: selectedEmpresaId || '',
        search: activeSearch,
        clienteNombre: clienteNombre.length > 0 ? clienteNombre : undefined,
        statusTrabajador: statusTrabajador,
        statusSeguridad: statusSeguridad,
        contratante: contratante || undefined,
        funcion: funcion || undefined,
        sortColumn,
        sortDirection,
        page,
        pageSize,
        periodMonth: onlyNovos ? periodMonth : undefined,
        periodYear: onlyNovos ? periodYear : undefined,
        alertaFilter: alertaFilter || undefined
    });

    const handleRowClick = (id: string) => {
        const currentQueryString = searchParams.toString();
        navigate(`/workers/${id}?${currentQueryString}`);
    };

    const handleToggleAlertFilter = (filterKey: string) => {
        if (alertaFilter === filterKey) {
            updateSearchParams({
                alertaFilter: null,
                statusTrabajador: ['ativos'],
                page: '1'
            });
        } else {
            updateSearchParams({
                alertaFilter: filterKey,
                statusTrabajador: [],
                statusSeguridad: [],
                page: '1'
            });
        }
    };

    const handleSelectStatusCard = (statusKey: string) => {
        const isAlreadyOnlySelected = !alertaFilter && statusTrabajador.length === 1 && statusTrabajador[0] === statusKey;
        if (isAlreadyOnlySelected) {
            return;
        }
        updateSearchParams({
            alertaFilter: null,
            statusTrabajador: [statusKey],
            page: '1'
        });
    };

    const handleToggleSeguridadeCard = (segKey: string) => {
        const exists = statusSeguridad.includes(segKey);
        const next = exists ? statusSeguridad.filter(s => s !== segKey) : [segKey];
        updateSearchParams({
            statusSeguridad: next,
            page: '1'
        });
    };

    const totalCount = data?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            updateSearchParams({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc', page: '1' });
        } else {
            updateSearchParams({ sortColumn: column, sortDirection: 'asc', page: '1' });
        }
    };

    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
        return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    };

    const totalAlertas = Number(kpis?.alertas_total || 0);
    const alertasBaixa = Number(kpis?.alertas_baixa || 0);
    const alertasReemplazo = Number(kpis?.alertas_reemplazo || 0);
    const alertasDesistiu = Number(kpis?.alertas_desistiu || 0);
    const alertasLogistica = Number(kpis?.alertas_logistica || 0);

    const statusScopeLabel = statusTrabajador.length === 0
        ? 'Todos os Status'
        : statusTrabajador.map(st => {
            if (st === 'ativos') return t('workersPage.kpi.active', 'Activos');
            if (st === 'inativos') return t('workersPage.kpi.inactive', 'Inactivos');
            if (st === 'pendientes_ingreso') return t('workersPage.kpi.pendingEntry', 'Pendientes Ingreso');
            if (st === 'desistiu') return 'Desistiu';
            return st;
        }).join(', ');

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-2.5">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight">{t('workersPage.title')}</h1>
                    <span className="text-sm font-medium text-muted-foreground">{t('workersPage.subtitle')}</span>
                </div>,
                portalNode
            )}

            {/* Controls section */}
            <div className="flex flex-wrap justify-between items-center w-full gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold mr-2">{t('workersPage.title')}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 p-1 rounded-md">
                        <Select value={periodMonth.toString()} onValueChange={(v) => updateSearchParams({ periodMonth: v, page: '1' })}>
                            <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-medium w-auto focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {mesesDisponiveis.map(m => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={periodYear.toString()} onValueChange={(v) => updateSearchParams({ periodYear: v, page: '1' })}>
                            <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-medium w-[72px] focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {anosDisponiveis.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="w-px h-5 bg-border mx-0.5" />
                        <Button 
                            variant={onlyNovos ? "default" : "ghost"} 
                            size="sm"
                            onClick={() => updateSearchParams({ onlyNovos: onlyNovos ? null : 'true', page: '1' })}
                            className={`h-7 px-2 text-xs ${onlyNovos ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Novos / Reativados
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <ExportWorkersDialog 
                        trigger={
                            <Button variant="outline" size="sm" className="h-8 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-xs">
                                <DownloadCloud className="mr-1.5 h-3.5 w-3.5" />
                                Exportar para Excel
                            </Button>
                        }
                        currentFilters={{
                            search: activeSearch,
                            clienteNombre: clienteNombre.length > 0 ? clienteNombre : undefined,
                            statusTrabajador: statusTrabajador,
                            statusSeguridad: statusSeguridad,
                            contratante: contratante || undefined,
                            funcion: funcion || undefined,
                            periodMonth: onlyNovos ? periodMonth : undefined,
                            periodYear: onlyNovos ? periodYear : undefined
                        }}
                    />
                    {globalRole !== 'visualizador' && (
                        <ImportTarifasDialog trigger={
                            <Button variant="outline" size="sm" className="h-8 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 text-xs">
                                <DownloadCloud className="mr-1.5 h-3.5 w-3.5" />
                                Importar Tarifas (Excel)
                            </Button>
                        } />
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="w-full shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 w-full">
                    <div className="relative w-full sm:col-span-2 flex items-center h-9 rounded-md border border-input bg-background overflow-hidden shadow-xs transition-colors focus-within:ring-1 focus-within:ring-ring">
                        <div className="relative flex-1 flex items-center h-full w-full">
                            <Search className="h-4 w-4 ml-3 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                placeholder={t('workersPage.filters.searchWorker')}
                                value={search}
                                onChange={(e) => {
                                    updateSearchParams({ search: e.target.value, page: '1' });
                                }}
                                className="flex-1 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground w-full"
                            />
                        </div>
                    </div>
                    <div className="w-full">
                        <MultiSelect
                            options={[
                                { value: 'ativos', label: t('workersPage.filters.statusTrabOptions.ativos') },
                                { value: 'inativos', label: t('workersPage.filters.statusTrabOptions.inativos') },
                                { value: 'pendientes_ingreso', label: t('workersPage.filters.statusTrabOptions.pendentes_ingresso') },
                                { value: 'AFASTADO', label: t('workersPage.filters.statusTrabOptions.afastado', 'Afastado / Licença Saúde') },
                                { value: 'disponiveis', label: t('workersPage.filters.statusTrabOptions.disponiveis') },
                                { value: 'desistiu', label: t('workersPage.filters.statusTrabOptions.desistiu') },
                            ]}
                            selected={statusTrabajador}
                            onChange={(newStatus) => updateSearchParams({ statusTrabajador: newStatus, page: '1' })}
                            placeholder={alertaFilter && statusTrabajador.length === 0 ? 'Todos os Status (Alerta)' : t('workersPage.filters.statusTrab')}
                        />
                    </div>
                    <div className="w-full">
                        <MultiSelect
                            options={[
                                { value: 'alta', label: t('workersPage.filters.securityOptions.alta') },
                                { value: 'pendentes_alta', label: t('workersPage.filters.securityOptions.pendentes_alta') },
                                { value: 'em_regularizacao', label: t('workersPage.filters.securityOptions.em_regularizacao') },
                                { value: 'baixa', label: t('workersPage.filters.securityOptions.baixa') },
                                { value: 'pendentes_baixa', label: t('workersPage.filters.securityOptions.pendentes_baixa') },
                            ]}
                            selected={statusSeguridad}
                            onChange={(newStatus) => updateSearchParams({ statusSeguridad: newStatus, page: '1' })}
                            placeholder={t('workersPage.filters.security')}
                        />
                    </div>
                    
                    <div className="w-full">
                        <MultiSelect
                            options={clientsList?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                            selected={clienteNombre}
                            onChange={(val) => updateSearchParams({ clienteNombre: val, page: '1' })}
                            placeholder={t('workersPage.filters.client')}
                            emptyText={t('workersPage.filters.noCompany')}
                        />
                    </div>

                    <div className="w-full">
                        <Combobox
                            options={contratantes?.filter((c: string | undefined): c is string => !!c && c.trim() !== '').map((c: string) => ({ value: c, label: c })) || []}
                            value={contratante}
                            onChange={(val) => updateSearchParams({ contratante: val, page: '1' })}
                            placeholder={t('workersPage.filters.company')}
                            emptyText={t('workersPage.filters.noCompany')}
                        />
                    </div>
                    <div className="w-full sm:col-span-2 lg:col-span-1">
                        <Combobox
                            options={funciones?.filter((c: string | undefined): c is string => !!c && c.trim() !== '').map((c: string) => ({ value: c, label: c })) || []}
                            value={funcion}
                            onChange={(val) => updateSearchParams({ funcion: val, page: '1' })}
                            placeholder={t('workersPage.filters.profile')}
                            emptyText={t('workersPage.filters.noProfile')}
                        />
                    </div>
                </div>
            </div>

            {/* Operational Activity Alerts Bar (Estilo Central de Demandas / Logística) */}
            {selectedEmpresaId && kpis && (
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2 text-xs font-semibold text-rose-900 dark:text-rose-200">
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Atividades Operacionais Pendentes de Atualização (RH & Seguridade):</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleToggleAlertFilter('todos_alertas')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                    alertaFilter === 'todos_alertas'
                                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100/60'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Todos com Alerta ({totalAlertas})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleToggleAlertFilter('baixa')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                    alertaFilter === 'baixa'
                                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100/60'
                                }`}
                            >
                                <UserX className="w-3.5 h-3.5" />
                                Baixas / Fim de Obra ({alertasBaixa})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleToggleAlertFilter('reemplazo')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                    alertaFilter === 'reemplazo'
                                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100/60'
                                }`}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Substituições / Reemplazo ({alertasReemplazo})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleToggleAlertFilter('desistiu')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                    alertaFilter === 'desistiu'
                                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100/60'
                                }`}
                            >
                                <Ban className="w-3.5 h-3.5" />
                                Desistências ({alertasDesistiu})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleToggleAlertFilter('logistica')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                    alertaFilter === 'logistica'
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/60'
                                }`}
                            >
                                <Home className="w-3.5 h-3.5" />
                                Alerta Logística / Checkout ({alertasLogistica})
                            </button>

                            {alertaFilter && (
                                <button
                                    type="button"
                                    onClick={() => updateSearchParams({ alertaFilter: null, statusTrabajador: ['ativos'], page: '1' })}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Voltar p/ Ativos
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Banner */}
            {selectedEmpresaId && kpisIsError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md shrink-0">
                    <h3 className="font-semibold">{t('workersPage.kpi.errorTitle')}</h3>
                    <p className="text-sm mt-1">{kpisError?.message || t('workersPage.kpi.errorMsg')}</p>
                    <p className="text-xs mt-2 opacity-80">{t('workersPage.kpi.errorAction')}</p>
                </div>
            )}
            {selectedEmpresaId && kpis && (
                <div className="flex flex-col xl:flex-row gap-4 shrink-0">
                    {/* Bloco 1: Status do Trabalhador */}
                    <div className="flex flex-col gap-1.5 flex-1">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" /> {t('workersPage.kpi.statusTitle')}
                        </h3>
                        <div className="grid grid-cols-3 gap-2.5">
                            <Card
                                onClick={() => handleSelectStatusCard('ativos')}
                                className={`cursor-pointer bg-emerald-500/[0.04] shadow-xs transition-all duration-200 ${
                                    !alertaFilter && statusTrabajador.includes('ativos')
                                        ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/[0.08]'
                                        : 'border-emerald-500/20 hover:border-emerald-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5 sm:p-3">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[11px] leading-tight font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t('workersPage.kpi.active')}</span>
                                        </div>
                                        <span className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">{kpisLoading ? '-' : kpis.ativos}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleSelectStatusCard('inativos')}
                                className={`cursor-pointer bg-rose-500/[0.04] shadow-xs transition-all duration-200 ${
                                    !alertaFilter && statusTrabajador.includes('inativos')
                                        ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-500/[0.08]'
                                        : 'border-rose-500/20 hover:border-rose-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5 sm:p-3">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                            <span className="text-[11px] leading-tight font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">{t('workersPage.kpi.inactive')}</span>
                                        </div>
                                        <span className="text-2xl font-bold tracking-tight text-rose-950 dark:text-rose-100">{kpisLoading ? '-' : kpis.inativos}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleSelectStatusCard('pendientes_ingreso')}
                                className={`cursor-pointer bg-amber-500/[0.04] shadow-xs transition-all duration-200 ${
                                    !alertaFilter && statusTrabajador.includes('pendientes_ingreso')
                                        ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/[0.08]'
                                        : 'border-amber-500/20 hover:border-amber-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5 sm:p-3">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            <span className="text-[11px] leading-tight font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 truncate" title={t('workersPage.kpi.pendingEntry')}>{t('workersPage.kpi.pendingEntry')}</span>
                                        </div>
                                        <span className="text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100">{kpisLoading ? '-' : kpis.pendentes_ingreso}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Bloco 2: Seguridade Social (sincronizado com o filtro de Status do Trabalhador selecionado) */}
                    <div className="flex flex-col gap-1.5 flex-[1.35]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> {t('workersPage.kpi.securityTitle')}
                            </h3>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Referente a: <strong>{statusScopeLabel}</strong>
                            </span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                            <Card
                                onClick={() => handleToggleSeguridadeCard('alta')}
                                className={`cursor-pointer bg-emerald-500/[0.04] shadow-xs transition-all duration-200 ${
                                    statusSeguridad.includes('alta')
                                        ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/[0.08]'
                                        : 'border-emerald-500/20 hover:border-emerald-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] leading-tight font-medium text-muted-foreground">{t('workersPage.kpi.alta')}</span>
                                        <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{kpisLoading ? '-' : kpis.seguridade_alta}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleToggleSeguridadeCard('pendentes_alta')}
                                className={`cursor-pointer bg-amber-500/[0.04] shadow-xs transition-all duration-200 ${
                                    statusSeguridad.includes('pendentes_alta')
                                        ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/[0.08]'
                                        : 'border-amber-500/20 hover:border-amber-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] leading-tight font-medium text-muted-foreground truncate" title={t('workersPage.kpi.pendingAlta')}>{t('workersPage.kpi.pendingAlta')}</span>
                                        <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{kpisLoading ? '-' : kpis.seguridade_pendente_alta}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleToggleSeguridadeCard('em_regularizacao')}
                                className={`cursor-pointer bg-sky-500/[0.04] shadow-xs transition-all duration-200 ${
                                    statusSeguridad.includes('em_regularizacao')
                                        ? 'border-sky-500 ring-1 ring-sky-500/30 bg-sky-500/[0.08]'
                                        : 'border-sky-500/20 hover:border-sky-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] leading-tight font-medium text-muted-foreground truncate" title="Em Regularização">Em Regularização</span>
                                        <span className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">{kpisLoading ? '-' : kpis.seguridade_em_regularizacao}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleToggleSeguridadeCard('baixa')}
                                className={`cursor-pointer bg-rose-500/[0.04] shadow-xs transition-all duration-200 ${
                                    statusSeguridad.includes('baixa')
                                        ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-500/[0.08]'
                                        : 'border-rose-500/20 hover:border-rose-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] leading-tight font-medium text-muted-foreground">{t('workersPage.kpi.baixa')}</span>
                                        <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{kpisLoading ? '-' : kpis.seguridade_baixa}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card
                                onClick={() => handleToggleSeguridadeCard('pendentes_baixa')}
                                className={`cursor-pointer bg-orange-500/[0.04] shadow-xs transition-all duration-200 ${
                                    statusSeguridad.includes('pendentes_baixa')
                                        ? 'border-orange-500 ring-1 ring-orange-500/30 bg-orange-500/[0.08]'
                                        : 'border-orange-500/20 hover:border-orange-500/40'
                                }`}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] leading-tight font-medium text-muted-foreground truncate" title={t('workersPage.kpi.pendingBaixa')}>{t('workersPage.kpi.pendingBaixa')}</span>
                                        <span className="text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-400">{kpisLoading ? '-' : kpis.seguridade_pendente_baixa}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* Table section */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border">
                <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-md">
                            <TableRow className="border-b-0">
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('cod_colab')}>
                                    <div className="flex items-center">{t('workersPage.table.cod')} {renderSortIcon('cod_colab')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('nome')}>
                                    <div className="flex items-center">{t('workersPage.table.name')} {renderSortIcon('nome')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('contratante')}>
                                    <div className="flex items-center">{t('workersPage.table.contractor')} {renderSortIcon('contratante')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('funcion')}>
                                    <div className="flex items-center">{t('workersPage.table.role')} {renderSortIcon('funcion')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('cliente_nombre')}>
                                    <div className="flex items-center">{t('workersPage.table.client')} {renderSortIcon('cliente_nombre')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status_trabajador')}>
                                    <div className="flex items-center">{t('workersPage.table.statusTrab')} {renderSortIcon('status_trabajador')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors text-center" onClick={() => handleSort('status_seguridad')}>
                                    <div className="flex items-center justify-center">{t('workersPage.table.security')} {renderSortIcon('status_seguridad')}</div>
                                </TableHead>
                                {globalRole !== 'visualizador' && (
                                    <TableHead className="font-semibold text-foreground text-right pr-4">
                                        Ação Rápida
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        {t('workersPage.messages.selectCompany')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>{t('workersPage.messages.loading')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-destructive">
                                        {t('workersPage.messages.loadError', { error: error?.message })}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && data?.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        {t('workersPage.messages.noWorkers')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && data?.data.map((worker: any) => {
                                const hasAlert = Boolean(worker.alerta_tipo || worker.alerta_logistica);
                                const alertDateFormatted = formatShortDate(worker.alerta_data || worker.data_baixa);

                                const alertBadgeStyle =
                                    worker.alerta_tipo === 'baixa'
                                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                                        : worker.alerta_tipo === 'reemplazo'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                        : worker.alerta_tipo === 'desistiu'
                                        ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                                        : 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';

                                const alertSummaryText = hasAlert
                                    ? `${worker.alerta_label || 'Alerta Operacional'}${worker.alerta_codigo ? ` (${worker.alerta_codigo})` : ''}${worker.alerta_cliente ? ` • ${worker.alerta_cliente}` : ''}${alertDateFormatted ? ` • Data: ${alertDateFormatted}` : ''}${worker.alerta_pendencia ? ` → ${worker.alerta_pendencia}` : ''}`
                                    : null;

                                return (
                                    <TableRow
                                        key={worker.id}
                                        className={`cursor-pointer transition-colors ${
                                            hasAlert
                                                ? 'bg-rose-50/35 hover:bg-rose-50/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/25'
                                                : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => handleRowClick(worker.id)}
                                    >
                                        <TableCell className="font-medium text-muted-foreground">{worker.cod_colab}</TableCell>
                                        <TableCell className="font-medium text-sm min-w-[220px] max-w-[300px]">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-foreground">{worker.nome}</span>
                                                    {onlyNovos && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 text-[10px] px-1.5 py-0">NOVO</Badge>}
                                                </div>

                                                {hasAlert && (
                                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                        {worker.alerta_label && (
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${alertBadgeStyle}`}>
                                                                {worker.alerta_tipo === 'baixa' && <UserX className="w-3 h-3 shrink-0" />}
                                                                {worker.alerta_tipo === 'reemplazo' && <RefreshCw className="w-3 h-3 shrink-0" />}
                                                                {worker.alerta_tipo === 'desistiu' && <Ban className="w-3 h-3 shrink-0" />}
                                                                {worker.alerta_tipo === 'logistica' && <Home className="w-3 h-3 shrink-0" />}
                                                                {worker.alerta_label}
                                                                {worker.alerta_codigo ? ` (${worker.alerta_codigo})` : ''}
                                                            </span>
                                                        )}

                                                        {worker.alerta_logistica && worker.alerta_tipo !== 'logistica' && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                                                                <Home className="w-3 h-3 shrink-0" />
                                                                Checkout Alojamento Pendente
                                                            </span>
                                                        )}

                                                        {alertDateFormatted && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                                                <Calendar className="w-2.5 h-2.5" />
                                                                {alertDateFormatted}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {worker.alerta_alojamento && hasAlert && (
                                                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium truncate max-w-[280px]" title={worker.alerta_alojamento}>
                                                        🏠 {worker.alerta_alojamento}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm truncate max-w-[120px]">{worker.contratante || '-'}</TableCell>
                                        <TableCell className="text-sm truncate max-w-[130px]">{worker.funcion || '-'}</TableCell>
                                        <TableCell className="text-sm max-w-[170px]">
                                            <div className="flex flex-col">
                                                <span className="truncate" title={worker.cliente_nombre || undefined}>
                                                    {worker.cliente_nombre || '-'}
                                                </span>
                                                {!worker.cliente_nombre && worker.alerta_cliente && (
                                                    <span className="text-[10px] text-muted-foreground truncate" title={`Ref: ${worker.alerta_cliente}`}>
                                                        Ref: {worker.alerta_cliente}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-start gap-1">
                                                {(() => {
                                                    const s = (worker.status_trabajador || '').toLowerCase();
                                                    const isDesligado = s.includes('inativ') || s.includes('inactiv') || s.includes('desligad') || s.includes('desist') || s.includes('baixa') || s.includes('baja');
                                                    const isAtivo = !isDesligado && (s.includes('ativo') || s.includes('activo'));
                                                    const isPendente = s.includes('pendente') || s.includes('pendiente');
                                                    const isAfastado = s.includes('afast') || s.includes('licen') || s.includes('invalidez') || s.includes('baja medica') || s.includes('baja médica');
                                                    
                                                    const label = worker.status_trabajador ? t(`workersPage.statusValues.trabajador.${worker.status_trabajador.toLowerCase().replace(/ /g, '_')}`, worker.status_trabajador) : '-';

                                                    if (isAtivo) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                {label}
                                                            </span>
                                                        );
                                                    } else if (isAfastado) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                                {label}
                                                            </span>
                                                        );
                                                    } else if (isPendente) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                {label}
                                                            </span>
                                                        );
                                                    } else if (isDesligado) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                {label}
                                                            </span>
                                                        );
                                                    }
                                                    return <span className="text-xs text-muted-foreground">{label}</span>;
                                                })()}

                                                {worker.alerta_pendencia && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
                                                        ⚡ {worker.alerta_pendencia}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {worker.status_seguridad ? (() => {
                                                const ss = worker.status_seguridad.toLowerCase();
                                                const label = t(`workersPage.statusValues.seguridad.${worker.status_seguridad.toLowerCase().replace(/ /g, '_')}`, worker.status_seguridad);
                                                
                                                if (ss === 'alta') {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                                            {label}
                                                        </span>
                                                    );
                                                }
                                                if (ss.includes('regulariz')) {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                                                            {label}
                                                        </span>
                                                    );
                                                }
                                                if (ss.includes('baixa') || ss.includes('baja') || ss.includes('anulado')) {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                                                            {label}
                                                        </span>
                                                    );
                                                }
                                                if (ss.includes('pendente') || ss.includes('pendiente')) {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                                            {label}
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                                        {label}
                                                    </span>
                                                );
                                            })() : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        {globalRole !== 'visualizador' && (
                                            <TableCell className="text-right pr-3">
                                                <WorkerStatusManagerDialog
                                                    workerId={worker.id}
                                                    currentTrabalhoStatus={worker.status_trabajador}
                                                    currentSeguridadeStatus={worker.status_seguridad}
                                                    workerName={worker.nome}
                                                    codColab={worker.cod_colab}
                                                    defaultEffectiveDate={worker.alerta_data || worker.data_baixa}
                                                    alertBanner={alertSummaryText}
                                                    compact={true}
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Pagination Controls */}
            {selectedEmpresaId && !isLoading && !isError && totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-1 gap-4 shrink-0 pb-1">
                    <p className="text-sm text-muted-foreground">
                        {t('workersPage.pagination.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, totalCount) })} <span className="font-medium text-foreground">{totalCount}</span> {t('workersPage.pagination.results')}
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('workersPage.pagination.show')}</span>
                            <select
                                className="h-8 w-[70px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={pageSize}
                                onChange={(e) => updateSearchParams({ pageSize: e.target.value, page: '1' })}
                            >
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => updateSearchParams({ page: Math.max(1, page - 1).toString() })}
                                className="h-8"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t('workersPage.pagination.prev')}
                            </Button>
                            <div className="text-sm font-medium px-4 py-1.5 rounded-md bg-muted/50 border">
                                {page} / {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => updateSearchParams({ page: Math.min(totalPages, page + 1).toString() })}
                                className="h-8"
                            >
                                {t('workersPage.pagination.next')}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
