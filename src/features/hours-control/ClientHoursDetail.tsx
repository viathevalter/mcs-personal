import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../shared/supabase/client';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { getHoursControlWorkers } from '../workers/api/workersApi';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, ArrowLeft, DownloadCloud, FileText, Check, XCircle, Upload, Copy, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { AdminUploadDialog } from './components/AdminUploadDialog';
import { AdminNotesDialog } from './components/AdminNotesDialog';
import { useRole } from '../../app/providers/RoleProvider';
import { useTranslation } from 'react-i18next';

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
    observacoes?: string | null;
    contratante: string;
    worker_status?: string | null;
    data_baixa?: string | null;
}

export function ClientHoursDetail() {
    const { clientName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { selectedEmpresaId } = useEmpresa();
    const { role } = useRole();
    const { t, i18n } = useTranslation();

    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const contratante = searchParams.get('contratante');
    const searchQuery = searchParams.get('q');

    const [workers, setWorkers] = useState<WorkerDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [uploadDialogState, setUploadDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        contratante: string;
        hourRecordId?: string;
    }>({ open: false, workerId: '', workerName: '', contratante: '' });
    const [notesDialogState, setNotesDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        hourRecordId: string | null;
        existingNote: string | null;
    }>({ open: false, workerId: '', workerName: '', hourRecordId: null, existingNote: null });

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    useEffect(() => {
        if (selectedEmpresaId && clientName) {
            fetchClientWorkers();
        }
    }, [selectedEmpresaId, clientName, year, month, contratante, searchQuery]);

    const fetchClientWorkers = async () => {
        setLoading(true);
        try {
            // Fetch workers for this client
            let workersData = await getHoursControlWorkers({
                empresaId: selectedEmpresaId as string,
                periodYear: year,
                periodMonth: month,
                clienteNombre: clientName || null,
                contratante: contratante || null
            });

            if (searchQuery && searchQuery.trim().length > 0 && workersData) {
                const q = searchQuery.trim().toLowerCase();
                workersData = workersData.filter(w => {
                    const nameMatch = w.nome && w.nome.toLowerCase().includes(q);
                    const phoneMatch = w.movil && w.movil.toLowerCase().includes(q);
                    return nameMatch || phoneMatch;
                });
            }

            // Fetch hour records
            const workerIds = workersData?.map(w => w.id) || [];
            let hoursData: any[] = [];

            if (workerIds.length > 0) {
                const chunkSize = 200;
                for (let i = 0; i < workerIds.length; i += chunkSize) {
                    const chunk = workerIds.slice(i, i + chunkSize);
                    const { data: hours, error: hoursError } = await supabase
                        .schema('core_personal')
                        .from('worker_hours')
                        .select('*')
                        .in('worker_id', chunk)
                        .eq('period_year', year)
                        .eq('period_month', month);

                    if (hoursError) throw hoursError;
                    if (hours) hoursData = [...hoursData, ...hours];
                }
            }

            // Merge details
            const merged: WorkerDetail[] = workersData?.map((w: any) => {
                const hr = hoursData.find(h => h.worker_id === w.id && (!h.contratante || h.contratante === w.contratante));
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
                    sharepoint_error: hr?.sharepoint_error,
                    observacoes: hr?.observacoes,
                    contratante: w.contratante || '',
                    worker_status: w.status_trabajador,
                    data_baixa: w.data_baixa
                };
            }) || [];

            setWorkers(merged.sort((a, b) => a.worker_name.localeCompare(b.worker_name)));

        } catch (error) {
            console.error('Error fetching client details:', error);
            toast.error(t('clientHoursDetail.messages.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleViewFile = async (filePath: string) => {
        try {
            toast.loading(t('clientHoursDetail.messages.generatingLink'), { id: 'view_file' });
            const { data, error } = await supabase.storage
                .from('horas_trabalhadores')
                .createSignedUrl(filePath, 60); // 60 seconds validity

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
                toast.success(t('clientHoursDetail.messages.fileOpened'), { id: 'view_file' });
            }
        } catch (error) {
            console.error('Error opening file:', error);
            toast.error(t('clientHoursDetail.messages.openError'), { id: 'view_file' });
        }
    };

    const handleDownloadFile = async (filePath: string | undefined, fileName: string | undefined, recordId: string) => {
        if (!filePath || !fileName) {
            toast.error(t('clientHoursDetail.messages.notAvailable'));
            return;
        }
        try {
            setActionLoading(recordId + '-dl');
            toast.loading(t('clientHoursDetail.messages.generatingDl'), { id: 'download_file' });
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
                toast.success(t('clientHoursDetail.messages.dlStarted'), { id: 'download_file' });
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error(t('clientHoursDetail.messages.dlError'), { id: 'download_file' });
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
            toast.success(t('clientHoursDetail.messages.validated'));
            fetchClientWorkers(); // Refresh
        } catch (error) {
            console.error('Error validating:', error);
            toast.error(t('clientHoursDetail.messages.validateError'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectFile = async (recordId: string, filePath: string) => {
        if (!confirm(t('clientHoursDetail.messages.confirmReject'))) {
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
            toast.success(t('clientHoursDetail.messages.rejected'));
            fetchClientWorkers(); // Refresh
        } catch (error) {
            console.error('Error rejecting:', error);
            toast.error(t('clientHoursDetail.messages.rejectError'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleSyncSharePoint = async (recordId: string) => {
        try {
            setActionLoading(recordId + '-sp');
            toast.loading(t('clientHoursDetail.messages.syncStarted'), { id: 'sharepoint_sync' });

            const { data, error } = await supabase.functions.invoke('sync-to-sharepoint', {
                body: { hour_id: recordId },
            });

            if (error) throw error;

            if (data?.success) {
                toast.success(t('clientHoursDetail.messages.syncSuccess'), { id: 'sharepoint_sync' });
            } else {
                throw new Error(data?.error || t('clientHoursDetail.messages.syncUnknownError'));
            }
            fetchClientWorkers(); // Refresh status
        } catch (error: any) {
            console.error('Error syncing to SharePoint:', error);
            toast.error(t('clientHoursDetail.messages.syncError', { error: error.message || error.toString() }), { id: 'sharepoint_sync' });
            fetchClientWorkers(); // Refresh status to show error
        } finally {
            setActionLoading(null);
        }
    };

    const getMonthName = (m: number) => {
        const locale = i18n.language.startsWith('es') ? 'es-ES' : 'pt-BR';
        return new Date(2000, m - 1, 1).toLocaleString(locale, { month: 'long' }).toUpperCase();
    };

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-4 px-4 sm:px-6">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/hours-control?${searchParams.toString()}`)} className="h-8 w-8 -ml-2">
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
                        {workers.length} {t('clientHoursDetail.activeWorkers')}
                    </p>
                </div>
                <div className="flex gap-2">
                    {(role === 'super_admin' || role === 'admin_rh') && (
                        <Button variant="outline" className="gap-2" onClick={() => toast.info(t('clientHoursDetail.messages.massSyncNotImpl'))}>
                            <DownloadCloud className="h-4 w-4" />
                            {t('clientHoursDetail.btnSyncSharePoint')}
                        </Button>
                    )}
                </div>
            </div>

            <Card className="flex-1 overflow-hidden border">
                <div className="h-full relative overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 shadow-sm backdrop-blur-md z-10">
                            <TableRow>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.worker')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.passport')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.phone')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('clientHoursDetail.table.status')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.notesTitle', 'Anotações')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.file')}</TableHead>
                                <TableHead className="w-[180px] text-right">{t('clientHoursDetail.table.actions')}</TableHead>
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
                                        {t('clientHoursDetail.emptyWorkers')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && workers.map((worker) => {
                                const rawStatus = worker.worker_status?.toUpperCase() || '';
                                let displayStatus = rawStatus;
                                let isHistoricalActive = false;
                                
                                if ((rawStatus === 'INATIVO' || rawStatus === 'BAIXA') && worker.data_baixa) {
                                    const baixaDate = new Date(worker.data_baixa + 'T00:00:00');
                                    if (baixaDate.getFullYear() > year || (baixaDate.getFullYear() === year && baixaDate.getMonth() + 1 > month)) {
                                        displayStatus = 'ATIVO';
                                        isHistoricalActive = true;
                                    }
                                }

                                return (
                                <TableRow key={`${worker.worker_id}-${worker.contratante}`} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium align-top pt-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span>{worker.worker_name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(worker.worker_name);
                                                        toast.success(t('clientHoursDetail.copied.name'));
                                                    }}
                                                    title={t('clientHoursDetail.tooltips.copyName')}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            {displayStatus === 'INATIVO' || displayStatus === 'BAIXA' ? (
                                                <Badge variant="destructive" className="w-fit text-[10px] px-1.5 py-0 h-5">
                                                    {worker.worker_status} {worker.data_baixa ? `em ${new Date(worker.data_baixa + 'T00:00:00').toLocaleDateString('pt-PT')}` : ''}
                                                </Badge>
                                            ) : displayStatus === 'ATIVO' ? (
                                                <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 h-5 text-green-600 border-green-200 bg-green-50" title={isHistoricalActive ? "Trabalhador inativado posteriormente" : undefined}>
                                                    {isHistoricalActive ? 'Ativo' : worker.worker_status || 'Ativo'}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground align-top pt-4">
                                        <div className="flex items-center gap-2">
                                            <span>{worker.pasaporte || t('clientHoursDetail.notInformed')}</span>
                                            {worker.pasaporte && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(worker.pasaporte!);
                                                        toast.success(t('clientHoursDetail.copied.passport'));
                                                    }}
                                                    title={t('clientHoursDetail.tooltips.copyPassport')}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground align-top pt-4">
                                        <div className="flex items-center gap-2">
                                            <span>{worker.movil || t('clientHoursDetail.notInformed')}</span>
                                            {worker.movil && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const cleanPhone = worker.movil?.replace(/\D/g, '') || '';
                                                        const textToCopy = t('clientHoursDetail.copyData', {
                                                            name: worker.worker_name,
                                                            passport: worker.pasaporte || t('clientHoursDetail.notInformed'),
                                                            phone: worker.movil || t('clientHoursDetail.notInformed')
                                                        });
                                                        navigator.clipboard.writeText(textToCopy);
                                                        toast.success(t('clientHoursDetail.copied.phone'), {
                                                            action: {
                                                                label: t('clientHoursDetail.copied.openWhatsApp'),
                                                                onClick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank')
                                                            }
                                                        });
                                                    }}
                                                    title={t('clientHoursDetail.tooltips.copyPhoneWhatsApp')}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center align-top pt-4">
                                        {worker.status === 'pendente' && <Badge variant="outline" className="bg-yellow-100/50 text-yellow-700 border-yellow-200">{t('clientHoursDetail.badges.pending')}</Badge>}
                                        {worker.status === 'enviado' && <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">{t('clientHoursDetail.badges.submitted')}</Badge>}
                                        {worker.status === 'validado' && <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">{t('clientHoursDetail.badges.validated')}</Badge>}
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        {worker.observacoes ? (
                                            <div className="flex items-start gap-2">
                                                <div 
                                                    className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded max-w-[200px] whitespace-pre-wrap break-words cursor-pointer hover:bg-amber-100 transition-colors"
                                                    title="Clique para editar"
                                                    onClick={() => setNotesDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        hourRecordId: worker.hour_record_id || null,
                                                        existingNote: worker.observacoes || null
                                                    })}
                                                >
                                                    {worker.observacoes}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setNotesDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        hourRecordId: worker.hour_record_id || null,
                                                        existingNote: worker.observacoes || null
                                                    })}
                                                    title={t('clientHoursDetail.notesTitle', 'Adicionar anotação')}
                                                >
                                                    <StickyNote className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
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
                                    <TableCell className="text-right align-top pt-4">
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
                                                        contratante: worker.contratante,
                                                        hourRecordId: worker.hour_record_id
                                                    })}
                                                    title={t('clientHoursDetail.tooltips.sendSheet')}
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
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                                            onClick={() => handleValidateFile(worker.hour_record_id!)}
                                                            disabled={actionLoading === worker.hour_record_id + '-ap'}
                                                            title={t('clientHoursDetail.tooltips.validate')}
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
                                                            title={t('clientHoursDetail.tooltips.reject')}
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-rj' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
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
                contratante={uploadDialogState.contratante}
                hourRecordId={uploadDialogState.hourRecordId}
                onSuccess={() => {
                    setUploadDialogState(prev => ({ ...prev, open: false }));
                    fetchClientWorkers();
                }}
            />

            <AdminNotesDialog
                open={notesDialogState.open}
                onOpenChange={(open) => setNotesDialogState(prev => ({ ...prev, open }))}
                workerId={notesDialogState.workerId}
                workerName={notesDialogState.workerName}
                periodYear={year}
                periodMonth={month}
                existingNote={notesDialogState.existingNote}
                hourRecordId={notesDialogState.hourRecordId}
                onSuccess={fetchClientWorkers}
            />
        </div>
    );
}
