import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../shared/supabase/client';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { getHoursControlWorkers } from '../workers/api/workersApi';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, ArrowLeft, DownloadCloud, FileText, Check, XCircle, Upload, Copy, StickyNote, Search, X, Clock, Smartphone, Users, Bell, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import { AdminUploadDialog } from './components/AdminUploadDialog';
import { AdminNotesDialog } from './components/AdminNotesDialog';
import { BroadcastReminderDialog } from './components/BroadcastReminderDialog';
import { WorkerNotificationDialog } from './components/WorkerNotificationDialog';
import { BatchWorkerNotificationDialog } from './components/BatchWorkerNotificationDialog';
import { ValidationScreen } from './ValidationScreen';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { useRole } from '../../app/providers/RoleProvider';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { getBatchWorkersMessageCounts } from '../worker-portal/services/workerCommunicationService';

interface WorkerDetail {
    worker_id: string;
    worker_name: string;
    cod_colab?: string;
    funcion?: string;
    pasaporte: string | null;
    movil: string | null;
    status: 'pendente' | 'enviado' | 'processado' | 'validado' | 'em_andamento' | 'aguardando_assinatura' | 'assinado_encarregado' | string;
    file_url?: string;
    file_name?: string;
    hour_record_id?: string;
    observacoes?: string | null;
    contratante: string;
    worker_status?: string | null;
    data_baixa?: string | null;
    horas_totais?: number;
    has_portal_hours?: boolean;
}

