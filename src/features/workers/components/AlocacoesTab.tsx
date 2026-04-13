import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useWorkerAlocacoes } from '../hooks/useWorkerAlocacoes';
import { format } from 'date-fns';

interface AlocacoesTabProps {
    workerCodColab: string;
}

export function AlocacoesTab({ workerCodColab }: AlocacoesTabProps) {
    const { data: alocacoes, isLoading, isError, error } = useWorkerAlocacoes(workerCodColab);

    if (isLoading) {
        return (
            <div className="flex h-40 flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Carregando alocações...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
                <h3 className="font-semibold">Erro ao carregar o histórico de alocações</h3>
                <p>{error?.message || 'Erro desconhecido.'}</p>
            </div>
        );
    }

    if (!alocacoes || alocacoes.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>Nenhuma alocação em Pedidos ou Reemplazos encontrada para este trabalhador.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle>Histórico de Obras e Alocações</CardTitle>
                <CardDescription>
                    Registro de todos os Pedidos e Reemplazos nos quais este trabalhador foi alocado (via SharePoint).
                </CardDescription>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Data Registro</TableHead>
                        <TableHead className="font-semibold text-foreground text-center">Tipo</TableHead>
                        <TableHead className="font-semibold text-foreground">Empresa / Contratante</TableHead>
                        <TableHead className="font-semibold text-foreground">Pedido / Cliente</TableHead>
                        <TableHead className="font-semibold text-foreground">Duração Programada</TableHead>
                        <TableHead className="font-semibold text-foreground">Saída Efetiva</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {alocacoes.map((aloc) => (
                        <TableRow key={aloc.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="whitespace-nowrap">
                                {aloc.inserted_at ? format(new Date(aloc.inserted_at), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={aloc.tiposervico === 'Pedido' ? 'default' : 'outline'} className="text-[10px] uppercase font-semibold">
                                    {aloc.tiposervico || 'Desconhecido'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span className="font-medium text-sm text-foreground">
                                    {aloc.contratante || 'Não definido'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="font-medium text-primary">{aloc.codpedido}</p>
                                <p className="text-sm text-foreground truncate max-w-[200px]" title={aloc.cliente_nombre}>
                                    {aloc.cliente_nombre || 'Cliente Dinâmico'}
                                </p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                <div>
                                    <span className="font-medium text-foreground">Início: </span>
                                    {aloc.fechainiciopedido ? format(new Date(aloc.fechainiciopedido), 'dd/MM/yyyy') : '-'}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Fim Previsto: </span>
                                    {aloc.fechafinpedido ? format(new Date(aloc.fechafinpedido), 'dd/MM/yyyy') : '-'}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">
                                {aloc.fechasalidatrabajador ? (
                                    <span className="text-destructive">{format(new Date(aloc.fechasalidatrabajador), 'dd/MM/yyyy')}</span>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
