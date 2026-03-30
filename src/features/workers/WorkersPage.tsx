import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
import { Search, ChevronLeft, ChevronRight, Loader2, Users, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown, DownloadCloud } from 'lucide-react';

import { useUniqueContratantes } from './hooks/useUniqueContratantes';
import { useUniqueFunciones } from './hooks/useUniqueFunciones';
import { useClientWorkerKpis } from './hooks/useClientWorkerKpis';
import { useUniqueClients } from './hooks/useUniqueClients';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportTarifasDialog } from './components/ImportTarifasDialog';
import { ExportWorkersDialog } from './components/ExportWorkersDialog';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

export function WorkersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedEmpresaId } = useEmpresa();
    const { t } = useTranslation();

    const search = searchParams.get('search') || '';
    const clienteNombre = searchParams.get('clienteNombre')?.split('||').filter(Boolean) || [];
    const contratante = searchParams.get('contratante') || null;
    const funcion = searchParams.get('funcion') || null;
    const statusTrabajador = searchParams.get('statusTrabajador')?.split('||').filter(Boolean) || ['ativos'];
    const statusSeguridad = searchParams.get('statusSeguridad')?.split('||').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortColumn = searchParams.get('sortColumn') || 'nome';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc';

    const updateSearchParams = (updates: Record<string, string | string[] | null | undefined>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
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

    // 400ms debounce as per requirements
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
        funcion
    );

    const { role: globalRole } = useRole(); // Need to import useRole

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
        pageSize
    });

    const handleRowClick = (id: string) => {
        const currentQueryString = searchParams.toString();
        navigate(`/workers/${id}?${currentQueryString}`);
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

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-3">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight">{t('workersPage.title')}</h1>
                    <span className="text-sm font-medium text-muted-foreground">{t('workersPage.subtitle')}</span>
                </div>,
                portalNode
            )}

            {/* Controls section */}
            <div className="flex justify-between items-center w-full mb-3 shrink-0">
                <h2 className="text-lg font-semibold">{t('workersPage.title')}</h2>
                <div className="flex gap-2">
                    <ExportWorkersDialog 
                        trigger={
                            <Button variant="outline" className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                                <DownloadCloud className="mr-2 h-4 w-4" />
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
                        }}
                    />
                    {globalRole !== 'visualizador' && (
                        <ImportTarifasDialog trigger={
                            <Button variant="outline" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Importar Tarifas (Excel)
                            </Button>
                        } />
                    )}
                </div>
            </div>
            <div className="w-full mb-2 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 w-full">
                    <div className="relative w-full sm:col-span-2 flex items-center h-auto sm:h-9 rounded-md border border-input bg-background overflow-hidden shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                        <div className="relative flex-1 flex items-center h-9 sm:h-full w-full">
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
                                { value: 'pendentes_ingreso', label: t('workersPage.filters.statusTrabOptions.pendentes_ingresso') },
                            ]}
                            selected={statusTrabajador}
                            onChange={(newStatus) => updateSearchParams({ statusTrabajador: newStatus, page: '1' })}
                            placeholder={t('workersPage.filters.statusTrab')}
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
                    <div className="w-full">
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

            {/* KPI Banner */}
            {selectedEmpresaId && kpisIsError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md shrink-0">
                    <h3 className="font-semibold">{t('workersPage.kpi.errorTitle')}</h3>
                    <p className="text-sm mt-1">{kpisError?.message || t('workersPage.kpi.errorMsg')}</p>
                    <p className="text-xs mt-2 opacity-80">{t('workersPage.kpi.errorAction')}</p>
                </div>
            )}
            {selectedEmpresaId && kpis && (
                <div className="flex flex-col xl:flex-row gap-6 shrink-0">
                    {/* Bloco 1: Status do Trabalhador */}
                    <div className="flex flex-col gap-2 flex-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" /> {t('workersPage.kpi.statusTitle')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-emerald-200/50 dark:border-emerald-900/30">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-semibold text-emerald-700 dark:text-emerald-400">{t('workersPage.kpi.active')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold">{kpisLoading ? '-' : kpis.ativos}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-rose-200/50 dark:border-rose-900/30">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-semibold text-rose-700 dark:text-rose-400">{t('workersPage.kpi.inactive')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold">{kpisLoading ? '-' : kpis.inativos}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-amber-200/50 dark:border-amber-900/30">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-semibold text-amber-700 dark:text-amber-500" title={t('workersPage.kpi.pendingEntry')}>{t('workersPage.kpi.pendingEntry')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold">{kpisLoading ? '-' : kpis.pendentes_ingreso}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Bloco 2: Seguridade (Alta/Baixa) */}
                    <div className="flex flex-col gap-2 flex-[1.3]">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> {t('workersPage.kpi.securityTitle')}
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <Card className="bg-[#FFE6BB] border-[#FFE6BB]/80 shadow-none dark:bg-[#4a3a20] dark:border-[#5c4a2e]">
                                <CardContent className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-medium text-muted-foreground">{t('workersPage.kpi.alta')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-500">{kpisLoading ? '-' : kpis.seguridade_alta}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#FFE6BB] border-[#FFE6BB]/80 shadow-none dark:bg-[#4a3a20] dark:border-[#5c4a2e]">
                                <CardContent className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-medium text-muted-foreground" title={t('workersPage.kpi.pendingAlta')}>{t('workersPage.kpi.pendingAlta')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-500">{kpisLoading ? '-' : kpis.seguridade_pendente_alta}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#E0E7FF] border-[#E0E7FF]/80 shadow-none dark:bg-[#2e314a] dark:border-[#383d5c]">
                                <CardContent className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-medium text-muted-foreground" title="Em Regularização">Em Regularização</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{kpisLoading ? '-' : kpis.seguridade_em_regularizacao}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#FFE6BB] border-[#FFE6BB]/80 shadow-none dark:bg-[#4a3a20] dark:border-[#5c4a2e]">
                                <CardContent className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-medium text-muted-foreground">{t('workersPage.kpi.baixa')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-500">{kpisLoading ? '-' : kpis.seguridade_baixa}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#FFE6BB] border-[#FFE6BB]/80 shadow-none dark:bg-[#4a3a20] dark:border-[#5c4a2e]">
                                <CardContent className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] leading-tight line-clamp-2 font-medium text-muted-foreground" title={t('workersPage.kpi.pendingBaixa')}>{t('workersPage.kpi.pendingBaixa')}</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-orange-500 dark:text-orange-500">{kpisLoading ? '-' : kpis.seguridade_pendente_baixa}</span>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        {t('workersPage.messages.selectCompany')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>{t('workersPage.messages.loading')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-destructive">
                                        {t('workersPage.messages.loadError', { error: error?.message })}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && data?.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        {t('workersPage.messages.noWorkers')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && data?.data.map((worker: any) => (
                                <TableRow
                                    key={worker.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => handleRowClick(worker.id)}
                                >
                                    <TableCell className="font-medium text-muted-foreground">{worker.cod_colab}</TableCell>
                                    <TableCell className="font-medium text-sm w-48">{worker.nome}</TableCell>
                                    <TableCell className="text-sm truncate max-w-[120px]">{worker.contratante || '-'}</TableCell>
                                    <TableCell className="text-sm truncate max-w-[120px]">{worker.funcion || '-'}</TableCell>
                                    <TableCell className="text-sm truncate max-w-[150px]" title={worker.cliente_nombre || undefined}>{worker.cliente_nombre || '-'}</TableCell>
                                    <TableCell>
                                        <span className="text-xs truncate max-w-[120px] inline-block">
                                            {worker.status_trabajador ? t(`workersPage.statusValues.trabajador.${worker.status_trabajador.toLowerCase().replace(/ /g, '_')}`) : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {worker.status_seguridad ? (
                                            <Badge
                                                className={
                                                    worker.status_seguridad.toLowerCase() === 'em regularização' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50' : ''
                                                }
                                                variant={
                                                    worker.status_seguridad.toLowerCase().includes('alta') ? 'default' :
                                                        worker.status_seguridad.toLowerCase().includes('baja') ? 'destructive' :
                                                            worker.status_seguridad.toLowerCase() === 'em regularização' ? 'outline' : 'secondary'
                                                }
                                            >
                                                {t(`workersPage.statusValues.seguridad.${worker.status_seguridad.toLowerCase().replace(/ /g, '_')}`)}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Pagination Controls */}
            {selectedEmpresaId && !isLoading && !isError && totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-2 gap-4 shrink-0 pb-1">
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
