
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSolicitudTargets } from '../hooks/useSolicitudTargets';
import { useWorkerAssignments } from '../hooks/useWorkerAssignments';

export function SolicitudTargetsTab({ solicitud }: { solicitud: any }) {
    const solicitudId = solicitud?.id;
    const { data: targets = [], isLoading: isLoadingTargets } = useSolicitudTargets(solicitudId);
    
    // Se não há targets explícitos, mas temos pedido_id, vamos carregar os trabalhadores alocados ao pedido
    const hasNoTargets = !isLoadingTargets && (!targets || targets.length === 0);
    const { data: assignments = [], isLoading: isLoadingAssignments } = useWorkerAssignments({
        empresa_id: solicitud?.empresa_id,
        pedido_id: hasNoTargets ? solicitud?.pedido_id : null
    });

    const isLoading = isLoadingTargets || (hasNoTargets && !!solicitud?.pedido_id && isLoadingAssignments);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando trabalhadores...</div>;
    }

    const displayItems = targets.length > 0 
        ? targets 
        : assignments.map((a: any) => ({
            id: a.id,
            source_worker: a.worker,
            source_pedido: a.pedido,
            source_site: a.client_site,
            action_type: 'alocação',
            status: a.status === 'planned' ? 'planejado' : 'ativo'
        }));

    if (displayItems.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    Esta solicitação não possui trabalhadores vinculados.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trabalhadores Vinculados</CardTitle>
                <CardDescription>
                    Lista de alocações e trabalhadores selecionados nesta solicitação{targets.length > 0 ? ` para a ação de ${targets[0]?.action_type}` : ''}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead>Trabalhador</TableHead>
                                <TableHead>Pedido Original</TableHead>
                                <TableHead>Obra / Local</TableHead>
                                <TableHead>Ação</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayItems.map((target: any) => {
                                const workerName = target.source_worker?.nome || 'N/A';
                                const siteName = target.source_site?.name || 'N/A';
                                const pedidoCode = target.source_pedido?.codigo || 'N/A';

                                return (
                                    <TableRow key={target.id}>
                                        <TableCell>
                                            <div className="font-medium">{workerName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {target.source_worker?.cod_colab || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {pedidoCode}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {siteName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-[10px]">
                                                {target.action_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={target.status === 'completed' || target.status === 'ativo' ? 'default' : 'secondary'}
                                                className={target.status === 'completed' || target.status === 'ativo' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                            >
                                                {target.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
