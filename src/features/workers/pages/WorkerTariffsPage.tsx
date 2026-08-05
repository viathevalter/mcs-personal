import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
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
    Tags,
    Users,
    ShieldAlert,
    Clock,
    Banknote,
    Copy,
    Check,
    CreditCard,
    Building2,
    ChevronDown,
    ChevronUp,
    Percent,
    Briefcase
} from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportTarifasDialog } from '../components/ImportTarifasDialog';
import { EditTariffDialog } from '../components/EditTariffDialog';
import type { Worker } from '@/shared/types/corePersonal';

const PASTEL_CLIENT_STYLES = [
    { badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/70' },
    { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/70' },
    { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/70' },
    { badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/70' },
    { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/70' },
    { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/70' },
    { badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/70' },
    { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/70' },
];

function getClientStyle(clientName: string | null) {
    if (!clientName || clientName === '-') return PASTEL_CLIENT_STYLES[0];
    let hash = 0;
    for (let i = 0; i < clientName.length; i++) {
        hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PASTEL_CLIENT_STYLES.length;
    return PASTEL_CLIENT_STYLES[index];
}

function formatIban(iban: string) {
    if (!iban) return '';
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function WorkerTariffsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedEmpresaId, setSelectedEmpresaId, empresas } = useEmpresa();
    const { t } = useTranslation();

    // Query params & pagination
    const search = searchParams.get('search') || '';
    const clienteNombre = searchParams.get('clienteNombre')?.split('||').filter(Boolean) || [];
    const contratante = searchParams.get('contratante') || null;
    const funcion = searchParams.get('funcion') || null;
    const statusSeguridad = searchParams.get('statusSeguridad') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortColumn = searchParams.get('sortColumn') || 'nome';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc';

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<(Worker & { worker_beneficios_settings?: any }) | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

    const toggleRow = (workerId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(workerId)) {
            newExpanded.delete(workerId);
        } else {
            newExpanded.add(workerId);
        }
        setExpandedRows(newExpanded);
    };

    const handleCopyIban = (workerId: string, iban: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(iban);
        setCopiedIbanId(workerId);
        setTimeout(() => setCopiedIbanId(null), 2000);
    };

    const debouncedSearch = useDebounce(search, 400);

    const { data: workerIbansMap } = useQuery({
        queryKey: ['worker-ibans-map', selectedEmpresaId],
        queryFn: async () => {
            if (!selectedEmpresaId) return new Map<string, { iban: string; banco: string }>();
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .select('worker_id, iban, banco')
                .eq('status', 'ATIVO');

            if (error) {
                console.error("Error fetching active worker ibans for tariffs:", error);
                return new Map<string, { iban: string; banco: string }>();
            }

            const map = new Map<string, { iban: string; banco: string }>();
            (data || []).forEach((row: any) => {
                if (row.worker_id && row.iban) {
                    map.set(row.worker_id, { iban: row.iban, banco: row.banco || '' });
                }
            });
            return map;
        },
        enabled: Boolean(selectedEmpresaId)
    });

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
        statusSeguridad: statusSeguridad ? [statusSeguridad] : undefined,
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
    const workersList = listData?.data || [];

    const altaCount = React.useMemo(() => {
        return workersList.filter(w => w.status_seguridad === 'Alta').length;
    }, [workersList]);

    const regCount = React.useMemo(() => {
        return workersList.filter(w => w.status_seguridad !== 'Alta').length;
    }, [workersList]);

    const { avgTariff, withTariffCount, zeroTariffCount } = React.useMemo(() => {
        if (!workersList || workersList.length === 0) {
            return { avgTariff: 0, withTariffCount: 0, zeroTariffCount: 0 };
        }
        let total = 0;
        let withTariff = 0;
        let zeroTariff = 0;

        workersList.forEach(w => {
            const t = Number(w.worker_beneficios_settings?.tarifa_hora || 0);
            if (t > 0) {
                total += t;
                withTariff++;
            } else {
                zeroTariff++;
            }
        });

        return {
            avgTariff: withTariff > 0 ? total / withTariff : 0,
            withTariffCount: withTariff,
            zeroTariffCount: zeroTariff
        };
    }, [workersList]);

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
        <div className="h-[calc(100vh-100px)] w-full flex flex-col space-y-3 p-6 overflow-hidden">
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

            {/* Top KPI Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trabalhadores</span>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
                            <span className="text-[10px] text-muted-foreground">Cadastrados no filtro</span>
                        </div>
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Segurança Social</span>
                            <div className="flex items-center gap-1.5 text-lg font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">{altaCount} Alta</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold">{regCount} Reg.</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Status de alta na segurança</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/50 shadow-sm">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Média Tarifa (Hora)</span>
                            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                € {avgTariff.toFixed(2)} / h
                            </div>
                            <span className="text-[10px] text-muted-foreground">Média das tarifas atribuídas</span>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status das Tarifas</span>
                            <div className="flex items-center gap-1.5 text-lg font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">{withTariffCount} Atrib.</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold">{zeroTariffCount} Zeradas</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Trabalhadores com valores</span>
                        </div>
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                            <Percent className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters section */}
            <Card className="shrink-0 shadow-sm">
                <CardContent className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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

                        {/* Security Status Filter */}
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Filtrar por Segurança</span>
                            <Select
                                value={statusSeguridad || 'all'}
                                onValueChange={(v) => updateSearchParams({ statusSeguridad: v === 'all' ? null : v, page: '1' })}
                            >
                                <SelectTrigger className="w-full h-9 text-xs bg-background">
                                    <SelectValue placeholder="Todas as seguranças" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as seguranças</SelectItem>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                    <SelectItem value="Em Regularização">Em Regularização</SelectItem>
                                    <SelectItem value="Baja">Baja</SelectItem>
                                    <SelectItem value="Pendiente Alta">Pendiente Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table section */}
            <div className="flex-1 min-h-0 bg-card rounded-md border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
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
                                    const isExpanded = expandedRows.has(worker.id);
                                    const clientStyle = getClientStyle(worker.cliente_nombre);
                                    const ibanInfo = workerIbansMap?.get(worker.id);

                                    return (
                                        <React.Fragment key={worker.id}>
                                            <TableRow 
                                                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}
                                                onClick={() => toggleRow(worker.id)}
                                            >
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                                        <span>{worker.cod_colab || '-'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                    {worker.nome}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {worker.funcion || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {worker.cliente_nombre ? (
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${clientStyle.badge}`}>
                                                            <Building2 className="h-3 w-3 mr-1.5 shrink-0 opacity-70" />
                                                            {worker.cliente_nombre}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
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
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                                    <TableCell colSpan={8} className="p-4 border-b">
                                                        <div className="space-y-4 pl-4 sm:pl-8 pr-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                {/* Contract & Function Info Card */}
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-2">
                                                                    <div className="flex items-center justify-between pb-2 border-b">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                            <Briefcase className="h-4 w-4 text-indigo-500" />
                                                                            Atribuição & Histórico Contratual
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1.5 text-xs">
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Função do Trabalhador</span>
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200">{worker.funcion || 'Não informada'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Cliente Alocado</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{worker.cliente_nombre || 'Não informado'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Empresa Contratante</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{worker.contratante || 'Não informada'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">NISS</span>
                                                                            <span className="font-mono text-slate-600 dark:text-slate-400">{worker.niss || 'Não informado'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Remuneration Settings Card */}
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-2">
                                                                    <div className="flex items-center justify-between pb-2 border-b">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                            <Tags className="h-4 w-4 text-emerald-500" />
                                                                            Configurações da Remuneração
                                                                        </span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEditDialog(worker);
                                                                            }}
                                                                        >
                                                                            <Edit2 className="h-3 w-3 mr-1 text-indigo-500" /> Editar Valores
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Tarifa por Hora</span>
                                                                            <span className="font-mono font-bold text-emerald-600 text-sm">€ {Number(worker.worker_beneficios_settings?.tarifa_hora || 0).toFixed(2)}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Auxílio Moradia</span>
                                                                            <span className="font-semibold text-slate-700">€ {Number(worker.worker_beneficios_settings?.auxilio_moradia_base || 0).toFixed(2)}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Subsídio Alimentação</span>
                                                                            <span className="font-semibold text-slate-700">€ {Number(worker.worker_beneficios_settings?.subsidio_alimentacao || 0).toFixed(2)}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Ajuda de Custo</span>
                                                                            <span className="font-semibold text-slate-700">€ {Number(worker.worker_beneficios_settings?.ajuda_custo || 0).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Bank Account / IBAN Transfer Card */}
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-2">
                                                                    <div className="flex items-center justify-between pb-2 border-b">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                            <CreditCard className="h-4 w-4 text-indigo-500" />
                                                                            Dados de Transferência Bancária
                                                                        </span>
                                                                        {ibanInfo?.iban && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-medium"
                                                                                onClick={(e) => handleCopyIban(worker.id, ibanInfo.iban, e)}
                                                                            >
                                                                                {copiedIbanId === worker.id ? (
                                                                                    <>
                                                                                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copiado!
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Copy className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Copiar IBAN
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    {ibanInfo?.iban ? (
                                                                        <div className="space-y-1.5 text-xs pt-1">
                                                                            <div>
                                                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">IBAN para Pagamento</span>
                                                                                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                                                                                    {formatIban(ibanInfo.iban)}
                                                                                </span>
                                                                            </div>
                                                                            {ibanInfo.banco && (
                                                                                <div className="flex items-center gap-2 pt-1 text-xs">
                                                                                    <span className="text-muted-foreground font-medium">Banco:</span>
                                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{ibanInfo.banco}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-lg border border-amber-200/60 mt-1">
                                                                            <span>Nenhum IBAN ativo cadastrado para este colaborador.</span>
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
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination footer */}
                <div className="h-12 border-t px-4 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                            Página <strong>{page}</strong> de <strong>{totalPages}</strong> (Total: {totalCount})
                        </span>

                        <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-muted-foreground font-medium">Exibir:</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(val) => {
                                    updateSearchParams({ pageSize: val, page: '1' });
                                }}
                            >
                                <SelectTrigger className="h-7 w-[90px] text-xs bg-white dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
