import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, pt } from 'date-fns/locale';
import {
    CalendarIcon,
    Search,
    Plus,
    DownloadCloud,
    Calculator,
    Undo2
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Combobox } from '@/components/ui/combobox';

import { useWorkersForHolerites } from '../hooks/useWorkersForHolerites';
import { useHoleriteEventos } from '../hooks/useHoleriteEventos';
import { HoleriteLancamentosSheet } from '../components/HoleriteEventoDialog';
import { PreviewHoleriteDialog } from '../components/PreviewHoleriteDialog';
import { ImportHorasDialog } from '../components/ImportHorasDialog';
import { useUniqueContratantes } from '@/features/workers/hooks/useUniqueContratantes';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDeleteHorasBatch } from '../hooks/useDeleteHorasBatch';

export function HoleritesPage() {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language.startsWith('pt') ? pt : es;
    const { selectedEmpresaId } = useEmpresa();

    // Default to current month
    const [mesReferencia, setMesReferencia] = useState(format(new Date(), 'yyyy-MM'));
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilter, setClienteFilter] = useState<string>('all');
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');

    const { data: workers, isLoading: isLoadingWorkers } = useWorkersForHolerites(selectedEmpresaId || undefined);
    const { data: eventos, isLoading: isLoadingEventos } = useHoleriteEventos(mesReferencia);
    const { data: contratantesUnicos = [] } = useUniqueContratantes();
    const { mutate: deleteBatch, isPending: isDeletingBatch } = useDeleteHorasBatch();

    const handleUndoBatch = (batchId: string) => {
        if (confirm('Atenção: Você está prestes a excluir TODAS as horas importadas neste lote. Continuar?')) {
            deleteBatch(batchId);
        }
    };

    const recentBatches = React.useMemo(() => {
        if (!eventos) return [];

        const map = new Map<string, { time: number, count: number }>();
        eventos.forEach(e => {
            if (e.import_batch_id && e.categoria === 'total_horas') {
                const time = new Date(e.created_at || Date.now()).getTime();
                const existing = map.get(e.import_batch_id);
                if (!existing) {
                    map.set(e.import_batch_id, { time, count: 1 });
                } else {
                    map.set(e.import_batch_id, { time: Math.max(existing.time, time), count: existing.count + 1 });
                }
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 3)
            .map(([id, data]) => ({ id, count: data.count, date: new Date(data.time) }));
    }, [eventos]);

    // List of last 12 months for the selector
    const monthOptions = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return format(d, 'yyyy-MM');
    });

    // Derive and sort options
    const clientesUnicos = (Array.from(new Set(workers?.map(w => w.cliente_nombre).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));
    const contratantesUnicosSorted = [...contratantesUnicos].sort((a, b) => a.localeCompare(b));

    const clienteOptions = [
        { value: 'all', label: 'Todos os clientes' },
        ...clientesUnicos.map(c => ({ value: c, label: c }))
    ];

    const contratanteOptions = [
        { value: 'all', label: 'Todas as empresas' },
        ...contratantesUnicosSorted.map(c => ({ value: c, label: c }))
    ];

    const filteredWorkers = workers?.filter(worker => {
        const matchesSearch = worker.nome.toLowerCase().includes(searchTerm.toLowerCase()) || worker.niss?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCliente = clienteFilter === 'all' || worker.cliente_nombre === clienteFilter;
        // The worker.contratante might be an ID or the Name. The external API returns just Names via the hook. We match if they are equal OR we trust the filter logic.
        const matchesContratante = contratanteFilter === 'all' || worker.contratante === contratanteFilter || (worker.contratante && worker.contratante.includes(contratanteFilter));

        return matchesSearch && matchesCliente && matchesContratante;
    });

    // Helper to calc net
    const calculateWorkerTally = (workerId: string) => {
        if (!eventos) return { proventos: 0, descontos: 0, liquido: 0, totalHoras: 0 };

        const workerEvents = eventos.filter(e => e.trabalhador_id === workerId);

        const proventos = workerEvents
            .filter(e => e.tipo === 'provento')
            .reduce((sum, e) => sum + Number(e.valor), 0);

        const descontos = workerEvents
            .filter(e => e.tipo === 'desconto')
            .reduce((sum, e) => sum + Number(e.valor), 0);

        const totalHoras = workerEvents
            .filter(e => Boolean(e.descricao) && e.descricao!.toLowerCase().includes('hora'))
            .reduce((sum, e) => sum + Number((e as any).quantidade || 0), 0);

        return {
            proventos,
            descontos,
            liquido: proventos - descontos,
            totalHoras
        };
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Calculator className="h-8 w-8 text-indigo-500" />
                <h2 className="text-3xl font-bold tracking-tight">Gestão de Folhas</h2>
            </div>

            <p className="text-muted-foreground max-w-2xl">
                Controle mensal de descontos (Adiantamentos, Multas, Sinistros) e proventos. Selecione o mês de competência para visualizar os trabalhadores.
            </p>

            {recentBatches.length > 0 && (
                <div className="flex flex-col gap-3 bg-amber-50/50 rounded-xl p-4 border border-amber-100/60 max-w-3xl">
                    <div className="text-sm font-medium text-amber-900 flex items-center gap-2">
                        <Undo2 className="h-4 w-4" /> Desfazer Importações Recentes
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {recentBatches.map(b => (
                            <Button
                                key={b.id}
                                variant="outline"
                                size="sm"
                                className="bg-white text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleUndoBatch(b.id)}
                                disabled={isDeletingBatch}
                            >
                                Reverter Lote {format(b.date, 'dd/MM HH:mm')} ({b.count} itens)
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 pb-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                            <div className="space-y-2">
                                <Label>Mês de Competência</Label>
                                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                                    <SelectTrigger className="w-full bg-white dark:bg-slate-900">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Selecione o mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map(month => (
                                            <SelectItem key={month} value={month}>
                                                {format(new Date(month + '-02'), 'MMMM yyyy', { locale: currentLocale }).toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Combobox
                                    className="bg-white dark:bg-slate-900"
                                    options={clienteOptions}
                                    value={clienteFilter}
                                    onChange={(v) => setClienteFilter(v || 'all')}
                                    placeholder="Buscar cliente..."
                                    emptyText="Nenhum cliente encontrado."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Empresa</Label>
                                <Combobox
                                    className="bg-white dark:bg-slate-900"
                                    options={contratanteOptions}
                                    value={contratanteFilter}
                                    onChange={(v) => setContratanteFilter(v || 'all')}
                                    placeholder="Buscar empresa..."
                                    emptyText="Nenhuma empresa encontrada."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Buscar Trabalhador</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Nome ou NISS..."
                                        className="pl-9 bg-white dark:bg-slate-900"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <ImportHorasDialog
                                mesReferencia={mesReferencia}
                                workers={workers || []}
                                trigger={
                                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                                        <DownloadCloud className="mr-2 h-4 w-4" />
                                        Importar Horas (Excel)
                                    </Button>
                                }
                            />
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900">
                                {isLoadingWorkers ? '...' : (filteredWorkers?.length || 0)} Trabalhador(es) na lista
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead className="pl-6">Trabalhador</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Segurança</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Tarifa (H)</TableHead>
                                <TableHead className="text-right">Total Horas</TableHead>
                                <TableHead className="text-right">Proventos (Mês)</TableHead>
                                <TableHead className="text-right">Descontos (Mês)</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingWorkers || isLoadingEventos ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-24">Carregando trabalhadores e eventos...</TableCell>
                                </TableRow>
                            ) : (!workers || workers.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                        Nenhum trabalhador ativo ou pendente encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : filteredWorkers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                        Nenhum trabalhador correspondente na busca.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredWorkers?.map((worker) => {
                                    const { proventos, descontos, totalHoras } = calculateWorkerTally(worker.id);
                                    const hasEvents = proventos > 0 || descontos > 0;

                                    return (
                                        <TableRow key={worker.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                            <TableCell className="pl-6 font-medium">
                                                {worker.nome}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {worker.cliente_nombre || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={worker.status_seguridad === 'Alta' ? 'default' : 'secondary'}
                                                    className={worker.status_seguridad === 'Alta' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 text-slate-700'}
                                                >
                                                    {worker.status_seguridad || 'Desconhecido'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={hasEvents ? 'border-indigo-500 text-indigo-500' : 'text-muted-foreground'}>
                                                    {hasEvents ? 'Valores Lançados' : 'Sem Lançamentos'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                € {worker.worker_beneficios_settings?.tarifa_hora || '0.00'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {totalHoras > 0 ? `${totalHoras} h` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600 dark:text-green-500">
                                                {proventos > 0 ? `+ € ${proventos.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600 dark:text-red-500">
                                                {descontos > 0 ? `- € ${descontos.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 space-x-2">
                                                <HoleriteLancamentosSheet
                                                    worker={worker}
                                                    mesReferencia={mesReferencia}
                                                    eventosMensais={eventos?.filter(e => e.trabalhador_id === worker.id) || []}
                                                    trigger={
                                                        <Button size="sm" variant="outline" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                                            <Plus className="mr-1 h-4 w-4" />
                                                            Lançamentos
                                                        </Button>
                                                    }
                                                />
                                                <PreviewHoleriteDialog
                                                    worker={worker}
                                                    mesReferencia={mesReferencia}
                                                    eventosMensais={eventos?.filter(e => e.trabalhador_id === worker.id) || []}
                                                    trigger={
                                                        <Button size="sm" variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                                            Visualizar
                                                        </Button>
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
