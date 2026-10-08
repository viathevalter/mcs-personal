import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSolicitudTargets } from '../hooks/useSolicitudTargets';
import { useWorkerAssignments } from '../hooks/useWorkerAssignments';
import { formatDateClean } from '@/shared/utils/dateUtils';

function formatLocalDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    return formatDateClean(dateStr);
}

export function SolicitudTargetsTab({ solicitud }: { solicitud: any }) {
    const { t } = useTranslation();
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
        return <div className="p-8 text-center text-muted-foreground">{t('common.loading', 'Carregando...')}</div>;
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
                    {t('solicitud_detail.targets.empty')}
                </CardContent>
            </Card>
        );
    }

    const isOffboarding = solicitud?.tipo === 'offboarding' || displayItems.some((t: any) => t.action_type === 'offboard');

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('solicitud_detail.targets.title')}</CardTitle>
                <CardDescription>
                    {t('solicitud_detail.targets.description')}{targets.length > 0 ? ` (${targets[0]?.action_type})` : ''}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead>{t('solicitud_detail.targets.worker')}</TableHead>
                                <TableHead>{t('solicitud_detail.targets.origin')}</TableHead>
                                {solicitud?.tipo === 'relocation' && (
                                    <>
                                        <TableHead>{t('solicitud_detail.targets.destination')}</TableHead>
                                        <TableHead>{t('solicitud_detail.targets.housing')}</TableHead>
                                    </>
                                )}
                                {isOffboarding && (
                                    <>
                                        <TableHead>{t('solicitud_detail.targets.offboarding_date')}</TableHead>
                                        <TableHead>{t('solicitud_detail.targets.reason')}</TableHead>
                                    </>
                                )}
                                <TableHead>{t('solicitud_detail.targets.action')}</TableHead>
                                <TableHead>{t('solicitud_detail.targets.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayItems.map((target: any) => {
                                const workerName = target.source_worker?.nome || 'N/A';
                                const siteName = target.source_site?.name || 'N/A';
                                const clientName = target.source_client?.trade_name || target.source_client?.legal_name || 'N/A';
                                const targetSiteName = target.target_site?.name || 'N/A';
                                const targetClientName = target.target_client?.trade_name || target.target_client?.legal_name || 'N/A';

                                return (
                                    <TableRow key={target.id}>
                                        <TableCell>
                                            <div className="font-medium">{workerName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {target.source_worker?.cod_colab || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="font-medium">{clientName}</div>
                                            <div className="text-xs text-muted-foreground">{siteName}</div>
                                        </TableCell>
                                        {solicitud?.tipo === 'relocation' && (
                                            <>
                                                <TableCell className="text-sm">
                                                    <div className="font-semibold text-blue-600 dark:text-blue-400">{targetClientName}</div>
                                                    <div className="text-xs text-muted-foreground">{targetSiteName}</div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {target.requires_housing ? (
                                                        <div className="flex flex-col space-y-1">
                                                            <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-955/20 dark:text-amber-400 px-2 py-0.5 rounded max-w-fit text-[10px] border border-amber-200 dark:border-amber-900/50">
                                                                {t('solicitud_detail.targets.yes')}
                                                            </span>
                                                            {target.housing_start_date && (
                                                                <span className="text-slate-500 font-medium">
                                                                    {formatLocalDate(target.housing_start_date)} - {target.housing_end_date ? formatLocalDate(target.housing_end_date) : t('solicitud_detail.targets.undefined_end')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t('solicitud_detail.targets.no')}</span>
                                                    )}
                                                </TableCell>
                                            </>
                                        )}
                                        {isOffboarding && (
                                            <>
                                                <TableCell className="text-xs font-bold whitespace-nowrap text-rose-700 dark:text-rose-400">
                                                    📅 {solicitud?.due_date ? formatLocalDate(solicitud?.due_date) : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-[200px] leading-tight">
                                                    {target.reason || solicitud?.reason || target.notes || '-'}
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-[10px]">
                                                {target.action_type === 'relocate' ? t('solicitud_detail.targets.actions.relocate') : 
                                                 target.action_type === 'replace' ? t('solicitud_detail.targets.actions.replace') : 
                                                 target.action_type === 'offboard' ? t('solicitud_detail.targets.actions.offboard') : 
                                                 target.action_type === 'test' ? t('solicitud_detail.targets.actions.test') : target.action_type}
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
