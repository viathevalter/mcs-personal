import { useState, useMemo } from 'react';
import { useGlobalMovementHistory } from './hooks/useGlobalMovementHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ArrowRight, History, CalendarDays } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';

export function MovementHistoryPage() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data: history, isLoading, isError } = useGlobalMovementHistory({
        startDate: startDate || undefined,
        endDate: endDate || undefined
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

    const clientOptions = useMemo(() => {
        if (!history) return [];
        const unique = Array.from(new Set(history.map(h => h.cliente_nome))).filter(Boolean).sort();
        return unique.map(c => ({ label: c, value: c }));
    }, [history]);

    const empresaOptions = useMemo(() => {
        if (!history) return [];
        const unique = Array.from(new Set(history.map(h => h.empresa_nome))).filter(Boolean).sort();
        return unique.map(e => ({ label: e, value: e }));
    }, [history]);

    const filteredHistory = (history || []).filter(item => {
        let matchesSearch = true;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            matchesSearch = (
                item.worker_nome.toLowerCase().includes(search) ||
                item.worker_cod_colab.toLowerCase().includes(search) ||
                item.change_type.toLowerCase().includes(search) ||
                item.new_value.toLowerCase().includes(search) ||
                (item.old_value?.toLowerCase() || '').includes(search)
            );
        }

        const matchesClient = selectedClients.length === 0 || selectedClients.includes(item.cliente_nome);
        const matchesEmpresa = selectedEmpresas.length === 0 || selectedEmpresas.includes(item.empresa_nome);

        return matchesSearch && matchesClient && matchesEmpresa;
    });

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
            <Card className="p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                        <Label>Pesquisa por Texto</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Nome, código, status..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Empresa</Label>
                        <MultiSelect
                            options={empresaOptions}
                            selected={selectedEmpresas}
                            onChange={setSelectedEmpresas}
                            placeholder="Selecionar Empresa..."
                        />
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <Label>Cliente / Alocação</Label>
                        <MultiSelect
                            options={clientOptions}
                            selected={selectedClients}
                            onChange={setSelectedClients}
                            placeholder="Selecionar Cliente..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Início</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data Fim (Opcional)</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Log Global da Empresa
                    </CardTitle>
                    <CardDescription>
                        Todas as inserções e alterações recentes de Status são exibidas do mais novo para o mais antigo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-max">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data / Hora</TableHead>
                                    <TableHead>Trabalhador</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Tipo de Mov.</TableHead>
                                    <TableHead>Alteração (De &rarr; Para)</TableHead>
                                    <TableHead>Data Efetiva</TableHead>
                                    <TableHead>Usuário</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            Nenhuma movimentação encontrada para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistory.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground cursor-default" title={new Date(entry.created_at).toLocaleString('pt-PT')}>
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {new Date(entry.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium whitespace-nowrap">{entry.worker_nome}</div>
                                                <div className="text-xs text-muted-foreground uppercase">{entry.worker_cod_colab}</div>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[150px] truncate" title={entry.empresa_nome}>
                                                {entry.empresa_nome}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-700 max-w-[180px] truncate" title={entry.cliente_nome}>
                                                {entry.cliente_nome}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-semibold text-xs whitespace-nowrap">
                                                    {entry.change_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                                                    <span className="text-muted-foreground line-through decoration-muted-foreground/50">{entry.old_value || 'Nenhum'}</span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <Badge variant={entry.new_value?.toUpperCase() === 'INATIVO' || entry.new_value?.toUpperCase() === 'BAIXA' ? 'destructive' : entry.new_value?.toUpperCase() === 'ATIVO' || entry.new_value?.toUpperCase() === 'ALTA' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                                                        {entry.new_value}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {entry.effective_date ? new Date(entry.effective_date).toLocaleDateString('pt-PT') : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={entry.changed_by_name}>
                                                {(entry as any).changed_by_name}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