const getBucketName = (filePath?: string): string => {
    if (filePath && filePath.includes('/')) {
        return 'horas_trabalhadores';
    }
    return 'extracao-horas';
};

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
    const [localSearch, setLocalSearch] = useState(searchQuery || '');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [uploadDialogState, setUploadDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        contratante: string;
        hourRecordId?: string;
        workerFunction?: string;
    }>({ open: false, workerId: '', workerName: '', contratante: '' });
    const [notesDialogState, setNotesDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        hourRecordId: string | null;
        existingNote: string | null;
    }>({ open: false, workerId: '', workerName: '', hourRecordId: null, existingNote: null });
    const [validationDialogState, setValidationDialogState] = useState<{
        open: boolean;
        workerId: string;
        workerName: string;
        workerCode?: string;
        workerFunction?: string;
        fileUrl?: string;
        fileName?: string;
        filePath?: string;
        recordId: string;
        contratante: string;
    }>({ open: false, workerId: '', workerName: '', recordId: '', contratante: '' });
    const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [workerMessageCounts, setWorkerMessageCounts] = useState<Record<string, { total: number; unreadByGestor: number; periodTotal?: number }>>({});
    const [workerNotificationDialogState, setWorkerNotificationDialogState] = useState<{
        open: boolean;
        worker: WorkerDetail | null;
    }>({ open: false, worker: null });
    const [batchNotificationOpen, setBatchNotificationOpen] = useState(false);

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    useEffect(() => {
        if (selectedEmpresaId && clientName) {
            fetchClientWorkers();
        }
    }, [selectedEmpresaId, clientName, year, month, contratante, searchQuery]);

    // Polling effect when there are processing files
    useEffect(() => {
        const hasProcessing = workers.some(w => w.status === 'enviado');
        if (!hasProcessing) return;

        const timer = setInterval(() => {
            fetchClientWorkers(true);
        }, 4000); // Poll every 4 seconds without global spinner

        return () => clearInterval(timer);
    }, [workers]);

    const fetchClientWorkers = async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            // Fetch workers for this client
            let workersData = await getHoursControlWorkers({
                empresaId: selectedEmpresaId as string,
                periodYear: year,
                periodMonth: month,
                clienteNombre: clientName || null,
                contratante: contratante || null
            });

            // Filter applied dynamically in render body via localSearch

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

            // Helper to check if a worker_hours row has portal entries
            const hasFilledPortalHours = (h: any): boolean => {
                if (!h) return false;
                const raw = h.apontamentos_diarios;
                let arr: any[] = [];
                if (Array.isArray(raw)) arr = raw;
                else if (typeof raw === 'string') {
                    try { arr = JSON.parse(raw); } catch { arr = []; }
                }
                return arr.some((d: any) => Number(d?.totalHoras ?? d?.total_horas ?? d?.horasNormais ?? d?.horas_normais ?? 0) > 0);
            };

            const scoreHourRecord = (h: any, w: any): number => {
                let score = 0;
                const hClient = (h.cliente_nombre || '').trim().toLowerCase();
                const wClient = (w.cliente_nombre || '').trim().toLowerCase();
                if (hClient && wClient && hClient === wClient) score += 100;
                if (hasFilledPortalHours(h)) score += 500;
                if (h.file_url) score += 400;
                if (h.status === 'validado') score += 60;
                else if (h.status === 'assinado_encarregado') score += 50;
                else if (h.status === 'aguardando_assinatura') score += 40;
                else if (h.status === 'em_andamento') score += 30;
                else if (h.status === 'enviado' || h.status === 'processado') score += 20;
                if (h.contratante && w.contratante && h.contratante.trim().toLowerCase() === w.contratante.trim().toLowerCase()) {
                    score += 10;
                }
                return score;
            };

            // Merge details
            const merged: WorkerDetail[] = workersData?.map((w: any) => {
                const wClient = (w.cliente_nombre || '').trim().toLowerCase();
                const candidates = hoursData.filter(h => {
                    if (h.worker_id !== w.id) return false;
                    const hClient = (h.cliente_nombre || '').trim().toLowerCase();
                    return hClient === wClient || !hClient || hClient === 'não definido' || hClient === 'cliente geral';
                });

                candidates.sort((a, b) => scoreHourRecord(b, w) - scoreHourRecord(a, w));
                const hr = candidates[0];
                const portalFilled = hasFilledPortalHours(hr);
                const totalHrs = Number(hr?.horas_totais || 0);

                let resolvedStatus = hr?.status || 'pendente';
                if (resolvedStatus === 'processado' && !hr?.file_url) {
                    resolvedStatus = portalFilled ? 'em_andamento' : 'pendente';
                }

                return {
                    worker_id: w.id,
                    worker_name: w.nome,
                    cod_colab: w.cod_colab,
                    funcion: w.funcion,
                    pasaporte: w.pasaporte,
                    movil: w.movil,
                    status: resolvedStatus,
                    file_url: hr?.file_url,
                    file_name: hr?.file_name,
                    hour_record_id: hr?.id,
                    observacoes: hr?.observacoes,
                    contratante: w.contratante || '',
                    worker_status: w.status_trabajador,
                    data_baixa: w.data_baixa,
                    horas_totais: totalHrs,
                    has_portal_hours: portalFilled
                };
            }) || [];

            const sorted = merged.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
            setWorkers(sorted);

            // Fetch message counts for all workers in this client & period
            const workerIdsForCounts = sorted.map(w => w.worker_id);
            if (workerIdsForCounts.length > 0) {
                getBatchWorkersMessageCounts(workerIdsForCounts, year, month)
                    .then(counts => setWorkerMessageCounts(counts))
                    .catch(err => console.error('Error fetching message counts:', err));
            }

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
            const bucketName = getBucketName(filePath);
            const { data, error } = await supabase.storage
                .from(bucketName)
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
            const bucketName = getBucketName(filePath);
            const { data, error } = await supabase.storage
                .from(bucketName)
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

    const handleReprocessOcr = async (worker: WorkerDetail) => {
        if (!worker.file_url || !worker.hour_record_id) return;
        try {
            setActionLoading(worker.hour_record_id + '-ocr');
            toast.info(`Iniciando leitura por IA para ${worker.worker_name}...`);
            const extension = worker.file_name?.split('.').pop() || 'pdf';
            const mimeType = extension === 'pdf' ? 'application/pdf' : 'image/jpeg';
            const bucketName = getBucketName(worker.file_url);

            const { data, error } = await supabase.functions.invoke('process-document-ocr', {
                body: {
                    file_path: worker.file_url,
                    document_type: "timesheet",
                    bucket_id: bucketName,
                    mime_type: mimeType,
                    worker_id: worker.worker_id,
                    year: year,
                    month: month
                }
            });

            if (error) throw error;
            toast.success(`Leitura por IA concluída com sucesso para ${worker.worker_name}!`);
            await fetchClientWorkers(true);
        } catch (e: any) {
            console.error('Erro ao reprocessar OCR:', e);
            toast.error(`Falha no processamento: ${e.message || String(e)}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenValidation = async (worker: WorkerDetail) => {
        if (!worker.hour_record_id) return;
        try {
            setActionLoading(worker.hour_record_id + '-ap');
            let signedUrl = undefined;
            if (worker.file_url) {
                const bucketName = getBucketName(worker.file_url);
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .createSignedUrl(worker.file_url, 3600); // 1 hour validity

                if (error) throw error;
                signedUrl = data?.signedUrl;
            }
            
            setValidationDialogState({
                open: true,
                workerId: worker.worker_id,
                workerName: worker.worker_name,
                workerCode: worker.cod_colab,
                workerFunction: worker.funcion,
                fileUrl: signedUrl,
                fileName: worker.file_name,
                filePath: worker.file_url || undefined,
                recordId: worker.hour_record_id,
                contratante: worker.contratante
            });
        } catch (error) {
            console.error('Error opening validation:', error);
            toast.error('Erro ao preparar validação');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectFile = async (recordId: string, filePath: string | undefined, workerId: string) => {
        if (!confirm(t('clientHoursDetail.messages.confirmReject'))) {
            return;
        }

        try {
            setActionLoading(recordId + '-rj');

            // Delete file from storage first if there is one
            if (filePath) {
                const bucketName = getBucketName(filePath);
                const { error: storageError } = await supabase.storage
                    .from(bucketName)
                    .remove([filePath]);

                if (storageError) {
                    console.error('Error deleting file:', storageError);
                }
            }

            // Get client ID from database using clientName
            let targetClientId: string | null = null;
            if (clientName) {
                const { data: clientData } = await supabase
                    .schema('core_common')
                    .from('clients')
                    .select('id')
                    .ilike('trade_name', clientName.trim())
                    .limit(1)
                    .maybeSingle();
                if (clientData) {
                    targetClientId = clientData.id;
                }
            }

            // Delete daily hours from core_finance.horas_trabalhadas (specifically for this client)
            const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
            
            let deleteQuery = supabase
                .schema('core_finance')
                .from('horas_trabalhadas')
                .delete()
                .eq('worker_id', workerId)
                .gte('data_trabalho', startDateStr)
                .lte('data_trabalho', endDateStr);
                
            if (targetClientId) {
                deleteQuery = deleteQuery.eq('client_id', targetClientId);
            }
            
            const { error: deleteHoursError } = await deleteQuery;

            if (deleteHoursError) {
                console.error('Error deleting daily hours on reject:', deleteHoursError);
            }

            // Update DB Status
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({
                    status: 'pendente',
                    file_url: null,
                    file_name: null,
                    apontamentos_diarios: [],
                    total_horas_normais: 0,
                    total_horas_noturnas: 0,
                    horas_totais: 0,
                    signed_at: null,
                    signed_ip: null,
                    encarregado_nome: null,
                    signature_image_url: null
                })
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



    const kpis = useMemo(() => {
        const total = workers.length;
        const pendentes = workers.filter(w => w.status === 'pendente').length;
        const emAndamento = workers.filter(w => w.status === 'em_andamento').length;
        const assinaturas = workers.filter(w => w.status === 'aguardando_assinatura').length;
        const validados = workers.filter(w => w.status === 'validado' || w.status === 'assinado_encarregado').length;
        const paraValidar = workers.filter(w => w.status === 'enviado' || w.status === 'processado').length;
        return { total, pendentes, emAndamento, assinaturas, validados, paraValidar };
    }, [workers]);

    const pendingWorkersList = useMemo(() => {
        return workers.filter(w => w.status === 'pendente').map(w => ({
            worker_id: w.worker_id,
            worker_name: w.worker_name,
            movil: w.movil,
            status: w.status
        }));
    }, [workers]);

    const filteredWorkers = workers.filter(w => {
        // 1. Local Search Filter
        if (localSearch.trim()) {
            const q = localSearch.toLowerCase();
            const nameMatch = w.worker_name?.toLowerCase().includes(q);
            const passportMatch = w.pasaporte?.toLowerCase().includes(q);
            const phoneMatch = w.movil?.toLowerCase().includes(q);
            const codeMatch = w.cod_colab?.toLowerCase().includes(q);
            if (!nameMatch && !passportMatch && !phoneMatch && !codeMatch) return false;
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pendente') {
                return w.status === 'pendente';
            }
            if (statusFilter === 'em_andamento') {
                return w.status === 'em_andamento';
            }
            if (statusFilter === 'aguardando_assinatura') {
                return w.status === 'aguardando_assinatura';
            }
            if (statusFilter === 'enviado') {
                return w.status === 'enviado' || w.status === 'processado';
            }
            if (statusFilter === 'validado') {
                return w.status === 'validado' || w.status === 'assinado_encarregado';
            }
        }
        return true;
    });

    const selectedWorkersForBatch = useMemo(() => {
        return workers
            .filter(w => selectedWorkerIds.includes(w.worker_id))
            .map(w => ({
                worker_id: w.worker_id,
                worker_name: w.worker_name,
                movil: w.movil
            }));
    }, [workers, selectedWorkerIds]);

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredWorkers.map(w => w.worker_id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedWorkerIds.includes(id));
        if (allSelected) {
            setSelectedWorkerIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedWorkerIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const calcPct = (val: number, tot: number) => (tot > 0 ? Math.round((val / tot) * 100) : 0);

    const handleKpiToggle = (filter: string) => {
        setStatusFilter(prev => (prev === filter ? 'all' : filter));
    };

    const handleSelectPendingOnly = () => {
        const pendingIds = workers
            .filter(w => w.status === 'pendente' || w.status === 'em_andamento')
            .map(w => w.worker_id);
        setSelectedWorkerIds(pendingIds);
        if (pendingIds.length > 0) {
            toast.info(`${pendingIds.length} ${t('clientHoursDetail.kpis.workers')}`);
        } else {
            toast.info(t('clientHoursDetail.emptyFilteredWorkers'));
        }
    };

    const toggleWorkerSelection = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
        );
    };

    const getMonthName = (m: number) => {
        const locale = i18n.language.startsWith('es') ? 'es-ES' : i18n.language.startsWith('fr') ? 'fr-FR' : 'pt-BR';
        return new Date(2000, m - 1, 1).toLocaleString(locale, { month: 'long' }).toUpperCase();
    };

    const pctPendentes = calcPct(kpis.pendentes, kpis.total);
    const pctEmAndamento = calcPct(kpis.emAndamento, kpis.total);
    const pctAssinaturas = calcPct(kpis.assinaturas, kpis.total);
    const pctValidados = calcPct(kpis.validados, kpis.total);

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-3.5 px-4 sm:px-6">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/hours-control?${searchParams.toString()}`)} className="h-8 w-8 -ml-2 rounded-xl">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight">{clientName}</h1>
                    </div>
                </div>,
                portalNode
            )}

            {/* GALERIA DE KPIS EXECUTIVOS INTERATIVOS COM FILTRO DIRETO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                {/* 1. Total Alocados */}
                <button
                    type="button"
                    onClick={() => handleKpiToggle('all')}
                    className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        statusFilter === 'all'
                            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-800 shadow-lg shadow-slate-900/15 ring-2 ring-slate-900/20 dark:from-slate-100 dark:to-slate-200 dark:text-slate-900'
                            : 'bg-card text-card-foreground border-border/80 hover:border-slate-300 shadow-xs hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                            statusFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.totalAllocated')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                statusFilter === 'all'
                                    ? 'bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                                100%
                            </span>
                            <div className={`p-1.5 rounded-xl ${
                                statusFilter === 'all' ? 'bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight leading-none">{kpis.total}</span>
                        <span className={`text-xs font-semibold truncate ${
                            statusFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.workers')}
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-current/10">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={statusFilter === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-600 dark:text-slate-400'}>
                                {t('clientHoursDetail.kpis.teamComplete')}
                            </span>
                            <span className={`text-[10px] ${statusFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'}`}>
                                100%
                            </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                            statusFilter === 'all' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                statusFilter === 'all' ? 'bg-emerald-400 dark:bg-slate-900' : 'bg-slate-600'
                            }`} style={{ width: '100%' }} />
                        </div>
                    </div>
                </button>

                {/* 2. Pendentes / Falta Enviar */}
                <button
                    type="button"
                    onClick={() => handleKpiToggle('pendente')}
                    className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        statusFilter === 'pendente'
                            ? 'bg-gradient-to-br from-rose-600 via-rose-600 to-red-700 text-white border-rose-600 shadow-lg shadow-rose-600/25 ring-2 ring-rose-500/30'
                            : 'bg-gradient-to-br from-rose-50/60 via-card to-card dark:from-rose-950/20 dark:to-card text-rose-950 dark:text-rose-200 border-rose-200/80 dark:border-rose-800/50 hover:border-rose-400 shadow-xs hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                            statusFilter === 'pendente' ? 'text-rose-100' : 'text-rose-800 dark:text-rose-300'
                        }`}>
                            {t('clientHoursDetail.kpis.missingSend')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                statusFilter === 'pendente'
                                    ? 'bg-white/25 text-white'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                            }`}>
                                {pctPendentes}%
                            </span>
                            <div className={`p-1.5 rounded-xl ${
                                statusFilter === 'pendente' ? 'bg-white/20 text-white' : 'bg-rose-100/80 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                            }`}>
                                <AlertCircle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black tracking-tight leading-none ${
                            statusFilter === 'pendente' ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                            {kpis.pendentes}
                        </span>
                        <span className={`text-xs font-semibold truncate ${
                            statusFilter === 'pendente' ? 'text-rose-100' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.ofTotal', { total: kpis.total })}
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-current/10">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={statusFilter === 'pendente' ? 'text-white' : 'text-rose-900/80 dark:text-rose-200'}>
                                {kpis.pendentes} / {kpis.total} {t('clientHoursDetail.kpis.workersShort')}
                            </span>
                            {kpis.pendentes > 0 ? (
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                    statusFilter === 'pendente' ? 'bg-white/25 text-white' : 'bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                }`}>
                                    {t('clientHoursDetail.kpis.remindBadge')}
                                </span>
                            ) : (
                                <span className={`text-[10px] font-bold ${statusFilter === 'pendente' ? 'text-rose-100' : 'text-rose-700'}`}>0%</span>
                            )}
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                            statusFilter === 'pendente' ? 'bg-black/20' : 'bg-rose-100 dark:bg-rose-950'
                        }`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                statusFilter === 'pendente' ? 'bg-white' : 'bg-rose-500'
                            }`} style={{ width: `${Math.max(pctPendentes, kpis.pendentes > 0 ? 4 : 0)}%` }} />
                        </div>
                    </div>
                </button>

                {/* 3. Em Andamento */}
                <button
                    type="button"
                    onClick={() => handleKpiToggle('em_andamento')}
                    className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        statusFilter === 'em_andamento'
                            ? 'bg-gradient-to-br from-sky-600 via-sky-600 to-blue-700 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-500/30'
                            : 'bg-gradient-to-br from-sky-50/60 via-card to-card dark:from-sky-950/20 dark:to-card text-sky-950 dark:text-sky-200 border-sky-200/80 dark:border-sky-800/50 hover:border-sky-400 shadow-xs hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                            statusFilter === 'em_andamento' ? 'text-sky-100' : 'text-sky-800 dark:text-sky-300'
                        }`}>
                            {t('clientHoursDetail.kpis.inProgress')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                statusFilter === 'em_andamento'
                                    ? 'bg-white/25 text-white'
                                    : 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                            }`}>
                                {pctEmAndamento}%
                            </span>
                            <div className={`p-1.5 rounded-xl ${
                                statusFilter === 'em_andamento' ? 'bg-white/20 text-white' : 'bg-sky-100/80 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400'
                            }`}>
                                <Clock className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black tracking-tight leading-none ${
                            statusFilter === 'em_andamento' ? 'text-white' : 'text-sky-600 dark:text-sky-400'
                        }`}>
                            {kpis.emAndamento}
                        </span>
                        <span className={`text-xs font-semibold truncate ${
                            statusFilter === 'em_andamento' ? 'text-sky-100' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.ofTotal', { total: kpis.total })}
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-current/10">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={statusFilter === 'em_andamento' ? 'text-white' : 'text-sky-900/80 dark:text-sky-200'}>
                                {t('clientHoursDetail.kpis.filling')}
                            </span>
                            <span className={`text-[10px] font-bold ${statusFilter === 'em_andamento' ? 'text-sky-100' : 'text-sky-700 dark:text-sky-400'}`}>
                                {pctEmAndamento}%
                            </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                            statusFilter === 'em_andamento' ? 'bg-black/20' : 'bg-sky-100 dark:bg-sky-950'
                        }`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                statusFilter === 'em_andamento' ? 'bg-white' : 'bg-sky-500'
                            }`} style={{ width: `${Math.max(pctEmAndamento, kpis.emAndamento > 0 ? 4 : 0)}%` }} />
                        </div>
                    </div>
                </button>

                {/* 4. Por Assinar */}
                <button
                    type="button"
                    onClick={() => handleKpiToggle('aguardando_assinatura')}
                    className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        statusFilter === 'aguardando_assinatura'
                            ? 'bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 text-white border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30'
                            : 'bg-gradient-to-br from-amber-50/60 via-card to-card dark:from-amber-950/20 dark:to-card text-amber-950 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400 shadow-xs hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                            statusFilter === 'aguardando_assinatura' ? 'text-amber-50' : 'text-amber-800 dark:text-amber-300'
                        }`}>
                            {t('clientHoursDetail.kpis.toSign')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                statusFilter === 'aguardando_assinatura'
                                    ? 'bg-white/25 text-white'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}>
                                {pctAssinaturas}%
                            </span>
                            <div className={`p-1.5 rounded-xl ${
                                statusFilter === 'aguardando_assinatura' ? 'bg-white/20 text-white' : 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                            }`}>
                                <FileText className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black tracking-tight leading-none ${
                            statusFilter === 'aguardando_assinatura' ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                            {kpis.assinaturas}
                        </span>
                        <span className={`text-xs font-semibold truncate ${
                            statusFilter === 'aguardando_assinatura' ? 'text-amber-100' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.ofTotal', { total: kpis.total })}
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-current/10">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={statusFilter === 'aguardando_assinatura' ? 'text-white' : 'text-amber-900/80 dark:text-amber-200'}>
                                {t('clientHoursDetail.kpis.waiting')}
                            </span>
                            <span className={`text-[10px] font-bold ${statusFilter === 'aguardando_assinatura' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
                                {pctAssinaturas}%
                            </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                            statusFilter === 'aguardando_assinatura' ? 'bg-black/20' : 'bg-amber-100 dark:bg-amber-950'
                        }`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                statusFilter === 'aguardando_assinatura' ? 'bg-white' : 'bg-amber-500'
                            }`} style={{ width: `${Math.max(pctAssinaturas, kpis.assinaturas > 0 ? 4 : 0)}%` }} />
                        </div>
                    </div>
                </button>

                {/* 5. Validados / Concluídos */}
                <button
                    type="button"
                    onClick={() => handleKpiToggle('validado')}
                    className={`group relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        statusFilter === 'validado'
                            ? 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                            : 'bg-gradient-to-br from-emerald-50/60 via-card to-card dark:from-emerald-950/20 dark:to-card text-emerald-950 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400 shadow-xs hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider truncate ${
                            statusFilter === 'validado' ? 'text-emerald-100' : 'text-emerald-800 dark:text-emerald-300'
                        }`}>
                            {t('clientHoursDetail.kpis.validated')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                statusFilter === 'validado'
                                    ? 'bg-white/25 text-white'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            }`}>
                                {pctValidados}%
                            </span>
                            <div className={`p-1.5 rounded-xl ${
                                statusFilter === 'validado' ? 'bg-white/20 text-white' : 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                            }`}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black tracking-tight leading-none ${
                            statusFilter === 'validado' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {kpis.validados}
                        </span>
                        <span className={`text-xs font-semibold truncate ${
                            statusFilter === 'validado' ? 'text-emerald-100' : 'text-muted-foreground'
                        }`}>
                            {t('clientHoursDetail.kpis.ofTotal', { total: kpis.total })}
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-current/10">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={statusFilter === 'validado' ? 'text-white' : 'text-emerald-900/80 dark:text-emerald-200'}>
                                {t('clientHoursDetail.kpis.completed')}
                            </span>
                            <span className={`text-[10px] font-bold ${statusFilter === 'validado' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {pctValidados}%
                            </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                            statusFilter === 'validado' ? 'bg-black/20' : 'bg-emerald-100 dark:bg-emerald-950'
                        }`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                statusFilter === 'validado' ? 'bg-white' : 'bg-emerald-500'
                            }`} style={{ width: `${Math.max(pctValidados, kpis.validados > 0 ? 4 : 0)}%` }} />
                        </div>
                    </div>
                </button>
            </div>

            {/* BARRA DE FERRAMENTAS E FILTROS */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/95 backdrop-blur-sm p-3.5 px-4 rounded-2xl border border-border/80 shadow-xs shrink-0">
                <div>
                    <h2 className="text-base font-extrabold tracking-tight">{getMonthName(month)} {year}</h2>
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('clientHoursDetail.toolbar.showingWorkers', {
                            shown: filteredWorkers.length,
                            total: workers.length,
                            label: t('clientHoursDetail.activeWorkers')
                        })}
                    </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                    {/* Botão de Selecionar Pendentes */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSelectPendingOnly}
                        disabled={kpis.pendentes === 0 && kpis.emAndamento === 0}
                        className="h-9 px-3 rounded-xl text-xs font-semibold border-dashed border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title={t('clientHoursDetail.toolbar.selectPendingTooltip')}
                    >
                        {t('clientHoursDetail.toolbar.selectPending')}
                    </Button>

                    {/* Botão de Cobrança / Notificação para Pendentes */}
                    <Button
                        type="button"
                        onClick={() => setBroadcastDialogOpen(true)}
                        disabled={kpis.pendentes === 0}
                        className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                            kpis.pendentes > 0 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95' 
                                : 'bg-muted text-muted-foreground'
                        }`}
                        title={t('clientHoursDetail.toolbar.notifyPendingTooltip')}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        <span>{t('clientHoursDetail.toolbar.notifyPending', { count: kpis.pendentes })}</span>
                    </Button>

                    {/* Filtro de Busca */}
                    <div className="relative w-full sm:w-[210px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={t('clientHoursDetail.toolbar.searchPlaceholder')}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-9 pr-8 h-9 text-xs rounded-xl dark:bg-slate-950 dark:border-slate-800"
                        />
                        {localSearch && (
                            <button
                                onClick={() => setLocalSearch('')}
                                className="absolute right-2.5 top-2 h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Filtro de Status */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[175px] h-9 text-xs rounded-xl bg-background dark:bg-slate-950 dark:border-slate-800 font-semibold">
                            <SelectValue placeholder={t('clientHoursDetail.toolbar.filterByStatus')} />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                            <SelectItem value="all">{t('clientHoursDetail.toolbar.filterAll', { count: workers.length })}</SelectItem>
                            <SelectItem value="pendente">{t('clientHoursDetail.toolbar.filterPending', { count: kpis.pendentes })}</SelectItem>
                            <SelectItem value="em_andamento">{t('clientHoursDetail.toolbar.filterInProgress', { count: kpis.emAndamento })}</SelectItem>
                            <SelectItem value="aguardando_assinatura">{t('clientHoursDetail.toolbar.filterToSign', { count: kpis.assinaturas })}</SelectItem>
                            <SelectItem value="enviado">{t('clientHoursDetail.toolbar.filterToValidate', { count: kpis.paraValidar })}</SelectItem>
                            <SelectItem value="validado">{t('clientHoursDetail.toolbar.filterValidated', { count: kpis.validados })}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Barra de Ação em Lote quando há Trabalhadores Selecionados */}
            {selectedWorkerIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 p-3 px-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-black shadow-xs">
                            {selectedWorkerIds.length}
                        </span>
                        <div className="text-xs">
                            <span className="font-bold text-indigo-950 dark:text-indigo-200">
                                {selectedWorkerIds.length} {selectedWorkerIds.length === 1 ? t('clientHoursDetail.batch.selectedOne') : t('clientHoursDetail.batch.selectedMany')}
                            </span>
                            <span className="text-muted-foreground ml-1 hidden sm:inline">
                                {t('clientHoursDetail.batch.totalInClient', { total: workers.length })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setBatchNotificationOpen(true)}
                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs active:scale-95"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{t('clientHoursDetail.batch.notifySelected', { count: selectedWorkerIds.length })}</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedWorkerIds([])}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                        >
                            {t('clientHoursDetail.batch.clearSelection')}
                        </Button>
                    </div>
                </div>
            )}

            <Card className="flex-1 overflow-hidden border border-border/80 rounded-2xl shadow-xs">
                <div className="h-full relative overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 shadow-2xs backdrop-blur-md z-10">
                            <TableRow className="border-b border-border/60">
                                <TableHead className="w-12 text-center px-3">
                                    <Checkbox
                                        checked={filteredWorkers.length > 0 && filteredWorkers.every(w => selectedWorkerIds.includes(w.worker_id))}
                                        onCheckedChange={handleSelectAllFiltered}
                                        title={t('clientHoursDetail.table.selectAllTooltip')}
                                        aria-label={t('clientHoursDetail.table.selectAllTooltip')}
                                    />
                                </TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{t('clientHoursDetail.table.worker')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{t('clientHoursDetail.table.passport')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{t('clientHoursDetail.table.phone')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('clientHoursDetail.table.status')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">{t('clientHoursDetail.table.chatNotifications')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{t('clientHoursDetail.table.internalNotes')}</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{t('clientHoursDetail.table.file')}</TableHead>
                                <TableHead className="w-[180px] text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground pr-4">{t('clientHoursDetail.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && workers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                        {t('clientHoursDetail.emptyWorkers')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && workers.length > 0 && filteredWorkers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                        {t('clientHoursDetail.emptyFilteredWorkers')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && filteredWorkers.map((worker) => {
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

                                const msgCount = workerMessageCounts[worker.worker_id] || { total: 0, unreadByGestor: 0 };
                                const isSelected = selectedWorkerIds.includes(worker.worker_id);
                                const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'pt-PT';

                                return (
                                <TableRow 
                                    key={`${worker.worker_id}-${worker.contratante}`} 
                                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/25' : ''}`}
                                >
                                    <TableCell className="w-12 text-center align-top pt-4 px-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleWorkerSelection(worker.worker_id)}
                                            aria-label={worker.worker_name}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium align-top pt-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground">{worker.worker_name}</span>
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
                                                <Badge variant="destructive" className="w-fit text-[10px] px-2 py-0 h-5 rounded-md font-semibold">
                                                    {worker.worker_status} {worker.data_baixa ? t('clientHoursDetail.badges.inactiveOn', { date: new Date(worker.data_baixa + 'T00:00:00').toLocaleDateString(dateLocale) }) : ''}
                                                </Badge>
                                            ) : displayStatus === 'ATIVO' ? (
                                                <Badge variant="outline" className="w-fit text-[10px] px-2 py-0 h-5 rounded-md font-semibold text-emerald-700 border-emerald-200 bg-emerald-50" title={isHistoricalActive ? t('clientHoursDetail.badges.active') : undefined}>
                                                    {t('clientHoursDetail.badges.active')}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground align-top pt-4 font-mono text-xs">
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
                                    <TableCell className="text-muted-foreground align-top pt-4 font-mono text-xs">
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
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center align-top pt-4">
                                        {worker.status === 'pendente' && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold rounded-lg">
                                                {t('clientHoursDetail.badges.pending')}
                                            </Badge>
                                        )}
                                        {worker.status === 'em_andamento' && (
                                            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 font-semibold flex items-center justify-center gap-1 shadow-2xs rounded-lg">
                                                <Clock className="h-3 w-3 text-sky-500" />
                                                <span>{t('clientHoursDetail.badges.portalDraft')}</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'aguardando_assinatura' && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold flex items-center justify-center gap-1 shadow-2xs rounded-lg">
                                                <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
                                                <span>{t('clientHoursDetail.badges.portalSign')}</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'assinado_encarregado' && (
                                            <Badge variant="default" className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold flex items-center justify-center gap-1 shadow-2xs rounded-lg">
                                                <Check className="h-3 w-3 text-emerald-600" />
                                                <span>{t('clientHoursDetail.badges.portalSigned')}</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'enviado' && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 animate-pulse flex items-center justify-center gap-1 rounded-lg">
                                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                                <span>{t('clientHoursDetail.badges.processing')}</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'processado' && (
                                            <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-xs font-semibold rounded-lg">
                                                {t('clientHoursDetail.badges.processed')}
                                            </Badge>
                                        )}
                                        {worker.status === 'validado' && (
                                            <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-lg">
                                                {t('clientHoursDetail.badges.validated')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {/* Coluna 1: Chat e Notificações ao Trabalhador */}
                                    <TableCell className="text-center align-top pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setWorkerNotificationDialogState({ open: true, worker })}
                                            className={`h-8 px-2.5 rounded-xl flex items-center justify-center gap-1.5 mx-auto transition-all ${
                                                msgCount.unreadByGestor > 0
                                                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-500/20 font-bold'
                                                    : msgCount.total > 0
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-medium'
                                                    : 'text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                                            }`}
                                            title={t('clientHoursDetail.tooltips.openChat')}
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            <span className="text-xs">
                                                {msgCount.unreadByGestor > 0 ? (
                                                    <span className="flex items-center gap-1">
                                                        Chat
                                                        <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-2xs">
                                                            +{msgCount.unreadByGestor}
                                                        </span>
                                                    </span>
                                                ) : msgCount.total > 0 ? (
                                                    <span>Chat ({msgCount.total})</span>
                                                ) : (
                                                    <span>{t('clientHoursDetail.buttons.notify')}</span>
                                                )}
                                            </span>
                                        </Button>
                                    </TableCell>
                                    {/* Coluna 2: Anotações Internas do Escritório */}
                                    <TableCell className="align-top pt-4">
                                        {worker.observacoes ? (
                                            <div className="flex items-start gap-2">
                                                <div 
                                                    className="text-xs text-amber-900 bg-amber-50/90 border border-amber-200 p-2 rounded-xl max-w-[200px] whitespace-pre-wrap break-words cursor-pointer hover:bg-amber-100 transition-colors shadow-2xs"
                                                    title={t('clientHoursDetail.tooltips.editNote')}
                                                    onClick={() => setNotesDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        hourRecordId: worker.hour_record_id || null,
                                                        existingNote: worker.observacoes || null
                                                    })}
                                                >
                                                    <div className="text-[9px] uppercase font-bold text-amber-700 mb-0.5 tracking-wider flex items-center gap-1">
                                                        <StickyNote className="h-2.5 w-2.5" />
                                                        <span>{t('clientHoursDetail.badges.internal')}</span>
                                                    </div>
                                                    {worker.observacoes}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-start">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                                                    onClick={() => setNotesDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        hourRecordId: worker.hour_record_id || null,
                                                        existingNote: worker.observacoes || null
                                                    })}
                                                    title={t('clientHoursDetail.tooltips.addNote')}
                                                >
                                                    <StickyNote className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        {worker.file_name && worker.file_url ? (
                                            <div
                                                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 cursor-pointer max-w-[200px] bg-blue-50/60 border border-blue-200/70 px-2.5 py-1 rounded-lg"
                                                onClick={() => handleViewFile(worker.file_url!)}
                                            >
                                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate font-semibold" title={worker.file_name}>{worker.file_name}</span>
                                            </div>
                                        ) : (['em_andamento', 'aguardando_assinatura', 'assinado_encarregado'].includes(worker.status) || worker.has_portal_hours || (worker.status === 'validado' && !worker.file_url)) ? (
                                            <div
                                                className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-semibold w-fit cursor-pointer hover:bg-indigo-100 transition-colors"
                                                onClick={() => handleOpenValidation(worker)}
                                                title={t('clientHoursDetail.tooltips.openPortalValidation')}
                                            >
                                                <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                                                <span>
                                                    {t('clientHoursDetail.badges.digitalPortal')}{worker.horas_totais && worker.horas_totais > 0 ? ` (${worker.horas_totais}h)` : ''}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground/40 text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right align-top pt-4 pr-4">
                                        <div className="flex justify-end gap-1.5">
                                            {(worker.status === 'pendente' || (!worker.file_url && ['em_andamento', 'aguardando_assinatura'].includes(worker.status))) && (role === 'super_admin' || role === 'admin_rh') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    onClick={() => setUploadDialogState({
                                                        open: true,
                                                        workerId: worker.worker_id,
                                                        workerName: worker.worker_name,
                                                        contratante: worker.contratante,
                                                        hourRecordId: worker.hour_record_id,
                                                        workerFunction: worker.funcion
                                                    })}
                                                    title={t('clientHoursDetail.tooltips.sendSheet')}
                                                >
                                                    <Upload className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {worker.status !== 'pendente' && worker.hour_record_id && (
                                                <>
                                                    {worker.file_url && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 rounded-xl"
                                                            disabled={actionLoading === worker.hour_record_id + '-dl' || actionLoading === worker.hour_record_id + '-ap' || actionLoading === worker.hour_record_id + '-rj'}
                                                            onClick={() => handleDownloadFile(worker.file_url, worker.file_name, worker.hour_record_id!)}
                                                            title={t('clientHoursDetail.tooltips.downloadSheet')}
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-dl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                    {worker.status === 'enviado' && (role === 'super_admin' || role === 'admin_rh' || role === 'operador') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={actionLoading === worker.hour_record_id + '-ocr'}
                                                            onClick={() => handleReprocessOcr(worker)}
                                                            className="h-8 rounded-xl text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 flex items-center gap-1.5"
                                                            title={t('clientHoursDetail.tooltips.reprocessAi')}
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-ocr' ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                                                            ) : (
                                                                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                                                            )}
                                                            <span>{actionLoading === worker.hour_record_id + '-ocr' ? t('clientHoursDetail.buttons.readingAi') : t('clientHoursDetail.buttons.reprocessAi')}</span>
                                                        </Button>
                                                    )}
                                                    {['enviado', 'processado', 'validado', 'em_andamento', 'aguardando_assinatura', 'assinado_encarregado'].includes(worker.status) && (role === 'super_admin' || role === 'admin_rh' || role === 'operador') && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className={`h-8 rounded-xl text-white font-semibold px-3 flex items-center gap-1.5 shadow-xs transition-colors ${
                                                                worker.status === 'validado'
                                                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? 'bg-teal-600 hover:bg-teal-700'
                                                                    : worker.status === 'em_andamento' || worker.status === 'aguardando_assinatura'
                                                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                                                    : 'bg-slate-700 hover:bg-slate-800'
                                                            }`}
                                                            onClick={() => handleOpenValidation(worker)}
                                                            disabled={actionLoading === worker.hour_record_id + '-ap'}
                                                            title={
                                                                worker.status === 'validado'
                                                                    ? t('clientHoursDetail.tooltips.revalidate')
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? t('clientHoursDetail.tooltips.validateSigned')
                                                                    : worker.status === 'em_andamento'
                                                                    ? t('clientHoursDetail.tooltips.validatePortal')
                                                                    : t('clientHoursDetail.tooltips.validate')
                                                            }
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-ap' ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4 shrink-0" />
                                                            )}
                                                            <span>
                                                                {worker.status === 'validado'
                                                                    ? t('clientHoursDetail.buttons.validated')
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? t('clientHoursDetail.buttons.validateSigned')
                                                                    : worker.status === 'em_andamento'
                                                                    ? t('clientHoursDetail.buttons.validatePortal')
                                                                    : worker.status === 'aguardando_assinatura'
                                                                    ? t('clientHoursDetail.buttons.viewValidate')
                                                                    : t('clientHoursDetail.buttons.validate')}
                                                            </span>
                                                        </Button>
                                                    )}
                                                    {(role === 'super_admin' || role === 'admin_rh') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                                                            onClick={() => handleRejectFile(worker.hour_record_id!, worker.file_url, worker.worker_id)}
                                                            disabled={actionLoading === worker.hour_record_id + '-rj'}
                                                            title={worker.file_url ? t('clientHoursDetail.tooltips.reject') : t('clientHoursDetail.tooltips.rejectPortal')}
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
                empresaId={selectedEmpresaId as string}
                workerFunction={uploadDialogState.workerFunction}
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

            <Dialog 
                open={validationDialogState.open} 
                onOpenChange={(open) => setValidationDialogState(prev => ({ ...prev, open }))}
            >
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden">
                    {validationDialogState.open && (
                        <ValidationScreen
                            workerId={validationDialogState.workerId}
                            workerName={validationDialogState.workerName}
                            workerCode={validationDialogState.workerCode}
                            workerFunction={validationDialogState.workerFunction}
                            recordId={validationDialogState.recordId}
                            fileUrl={validationDialogState.fileUrl}
                            fileName={validationDialogState.fileName}
                            filePath={validationDialogState.filePath}
                            contratante={validationDialogState.contratante}
                            clienteNome={clientName || ''}
                            empresaId={selectedEmpresaId as string}
                            year={year}
                            month={month}
                            onClose={() => setValidationDialogState(prev => ({ ...prev, open: false }))}
                            onSuccess={() => {
                                setValidationDialogState(prev => ({ ...prev, open: false }));
                                fetchClientWorkers();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Disparo de Lembretes e Cobrança aos Pendentes */}
            <BroadcastReminderDialog
                open={broadcastDialogOpen}
                onOpenChange={setBroadcastDialogOpen}
                clientName={clientName || ''}
                month={month}
                year={year}
                pendingWorkers={pendingWorkersList}
            />

            {/* Modal de Chat & Notificação Individual com o Trabalhador */}
            {workerNotificationDialogState.worker && (
                <WorkerNotificationDialog
                    open={workerNotificationDialogState.open}
                    onOpenChange={(open) => setWorkerNotificationDialogState(prev => ({ ...prev, open }))}
                    workerId={workerNotificationDialogState.worker.worker_id}
                    workerName={workerNotificationDialogState.worker.worker_name}
                    workerCode={workerNotificationDialogState.worker.cod_colab}
                    workerPassport={workerNotificationDialogState.worker.pasaporte || undefined}
                    workerPhone={workerNotificationDialogState.worker.movil || undefined}
                    periodYear={year}
                    periodMonth={month}
                    clientName={clientName || ''}
                    hourRecordId={workerNotificationDialogState.worker.hour_record_id || undefined}
                    onMessageSent={() => {
                        fetchClientWorkers(true);
                    }}
                />
            )}

            {/* Modal de Notificação em Lote para Múltiplos Trabalhadores Selecionados */}
            <BatchWorkerNotificationDialog
                open={batchNotificationOpen}
                onOpenChange={setBatchNotificationOpen}
                clientName={clientName || ''}
                periodYear={year}
                periodMonth={month}
                selectedWorkers={selectedWorkersForBatch}
                onSuccess={() => {
                    setSelectedWorkerIds([]);
                    fetchClientWorkers(true);
                }}
            />
        </div>
    );
}
