import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../shared/supabase/client';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { listWorkers } from '../workers/api/workersApi';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, ArrowLeft, DownloadCloud, FileText, Check, XCircle, Upload, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AdminUploadDialog } from './components/AdminUploadDialog';
import { useRole } from '../../app/providers/RoleProvider';

interface WorkerDetail {
    worker_id: string;
    worker_name: string;
    pasaporte: string | null;
    movil: string | null;
    status: 'pendente' | 'enviado' | 'validado';
    file_url?: string;
    file_name?: string;
    hour_record_id?: string;
    sharepoint_sync_status?: 'pending' | 'syncing' | 'success' | 'failed';
    sharepoint_sync_date?: string;
    sharepoint_error?: string;
}

export function ClientHoursDetail() {
    const { clientName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { selectedEmpresaId } = useEmpresa();
    const { role } = useRole();

    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const [workers, setWorkers] = useState<WorkerDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [uploadDialogState, setUploadDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        hourRecordId?: string;
    }>({ open: false, workerId: '', workerName: '' });

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    useEffect(() => {
        if (selectedEmpresaId && clientName) {
            fetchClientWorkers();
        }
    }, [selectedEmpresaId, clientName, year, month]);

    const fetchClientWorkers = async () => {
        setLoading(true);
        try {
            // Fetch workers for this client
            const { data: workersData } = await listWorkers({
                empresaId: selectedEmpresaId as string,
                clienteNombre: clientName || '',
                statusTrabajador: ['ativos'],
                page: 1,
                pageSize: 5000,
            });

            // Fetch hour records
            const workerIds = workersData?.map(w => w.id) || [];
            let hoursData: any[] = [];

            if (workerIds.length > 0) {
                const { data: hours, error: hoursError } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .select('*')
                    .eq('empresa_id', selectedEmpresaId)
                    .eq('period_year', year)
                    .eq('period_month', month)
                    .in('worker_id', workerIds);

                if (hoursError) throw hoursError;
                hoursData = hours || [];
            }

            // Merge details
            const merged: WorkerDetail[] = workersData?.map(w => {
                const hr = hoursData.find(h => h.worker_id === w.id);
                return {
                    worker_id: w.id,
                    worker_name: w.nome,
                    pasaporte: w.pasaporte,
                    movil: w.movil,
                    status: hr?.status || 'pendente',
                    file_url: hr?.file_url,
                    file_name: hr?.file_name,
                    hour_record_id: hr?.id,
                    sharepoint_sync_status: hr?.sharepoint_sync_status,
                    sharepoint_sync_date: hr?.sharepoint_sync_date,
                    sharepoint_error: hr?.sharepoint_error
                };
            }) || [];

            setWorkers(merged.sort((a, b) => a.worker_name.localeCompare(b.worker_name)));

        } catch (error) {
            console.error('Error fetching client details:', error);
            toast.error('Erro ao carregar os dados dos trabalhadores.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewFile = async (filePath: string) => {
        try {
            toast.loading('Gerando link seguro...', { id: 'view_file' });
            const { data, error } = await supabase.storage
                .from('horas_trabalhadores')
                .createSignedUrl(filePath, 60); // 60 seconds validity

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
                toast.success('Arquivo aberto!', { id: 'view_file' });
            }
        } catch (error) {
            console.error('Error opening file:', error);
            toast.error('Erro ao abrir o arquivo.', { id: 'view_file' });
        }
    };

    const handleDownloadFile = async (filePath: string | undefined, fileName: string | undefined, recordId: string) => {
        if (!filePath || !fileName) {
            toast.error('Arquivo não disponível para download.');
            return;
        }
        try {
            setActionLoading(recordId + '-dl');
            toast.loading('Gerando link seguro para download...', { id: 'download_file' });
            const { data, error } = await supabase.storage
                .from('horas_trabalhadores')
                .createSignedUrl(filePath, 60); // 60 seconds validity

            if (error) throw error;
            if (data?.signedUrl) {
                const link = document.createElement('a');
                link.href = data.signedUrl;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Download iniciado!', { id: 'download_file' });
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Erro ao baixar o arquivo.', { id: 'download_file' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleValidateFile = async (recordId: string) => {
        try {
            setActionLoading(recordId + '-ap');
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({ status: 'validado' })
                .eq('id', recordId);

            if (error) throw error;
            toast.success('Folha validada com sucesso!');
            fetchClientWorkers(); // Refresh
        } catch (error) {
            console.error('Error validating:', error);
            toast.error('Erro ao validar a folha.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectFile = async (recordId: string, filePath: string) => {
        if (!confirm('Tem certeza que deseja REJEITAR esta folha? O arquivo será apagado e o trabalhador precisará enviar novamente.')) {
            return;
        }

        try {
            setActionLoading(recordId + '-rj');

            // Delete file from storage first
            const { error: storageError } = await supabase.storage
                .from('horas_trabalhadores')
                .remove([filePath]);

            if (storageError) {
                console.error('Error deleting file:', storageError);
                // Proceed anyway to fix the database state if storage fails
            }

            // Update DB Status
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({ status: 'pendente', file_url: null, file_name: null, sharepoint_sync_status: null, sharepoint_sync_date: null, sharepoint_error: null })
                .eq('id', recordId);

            if (error) throw error;
            toast.success('Folha rejeitada. O trabalhador foi liberado para reenviar.');
            fetchClientWorkers(); // Refresh
        } catch (error) {
            console.error('Error rejecting:', error);
            toast.error('Erro ao rejeitar a folha.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSyncSharePoint = async (recordId: string) => {
        try {
            setActionLoading(recordId + '-sp');
            toast.loading('Iniciando sincronização com Microsoft SharePoint...', { id: 'sharepoint_sync' });

            const { data, error } = await supabase.functions.invoke('sync-to-sharepoint', {
                body: { hour_id: recordId },
            });

            if (error) throw error;

            if (data?.success) {
                toast.success('Arquivo sincronizado com SharePoint!', { id: 'sharepoint_sync' });
            } else {
                throw new Error(data?.error || 'Erro desconhecido na sincronização com SharePoint.');
            }
            fetchClientWorkers(); // Refresh status
        } catch (error: any) {
            console.error('Error syncing to SharePoint:', error);
            toast.error(`Erro ao sincronizar com SharePoint: ${error.message || error.toString()}`, { id: 'sharepoint_sync' });
            fetchClientWorkers(); // Refresh status to show error
        } finally {
            setActionLoading(null);
        }
    };

    const getMonthName = (m: number) => {
        return new Date(2000, m - 1, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    };

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-4 px-4 sm:px-6">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/hours-control')} className="h-8 w-8 -ml-2">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight">{clientName}</h1>
                    </div>
                </div>,
                portalNode
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                <div>
                    <h2 className="text-lg font-semibold">{getMonthName(month)} {year}</h2>
                    <p className="text-sm text-muted-foreground">
                        {workers.length} Trabalhadores ativos no período
                    </p>
                </div>
                <div className="flex gap-2">
                    {(role === 'super_admin' || role === 'admin_rh') && (
                        <Button variant="outline" className="gap-2" onClick={() => toast.info('Sincronização em massa não implementada ainda.')}>
                            <DownloadCloud className="h-4 w-4" />
                            Sincronizar com SharePoint
                        </Button>
                    )}
                </div>
            </div>

            <Card className="flex-1 overflow-hidden border">
                <div className="h-full relative overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 shadow-sm backdrop-blur-md z-10">
                            <TableRow>
                                <TableHead className="font-semibold text-foreground">Trabalhador</TableHead>
                                <TableHead className="font-semibold text-foreground">Passaporte</TableHead>
                                <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                                <TableHead className="font-semibold text-foreground">Arquivo</TableHead>
                                <TableHead className="w-[180px] text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && workers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        Nenhum trabalhador encontrado para este cliente.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && workers.map((worker) => (
                                <TableRow key={worker.worker_id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{worker.worker_name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(worker.worker_name);
                                                    toast.success('Nome copiado!');
                                                }}
                                                title="Copiar Nome"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span>{worker.pasaporte || '-'}</span>
                                            {worker.pasaporte && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(worker.pasaporte!);
                                                        toast.success('Passaporte copiado!');
                                                    }}
                                                    title="Copiar Passaporte"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span>{worker.movil || '-'}</span>
                                            {worker.movil && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const cleanPhone = worker.movil?.replace(/\D/g, '') || '';
                                                        const textToCopy = `Nome: ${worker.worker_name}\nPassaporte: ${worker.pasaporte || 'Não informado'}\nTelefone: ${worker.movil || 'Não informado'}`;
                                                        navigator.clipboard.writeText(textToCopy);
                                                        toast.success('Telefone copiado!', {
                                                            action: {
                                                                label: 'Abrir WhatsApp',
                                                                onClick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank')
                                                            }
                                                        });
                                                    }}
                                                    title="Copiar dados do trabalhador e abrir WhatsApp"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {worker.status === 'pendente' && (
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendente</Badge>
                                        )}
                                        {worker.status === 'enviado' && (
                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Enviado</Badge>
                                        )}
                                        {worker.status === 'validado' && (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Validado</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {worker.file_name && worker.file_url ? (
                                            <div
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer max-w-[200px]"
                                                onClick={() => handleViewFile(worker.file_url!)}
                                            >
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="truncate underline font-medium" title={worker.file_name}>{worker.file_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {worker.status === 'pendente' && worker.hour_record_id && (role === 'super_admin' || role === 'admin_rh') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    onClick={() => setUploadDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        hourRecordId: worker.hour_record_id
                                                    })}
                                                    title="Enviar folha pelo trabalhador"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {worker.status !== 'pendente' && worker.hour_record_id && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={actionLoading === worker.hour_record_id + '-dl' || actionLoading === worker.hour_record_id + '-ap' || actionLoading === worker.hour_record_id + '-rj'}
                                                        onClick={() => handleDownloadFile(worker.file_url, worker.file_name, worker.hour_record_id!)}
                                                    >
                                                        {actionLoading === worker.hour_record_id + '-dl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        title={
                                                            worker.sharepoint_sync_status === 'success' ? 'Já Sincronizado com SharePoint' :
                                                                worker.sharepoint_sync_status === 'syncing' ? 'Sincronizando...' :
                                                                    worker.sharepoint_sync_status === 'failed' ? `Erro na sincronização: ${worker.sharepoint_error}` :
                                                                        'Sincronizar com SharePoint'
                                                        }
                                                        disabled={actionLoading === worker.hour_record_id + '-sp' || worker.sharepoint_sync_status === 'syncing'}
                                                        onClick={() => handleSyncSharePoint(worker.hour_record_id!)}
                                                        className={worker.sharepoint_sync_status === 'success' ? 'text-green-600 border-green-200 bg-green-50' : worker.sharepoint_sync_status === 'failed' ? 'text-red-500 border-red-200 bg-red-50' : 'text-blue-500 hover:text-blue-700'}
                                                    >
                                                        {actionLoading === worker.hour_record_id + '-sp' || worker.sharepoint_sync_status === 'syncing' ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : worker.sharepoint_sync_status === 'success' ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            <Upload className="h-4 w-4" />
                                                        )}
                                                    </Button>

                                                    {worker.status === 'enviado' && (role === 'super_admin' || role === 'admin_rh' || role === 'operador') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                                                            onClick={() => handleValidateFile(worker.hour_record_id!)}
                                                            disabled={actionLoading === worker.hour_record_id + '-ap'}
                                                            title="Validar Arquivo"
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-ap' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                    {(role === 'super_admin' || role === 'admin_rh') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => handleRejectFile(worker.hour_record_id!, worker.file_url!)}
                                                            disabled={actionLoading === worker.hour_record_id + '-rj'}
                                                            title="Excluir Arquivo / Rejeitar"
                                                        >
                                                            {actionLoading === worker.hour_record_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <AdminUploadDialog
                open={uploadDialogState.open}
                onOpenChange={(open) => setUploadDialogState(prev => ({ ...prev, open }))}
                workerId={uploadDialogState.workerId}
                workerName={uploadDialogState.workerName}
                clientXName={clientName || ''}
                periodYear={year}
                periodMonth={month}
                hourRecordId={uploadDialogState.hourRecordId}
                onSuccess={() => {
                    fetchClientWorkers();
                }}
            />
        </div>
    );
}
