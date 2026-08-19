import { useState, useMemo } from 'react';
import { useGlobalMovementHistory } from './hooks/useGlobalMovementHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    Search, 
    ArrowRight, 
    History, 
    CalendarDays, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortField = 'created_at' | 'worker_nome' | 'empresa_nome' | 'cliente_nome' | 'change_type' | 'effective_date';
type SortOrder = 'asc' | 'desc';

export function MovementHistoryPage() {
    const { selectedEmpresaId } = useEmpresa();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data: history, isLoading, isError } = useGlobalMovementHistory({
        empresaId: selectedEmpresaId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

    // Estados de Ordenação
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Estados de Paginação
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(25);

    // Opções de Cliente para o MultiSelect
    const clientOptions = useMemo(() => {
        if (!history) return [];
        const unique = Array.from(new Set(history.map(h => h.cliente_nome))).filter(Boolean).sort();
        return unique.map(c => ({ label: c, value: c }));
    }, [history]);

    // Opções de Empresa para o MultiSelect
    const empresaOptions = useMemo(() => {
        if (!history) return [];
        const unique = Array.from(new Set(history.map(h => h.empresa_nome))).filter(Boolean).sort();
        return unique.map(e => ({ label: e, value: e }));
    }, [history]);

    // Alternar ordenação
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setCurrentPage(1); // Resetar página ao mudar ordenação
    };

    // 1. Filtragem Global (Busca por Texto + Filtros Multiselect + Datas)
    const filteredHistory = useMemo(() => {
        if (!history) return [];
        return history.filter(item => {
            let matchesSearch = true;
            if (searchTerm) {
                const search = searchTerm.toLowerCase().trim();
                matchesSearch = (
                    (item.worker_nome || '').toLowerCase().includes(search) ||
                    (item.worker_cod_colab || '').toLowerCase().includes(search) ||
                    (item.change_type || '').toLowerCase().includes(search) ||
                    (item.new_value || '').toLowerCase().includes(search) ||
                    (item.old_value || '').toLowerCase().includes(search) ||
                    (item.empresa_nome || '').toLowerCase().includes(search) ||
                    (item.cliente_nome || '').toLowerCase().includes(search) ||
                    (item.changed_by_name || '').toLowerCase().includes(search) ||
                    (item.comments || '').toLowerCase().includes(search)
                );
            }

            const matchesClient = selectedClients.length === 0 || selectedClients.includes(item.cliente_nome);
            const matchesEmpresa = selectedEmpresas.length === 0 || selectedEmpresas.includes(item.empresa_nome);

            return matchesSearch && matchesClient && matchesEmpresa;
        });
    }, [history, searchTerm, selectedClients, selectedEmpresas]);

    // 2. Ordenação Global
    const sortedHistory = useMemo(() => {
        return [...filteredHistory].sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === 'created_at' || sortField === 'effective_date') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredHistory, sortField, sortOrder]);

    // 3. Paginação
    const totalRecords = sortedHistory.length;
    const isAll = pageSize === 'all';
    const effectivePageSize = isAll ? totalRecords || 1 : (pageSize as number);
    const totalPages = isAll ? 1 : Math.ceil(totalRecords / effectivePageSize) || 1;

    // Garantir que a página atual seja válida
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedHistory = useMemo(() => {
        if (isAll) return sortedHistory;
        const startIndex = (safeCurrentPage - 1) * effectivePageSize;
        return sortedHistory.slice(startIndex, startIndex + effectivePageSize);
    }, [sortedHistory, isAll, safeCurrentPage, effectivePageSize]);

    // Renderizar o Ícone de Ordenação
    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 inline" />;
        return sortOrder === 'asc' 
            ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary inline" /> 
            : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary inline" />;
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Carregando histórico de movimentações...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-destructive">
                <p>Erro ao carregar o histórico de movimentações. Tente novamente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Movimentações de Trabalhadores</h1>
                    <p className="text-muted-foreground">
                        Painel de auditoria global registrando alterações de estados (Trabalhador, Seguridade e Obras).
                    </p>
                </div>
            </header>

            {/* Barra de Filtros */}
            <Card className="p-4 shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                        <Label>Pesquisa por Texto</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Nome, código, status, usuário..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Empresa</Label>
                        <MultiSelect
                            options={empresaOptions}
                            selected={selectedEmpresas}
                            onChange={(val) => {
                                setSelectedEmpresas(val);
                                setCurrentPage(1);
                            }}
                            placeholder="Selecionar Empresa..."
                        />
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <Label>Cliente / Alocação</Label>
                        <MultiSelect
                            options={clientOptions}
                            selected={selectedClients}
                            onChange={(val) => {
                                setSelectedClients(val);
                                setCurrentPage(1);
                            }}
                            placeholder="Selecionar Cliente..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Início</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data Fim (Opcional)</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Galeria de Movimentações */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <History className="h-5 w-5 text-primary" />
                                Log Global de Movimentações
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Clique no cabeçalho de qualquer coluna para ordenar asc/desc.
                            </CardDescription>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md font-medium border self-start md:self-auto">
                            Total filtrado: <span className="font-bold text-foreground">{totalRecords}</span> movimentações
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    {/* CONTAINER DA TABELA COM HEADER FIXO (STICKY HEADER) E ROLAGEM INTERNA DO MOUSE */}
                    <div className="rounded-md border max-h-[580px] overflow-y-auto relative scrollbar-thin">
                        <Table className="min-w-max w-full">
                            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm border-b">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('created_at')}
                                    >
                                        Data / Hora {renderSortIcon('created_at')}
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('worker_nome')}
                                    >
                                        Trabalhador {renderSortIcon('worker_nome')}
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('empresa_nome')}
                                    >
                                        Empresa {renderSortIcon('empresa_nome')}
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('cliente_nome')}
                                    >
                                        Cliente {renderSortIcon('cliente_nome')}
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('change_type')}
                                    >
                                        Tipo de Mov. {renderSortIcon('change_type')}
                                    </TableHead>
                                    <TableHead className="font-semibold py-3 whitespace-nowrap">
                                        Alteração (De &rarr; Para)
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none font-semibold hover:text-primary transition-colors py-3 whitespace-nowrap"
                                        onClick={() => handleSort('effective_date')}
                                    >
                                        Data Efetiva {renderSortIcon('effective_date')}
                                    </TableHead>
                                    <TableHead className="font-semibold py-3 whitespace-nowrap">
                                        Usuário
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {paginatedHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            Nenhuma movimentação encontrada para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedHistory.map((entry) => (
                                        <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground" title={new Date(entry.created_at).toLocaleString('pt-PT')}>
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                    {new Date(entry.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium whitespace-nowrap">{entry.worker_nome}</div>
                                                <div className="text-xs text-muted-foreground uppercase font-mono">{entry.worker_cod_colab}</div>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[150px] truncate" title={entry.empresa_nome}>
                                                {entry.empresa_nome}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={entry.cliente_nome}>
                                                {entry.cliente_nome}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-semibold text-[11px] whitespace-nowrap">
                                                    {entry.change_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                                                    <span className="text-muted-foreground line-through decoration-muted-foreground/50 text-xs">{entry.old_value || 'Nenhum'}</span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <Badge 
                                                        variant={
                                                            ['INATIVO', 'INACTIVO', 'BAIXA', 'DESLIGADO', 'DESISTIU'].includes(entry.new_value?.toUpperCase() || '')
                                                                ? 'destructive'
                                                                : ['ATIVO', 'ACTIVO', 'ALTA'].includes(entry.new_value?.toUpperCase() || '')
                                                                    ? 'default'
                                                                    : 'secondary'
                                                        } 
                                                        className="uppercase text-[10px] font-bold"
                                                    >
                                                        {entry.new_value}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap font-mono text-xs">
                                                {entry.effective_date ? new Date(entry.effective_date).toLocaleDateString('pt-PT') : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={entry.changed_by_name}>
                                                {entry.changed_by_name}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t text-sm">
                        {/* Seletor de Itens Por Página */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Itens por página:</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(val) => {
                                    if (val === 'all') {
                                        setPageSize('all');
                                    } else {
                                        setPageSize(Number(val));
                                    }
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[95px] text-xs">
                                    <SelectValue placeholder="25" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                    <SelectItem value="250">250</SelectItem>
                                    <SelectItem value="all">Todos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Indicador do Intervalo Atual */}
                        <div className="text-xs text-muted-foreground">
                            {isAll ? (
                                <span>Mostrando <strong>todas as {totalRecords}</strong> movimentações</span>
                            ) : (
                                <span>
                                    Mostrando <strong>{totalRecords > 0 ? (safeCurrentPage - 1) * (pageSize as number) + 1 : 0}</strong>–<strong>{Math.min(safeCurrentPage * (pageSize as number), totalRecords)}</strong> de <strong>{totalRecords}</strong> movimentações
                                </span>
                            )}
                        </div>

                        {/* Botões de Navegação */}
                        {!isAll && totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage === 1}
                                    title="Primeira página"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safeCurrentPage === 1}
                                    title="Página anterior"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <span className="text-xs px-2 font-medium">
                                    Página {safeCurrentPage} de {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safeCurrentPage === totalPages}
                                    title="Próxima página"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage === totalPages}
                                    title="Última página"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
