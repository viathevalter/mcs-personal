import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useTranslation } from 'react-i18next';
import { useSalaryReportWorkers, useSalaryReportKpis } from '../hooks/useSalaryReport';
import { useUniqueContratantes } from '../hooks/useUniqueContratantes';
import { useUniqueClients } from '../hooks/useUniqueClients';
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
    DownloadCloud, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    UserPlus, 
    UserMinus, 
    FileSpreadsheet, 
    CalendarRange 
} from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportSalaryReportDialog } from '../components/ExportSalaryReportDialog';

export function SalaryReportPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedEmpresaId } = useEmpresa();
    const { t, i18n } = useTranslation();

    // Query params & pagination
    const search = searchParams.get('search') || '';
    const clienteNombre = searchParams.get('clienteNombre')?.split('||').filter(Boolean) || [];
    const contratante = searchParams.get('contratante') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortColumn = searchParams.get('sortColumn') || 'nome';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc';

    const currentDate = new Date();
    // Default to previous month
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const periodYear = searchParams.get('year') ? parseInt(searchParams.get('year') as string, 10) : prevMonthDate.getFullYear();
    const periodMonth = searchParams.get('month') ? parseInt(searchParams.get('month') as string, 10) : prevMonthDate.getMonth() + 1;

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    const debouncedSearch = useDebounce(search, 400);

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

    const anosDisponiveis = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
    const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
        const locale = i18n.language.startsWith('es') ? 'es' : 'pt-BR';
        return {
            value: i + 1,
            label: new Date(2000, i, 1).toLocaleString(locale, { month: 'long' }).toUpperCase()
        };
    });

    // Lookup datasets
    const { data: contratantes } = useUniqueContratantes();
    const { data: clientsList } = useUniqueClients();

    // Query historical salary list
    const { data: listData, isLoading, isError, error } = useSalaryReportWorkers({
        empresaId: selectedEmpresaId || '',
        periodYear,
        periodMonth,
        search: debouncedSearch || undefined,
        clienteNombre: clienteNombre.length > 0 ? clienteNombre : undefined,
        contratante: contratante || undefined,
        sortColumn,
        sortDirection,
        page,
        pageSize
    });

    // Query period KPIs
    const { data: kpis, isLoading: kpisLoading } = useSalaryReportKpis({
        empresaId: selectedEmpresaId || '',
        periodYear,
        periodMonth,
        search: debouncedSearch || null,
        contratante: contratante || null,
        clienteNombre: clienteNombre.length > 0 ? clienteNombre : null
    });

    const totalCount = listData?.count || 0;
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
                    <h1 className="text-xl font-bold tracking-tight">Informe de Salários</h1>
                    <span className="text-sm font-medium text-muted-foreground">Relatório e auditoria mensal de folha para contabilidade</span>
                </div>,
                portalNode
            )}

            {/* Header controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 shrink-0 bg-card p-4 rounded-md border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Fechamento de Folha</h2>
                        <p className="text-xs text-muted-foreground">Funcionários ativos no período selecionado</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border p-1 rounded-md">
                        <CalendarRange className="w-4 h-4 ml-1.5 text-muted-foreground" />
                        <Select value={periodMonth.toString()} onValueChange={(v) => updateSearchParams({ month: v, page: '1' })}>
                            <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-semibold w-auto focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {mesesDisponiveis.map(m => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={periodYear.toString()} onValueChange={(v) => updateSearchParams({ year: v, page: '1' })}>
                            <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-semibold w-[80px] focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {anosDisponiveis.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedEmpresaId && (
                        <ExportSalaryReportDialog 
                            trigger={
                                <Button variant="outline" className="h-10 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700">
                                    <DownloadCloud className="mr-2 h-4 w-4" />
                                    Exportar para Excel
                                </Button>
                            }
                            currentFilters={{
                                search: debouncedSearch || undefined,
                                clienteNombre: clienteNombre.length > 0 ? clienteNombre : undefined,
                                contratante: contratante || undefined,
                                periodMonth,
                                periodYear
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Quick search and filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full shrink-0">
                <div className="relative flex items-center h-10 rounded-md border border-input bg-card overflow-hidden shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                    <Search className="h-4 w-4 ml-3 text-muted-foreground shrink-0" />
                    <input
                        type="text"
                        placeholder="Pesquisar trabalhador (Nome, NIF, NISS...)"
                        value={search}
                        onChange={(e) => updateSearchParams({ search: e.target.value, page: '1' })}
                        className="flex-1 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                </div>

                <div className="w-full">
                    <Combobox
                        options={contratantes?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                        value={contratante}
                        onChange={(val) => updateSearchParams({ contratante: val, page: '1' })}
                        placeholder="Filtrar por Empresa Contratante"
                        emptyText="Nenhuma empresa"
                    />
                </div>

                <div className="w-full md:col-span-2">
                    <MultiSelect
                        options={clientsList?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                        selected={clienteNombre}
                        onChange={(val) => updateSearchParams({ clienteNombre: val, page: '1' })}
                        placeholder="Filtrar por Clientes/Obras alocados"
                        emptyText="Nenhum cliente"
                    />
                </div>
            </div>

            {/* period KPIs */}
            {selectedEmpresaId && kpis && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                    <Card className="border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden group">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativos no Período</span>
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                    {kpisLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.total_ativos_periodo}
                                </span>
                            </div>
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                                <Users className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden group">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admitidos no Mês</span>
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                    {kpisLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.novos_admitidos}
                                </span>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-300">
                                <UserPlus className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-500 shadow-sm relative overflow-hidden group">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desligados no Mês</span>
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                    {kpisLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.desligados}
                                </span>
                            </div>
                            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform duration-300">
                                <UserMinus className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Workers Report list */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border">
                <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/60 shadow-sm backdrop-blur-md">
                            <TableRow className="border-b-0">
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('cod_colab')}>
                                    <div className="flex items-center">Cód. {renderSortIcon('cod_colab')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('nome')}>
                                    <div className="flex items-center">Nome Completo {renderSortIcon('nome')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('contratante')}>
                                    <div className="flex items-center">Contratante {renderSortIcon('contratante')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('cliente_nombre')}>
                                    <div className="flex items-center">Cliente/Obra {renderSortIcon('cliente_nombre')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('dias_trabalhados')}>
                                    <div className="flex items-center justify-center">Dias Ativos no Mês {renderSortIcon('dias_trabalhados')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors text-center" onClick={() => handleSort('status_seguridad')}>
                                    <div className="flex items-center justify-center">Segurança Social {renderSortIcon('status_seguridad')}</div>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Datas Ingresso/Baixa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        Selecione uma empresa no topo do sistema para visualizar os dados.
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>Carregando dados históricos do período...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-destructive">
                                        Falha ao carregar relatório: {error?.message}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && totalCount === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        Nenhum trabalhador com registros de Alta ativo no período selecionado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && listData?.data.map((worker: any) => (
                                <TableRow
                                    key={worker.id}
                                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/workers/${worker.id}`)}
                                >
                                    <TableCell className="font-medium text-xs text-muted-foreground">{worker.cod_colab}</TableCell>
                                    <TableCell className="font-medium text-sm">
                                        <div className="flex flex-col">
                                            <span>{worker.nome}</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                {worker.nif ? `NIF: ${worker.nif}` : worker.dni ? `DNI: ${worker.dni}` : worker.nie ? `NIE: ${worker.nie}` : worker.pasaporte ? `Pass: ${worker.pasaporte}` : ''}
                                                {worker.niss ? ` | NISS: ${worker.niss}` : ''}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm truncate max-w-[120px]">{worker.contratante || '-'}</TableCell>
                                    <TableCell className="text-sm truncate max-w-[150px]">{worker.cliente_nombre || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-bold text-xs border-emerald-200 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400">
                                            {worker.dias_trabalhados} dias
                                        </Badge>
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
                                                {worker.status_seguridad}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center text-xs">
                                        <div className="flex flex-col gap-0.5 justify-center items-center">
                                            <span className="text-emerald-700 dark:text-emerald-400">
                                                Admissão: {worker.data_ingresso ? new Date(worker.data_ingresso).toLocaleDateString('pt-BR') : '-'}
                                            </span>
                                            {worker.data_baixa && (
                                                <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                    Demissão: {new Date(worker.data_baixa).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
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
                        Mostrando <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> a <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> de <span className="font-semibold text-foreground">{totalCount}</span> trabalhadores ativos no período
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Exibir:</span>
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
                                Anterior
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
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
