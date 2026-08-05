import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useTranslation } from 'react-i18next';
import { useWorkersWithTariffs } from '../hooks/useWorkersWithTariffs';
import { useUniqueContratantes } from '../hooks/useUniqueContratantes';
import { useUniqueClients } from '../hooks/useUniqueClients';
import { useUniqueFunciones } from '../hooks/useUniqueFunciones';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    DownloadCloud,
    Edit2,
    Tags
} from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportTarifasDialog } from '../components/ImportTarifasDialog';
import { EditTariffDialog } from '../components/EditTariffDialog';
import type { Worker } from '@/shared/types/corePersonal';

export function WorkerTariffsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedEmpresaId, setSelectedEmpresaId, empresas } = useEmpresa();
    const { t } = useTranslation();

    // Query params & pagination
    const search = searchParams.get('search') || '';
    const clienteNombre = searchParams.get('clienteNombre')?.split('||').filter(Boolean) || [];
    const contratante = searchParams.get('contratante') || null;
    const funcion = searchParams.get('funcion') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortColumn = searchParams.get('sortColumn') || 'nome';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc';

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<(Worker & { worker_beneficios_settings?: any }) | null>(null);

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

    // Lookup datasets
    const { data: contratantes = [] } = useUniqueContratantes();
    const { data: clientsList = [] } = useUniqueClients();
    const { data: funciones = [] } = useUniqueFunciones();

    // Query worker tariffs list
    const { data: listData, isLoading } = useWorkersWithTariffs({
        empresaId: selectedEmpresaId || '',
        search: debouncedSearch || undefined,
        clienteNombre: clienteNombre.length > 0 ? clienteNombre : undefined,
        contratante: contratante || undefined,
        funcion: funcion || undefined,
        statusTrabajador: ['ativos', 'pendientes_ingreso'], // Focus on active workers for tariff mapping
        sortColumn,
        sortDirection,
        page,
        pageSize
    });

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    useEffect(() => {
        if (selectedEmpresaId && empresas && contratantes.length > 0) {
            const currentEmpresa = empresas.find(e => e.id === selectedEmpresaId);
            if (currentEmpresa) {
                const matchedOption = contratantes.find(c => 
                    c.toLowerCase().includes(currentEmpresa.codigo.toLowerCase()) ||
                    currentEmpresa.codigo.toLowerCase().includes(c.toLowerCase()) ||
                    currentEmpresa.nome.toLowerCase().includes(c.toLowerCase())
                );
                if (matchedOption && matchedOption !== contratante) {
                    updateSearchParams({ contratante: matchedOption, page: '1' });
                }
            }
        }
    }, [selectedEmpresaId, empresas, contratantes]);

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

    const openEditDialog = (worker: Worker & { worker_beneficios_settings?: any }) => {
        setSelectedWorker(worker);
        setEditOpen(true);
    };

    // Prepare filter options
    const clientOptions = [
        { value: 'all', label: 'Todos os clientes' },
        ...clientsList.sort((a, b) => a.localeCompare(b)).map(c => ({ value: c, label: c }))
    ];

    const companyOptions = [
        { value: 'all', label: 'Todas as empresas' },
        ...contratantes.sort((a, b) => a.localeCompare(b)).map(c => ({ value: c, label: c }))
    ];

    const funcionOptions = [
        { value: 'all', label: 'Todas as funções' },
        ...funciones.sort((a, b) => a.localeCompare(b)).map(f => ({ value: f, label: f }))
    ];

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-3">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight">Gestão de Tarifas</h1>
                    <span className="text-sm font-medium text-muted-foreground">Gerencie as tarifas horárias pagas aos trabalhadores</span>
                </div>,
                portalNode
            )}

            {/* Header controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 shrink-0 bg-card p-4 rounded-md border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Tags className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Tarifas de Trabalhadores</h2>
                        <p className="text-xs text-muted-foreground">Configurações individuais de remuneração horária</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ImportTarifasDialog 
                        trigger={
                            <Button className="bg-indigo-600 hover:bg-indigo-700 h-9 text-xs font-medium">
                                <DownloadCloud className="w-4 h-4 mr-2" />
                                Importar Tarifas (Excel)
                            </Button>
                        }
                    />
                    <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                        {totalCount} Trabalhador(es)
                    </Badge>
                </div>
            </div>

            {/* Filters section */}
            <Card className="shrink-0 shadow-sm">
                <CardContent className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Search */}
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Buscar Trabalhador</span>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Nome ou NISS..."
                                    className="pl-8 h-9 text-xs"
                                    value={search}
                                    onChange={(e) => updateSearchParams({ search: e.target.value, page: '1' })}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        {/* Client */}
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Filtrar por Cliente</span>
                            <Combobox
                                className="w-full h-9 text-xs bg-background"
                                options={clientOptions}
                                value={clienteNombre[0] || 'all'}
                                onChange={(v) => updateSearchParams({ clienteNombre: v === 'all' ? null : v, page: '1' })}
                                placeholder="Buscar cliente..."
                                emptyText="Nenhum cliente encontrado."
                            />
                        </div>

                        {/* Company (Contratante) */}
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Filtrar por Empresa</span>
                            <Combobox
                                className="w-full h-9 text-xs bg-background"
                                options={companyOptions}
                                value={contratante || 'all'}
                                onChange={(v) => {
                                    const nextVal = v === 'all' ? null : v;
                                    updateSearchParams({ contratante: nextVal, page: '1' });
                                    if (nextVal) {
                                        const matched = empresas?.find(e => 
                                            nextVal.toLowerCase().includes(e.codigo.toLowerCase()) || 
                                            e.codigo.toLowerCase().includes(nextVal.toLowerCase()) ||
                                            e.nome.toLowerCase().includes(nextVal.toLowerCase()) ||
                                            nextVal.toLowerCase().includes(e.nome.toLowerCase())
                                        );
                                        if (matched && matched.id !== selectedEmpresaId) {
                                            setSelectedEmpresaId(matched.id);
                                        }
                                    }
                                }}
                                placeholder="Buscar empresa..."
                                emptyText="Nenhuma empresa encontrada."
                            />
                        </div>

                        {/* Function (Funcion) */}
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Filtrar por Função</span>
                            <Combobox
                                className="w-full h-9 text-xs bg-background"
                                options={funcionOptions}
                                value={funcion || 'all'}
                                onChange={(v) => updateSearchParams({ funcion: v === 'all' ? null : v, page: '1' })}
                                placeholder="Buscar função..."
                                emptyText="Nenhuma função encontrada."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table section */}
            <div className="flex-1 min-h-0 bg-card rounded-md border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[80px] font-semibold cursor-pointer select-none" onClick={() => handleSort('cod_colab')}>
                                    <div className="flex items-center">Cód {renderSortIcon('cod_colab')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('nome')}>
                                    <div className="flex items-center font-bold">Trabalhador {renderSortIcon('nome')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('funcion')}>
                                    <div className="flex items-center">Função {renderSortIcon('funcion')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('cliente_nombre')}>
                                    <div className="flex items-center">Cliente {renderSortIcon('cliente_nombre')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('contratante')}>
                                    <div className="flex items-center">Empresa {renderSortIcon('contratante')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none text-center" onClick={() => handleSort('status_seguridad')}>
                                    <div className="flex items-center justify-center">Segurança {renderSortIcon('status_seguridad')}</div>
                                </TableHead>
                                <TableHead className="text-right font-semibold w-[140px]">
                                    Tarifa (Hora)
                                </TableHead>
                                <TableHead className="text-right font-semibold w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-48">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                            <span>Carregando tarifas...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : !listData || listData.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-48 text-muted-foreground italic">
                                        Nenhum trabalhador correspondente encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                listData.data.map((worker) => {
                                    const tariff = worker.worker_beneficios_settings?.tarifa_hora ?? 0;
                                    return (
                                        <TableRow key={worker.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {worker.cod_colab || '-'}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                {worker.nome}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {worker.funcion || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {worker.cliente_nombre || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {worker.contratante || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge 
                                                    variant={worker.status_seguridad === 'Alta' ? 'default' : 'secondary'}
                                                    className={worker.status_seguridad === 'Alta' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 text-slate-700'}
                                                >
                                                    {worker.status_seguridad || 'Desconhecido'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-500">
                                                € {Number(tariff).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => openEditDialog(worker)}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination footer */}
                <div className="h-12 border-t px-4 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                    <span className="text-muted-foreground">
                        Página <strong>{page}</strong> de <strong>{totalPages}</strong> (Total: {totalCount})
                    </span>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={page === 1}
                            onClick={() => updateSearchParams({ page: (page - 1).toString() })}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={page === totalPages}
                            onClick={() => updateSearchParams({ page: (page + 1).toString() })}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <EditTariffDialog 
                open={editOpen}
                onOpenChange={setEditOpen}
                worker={selectedWorker}
            />
        </div>
    );
}
