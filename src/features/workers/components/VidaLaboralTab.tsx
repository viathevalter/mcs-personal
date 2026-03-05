import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useVidaLaboral } from '../hooks/useVidaLaboral';
import { format } from 'date-fns';

interface VidaLaboralTabProps {
    workerId: string;
}

export function VidaLaboralTab({ workerId }: VidaLaboralTabProps) {
    const { data: history, isLoading, isError, error } = useVidaLaboral(workerId);

    if (isLoading) {
        return (
            <div className="flex h-40 flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Carregando histórico laboral...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
                <h3 className="font-semibold">Erro ao carregar o histórico</h3>
                <p>{error?.message || 'Erro desconhecido.'}</p>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>Nenhum registro de Alta ou Baixa encontrado para este trabalhador.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle>Histórico de Seguridade (Vida Laboral)</CardTitle>
                <CardDescription>
                    Registro de todas as Altas e Baixas deste trabalhador no sistema.
                </CardDescription>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Data Solicitação</TableHead>
                        <TableHead className="font-semibold text-foreground text-center">Evento</TableHead>
                        <TableHead className="font-semibold text-foreground">Status do Processo</TableHead>
                        <TableHead className="font-semibold text-foreground">Data Efetiva</TableHead>
                        <TableHead className="font-semibold text-foreground">Origem (Pedido/Reemplazo)</TableHead>
                        <TableHead className="font-semibold text-foreground">Cliente Atendido</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((record) => (
                        <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="whitespace-nowrap">
                                {format(new Date(record.data_solicitacao), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge
                                    variant={record.tipo_evento === 'alta' ? 'default' : 'destructive'}
                                    className="uppercase text-[10px] font-semibold"
                                >
                                    {record.tipo_evento}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${record.status === 'pendente' ? 'bg-amber-500' : record.status === 'confirmado' ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
                                    <span className="capitalize">{record.status}</span>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {record.data_efetiva ? format(new Date(record.data_efetiva), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-muted-foreground">
                                {record.origem} {record.origem_id && `(${record.origem_id})`}
                            </TableCell>
                            <TableCell>
                                {record.origem_cliente_nome || '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
