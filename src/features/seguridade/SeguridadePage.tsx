import { useState } from 'react';
import { useSeguridadeList } from './hooks/useSeguridadeList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ArrowRight, CheckCircle2, AlertCircle, LayoutGrid, List } from 'lucide-react';
import type { SeguridadeStatusWithWorker } from '@/shared/types/corePersonal';

export function SeguridadePage() {
    const { data: statuses, isLoading, isError } = useSeguridadeList();
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilter, setClienteFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

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

    const clients = Array.from(new Set((statuses || []).map(s => s.origem_cliente_nome).filter(Boolean))) as string[];
    clients.sort();

    const filteredStatuses = (statuses || []).filter(s => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchesSearch = s.worker.nome.toLowerCase().includes(search) ||
                s.worker.cod_colab.toLowerCase().includes(search) ||
                s.origem.toLowerCase().includes(search) ||
                (s.worker.niss && s.worker.niss.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }

        if (clienteFilter !== 'all') {
            if (s.origem_cliente_nome !== clienteFilter) return false;
        }

        return true;
    });

    const pendentes = filteredStatuses.filter(s => s.status === 'pendente');
    const confirmados = filteredStatuses.filter(s => s.status === 'confirmado');
    const erros = filteredStatuses.filter(s => s.status === 'erro' || s.status === 'cancelado');

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Seguridade Social</h1>
                    <p className="text-muted-foreground">
                        Gestão centralizada de fluxo financeiro/contábil: controle de Altas e Baixas de trabalhadores.
                    </p>
                </div>
            </header>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar trabalhador, cód, NISS..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full sm:w-[250px]">
                    <Select value={clienteFilter} onValueChange={setClienteFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Ver Todos os Clientes</SelectItem>
                            {clients.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1"></div>

                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md">
                    <Button
                        variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('kanban')}
                        className="h-8"
                    >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Kanban
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8"
                    >
                        <List className="h-4 w-4 mr-2" />
                        Lista
                    </Button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Board Column: Pendentes */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                                Ação Pendente
                            </h2>
                            <Badge variant="secondary">{pendentes.length}</Badge>
                        </div>
                        <div className="flex flex-col gap-3">
                            {pendentes.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pendência.</p>
                            ) : (
                                pendentes.map(item => <StatusCard key={item.id} item={item} />)
                            )}
                        </div>
                    </div>

                    {/* Board Column: Em Erro / Cancelado */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-destructive"></span>
                                Atenção Requerida
                            </h2>
                            <Badge variant="secondary">{erros.length}</Badge>
                        </div>
                        <div className="flex flex-col gap-3">
                            {erros.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum erro.</p>
                            ) : (
                                erros.map(item => <StatusCard key={item.id} item={item} />)
                            )}
                        </div>
                    </div>

                    {/* Board Column: Confirmados (Recent) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                                Confirmados
                            </h2>
                            <Badge variant="secondary">{confirmados.length}</Badge>
                        </div>
                        <div className="flex flex-col gap-3">
                            {confirmados.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum item processado buscando pelo filtro.</p>
                            ) : (
                                confirmados.map(item => <StatusCard key={item.id} item={item} />)
                            )}
                        </div>
                    </div>
                </main>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status / Evento</TableHead>
                                <TableHead>Trabalhador</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Data Solícita</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStatuses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhum registro encontrado buscando pelo filtro.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStatuses.map((item) => {
                                    const isAlta = item.tipo_evento === 'alta';
                                    const isPendente = item.status === 'pendente';

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${item.status === 'pendente' ? 'bg-amber-500' : item.status === 'confirmado' ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
                                                    <Badge variant={isAlta ? 'default' : 'destructive'} className="uppercase text-[10px] tracking-wider font-semibold">
                                                        {item.tipo_evento}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.worker.nome}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.worker.cod_colab}</TableCell>
                                            <TableCell>{item.origem_cliente_nome || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">{item.origem}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(item.data_solicitacao).toLocaleDateString('pt-PT')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant={isPendente ? 'default' : 'secondary'} asChild>
                                                    <button onClick={() => alert('Abrir modal de resolução')}>
                                                        {isPendente ? 'Tratar' : 'Detalhes'}
                                                    </button>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )
            }
        </div >
    );
}

function StatusCard({ item }: { item: SeguridadeStatusWithWorker }) {
    const isAlta = item.tipo_evento === 'alta';

    return (
        <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <Badge variant={isAlta ? 'default' : 'destructive'} className="mb-2 uppercase text-[10px] tracking-wider font-semibold">
                            {item.tipo_evento}
                        </Badge>
                        <CardTitle className="text-base line-clamp-1">{item.worker.nome}</CardTitle>
                        <CardDescription className="text-xs uppercase font-mono mt-1">
                            {item.worker.cod_colab}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="text-sm space-y-1 mb-4 text-muted-foreground">
                    {item.origem_cliente_nome && (
                        <p className="text-foreground font-medium text-sm mb-2 pb-2 border-b">
                            🏢 {item.origem_cliente_nome}
                        </p>
                    )}
                    <p>
                        <span className="font-medium text-foreground">Origem:</span> {item.origem} {item.origem_id ? `(#${item.origem_id})` : ''}
                    </p>
                    <p>
                        <span className="font-medium text-foreground">Data Req:</span> {new Date(item.data_solicitacao).toLocaleDateString('pt-PT')}
                    </p>
                </div>

                <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => alert('Abrir modal de resolução')}>
                        {item.status === 'confirmado' ? (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                Ver Detalhes
                            </>
                        ) : (
                            <>
                                Tratar Processo
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
