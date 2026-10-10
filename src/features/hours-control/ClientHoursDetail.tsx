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
    const [workerMessageCounts, setWorkerMessageCounts] = useState<Record<string, { total: number; unreadByGestor: number }>>({});
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

            // Merge details
            const merged: WorkerDetail[] = workersData?.map((w: any) => {
                let hr = hoursData.find(h => 
                    h.worker_id === w.id && 
                    (!h.contratante || !w.contratante || h.contratante.trim().toLowerCase() === w.contratante.trim().toLowerCase()) &&
                    h.cliente_nombre?.trim().toLowerCase() === w.cliente_nombre?.trim().toLowerCase()
                );
                if (!hr) {
                    hr = hoursData.find(h => 
                        h.worker_id === w.id && 
                        (!h.contratante || !w.contratante || h.contratante.trim().toLowerCase() === w.contratante.trim().toLowerCase()) &&
                        (!h.cliente_nombre || h.cliente_nombre === 'NÃO DEFINIDO')
                    );
                }
                return {
                    worker_id: w.id,
                    worker_name: w.nome,
                    cod_colab: w.cod_colab,
                    funcion: w.funcion,
                    pasaporte: w.pasaporte,
                    movil: w.movil,
                    status: hr?.status || 'pendente',
                    file_url: hr?.file_url,
                    file_name: hr?.file_name,
                    hour_record_id: hr?.id,
                    observacoes: hr?.observacoes,
                    contratante: w.contratante || '',
                    worker_status: w.status_trabajador,
                    data_baixa: w.data_baixa
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

    const handleRejectFile = async (recordId: string, filePath: string, workerId: string) => {
        if (!confirm(t('clientHoursDetail.messages.confirmReject'))) {
            return;
        }

        try {
            setActionLoading(recordId + '-rj');

            // Delete file from storage first
            const bucketName = getBucketName(filePath);
            const { error: storageError } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (storageError) {
                console.error('Error deleting file:', storageError);
                // Proceed anyway to fix the database state if storage fails
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
                .update({ status: 'pendente', file_url: null, file_name: null })
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

    const handleSelectPendingOnly = () => {
        const pendingIds = workers
            .filter(w => w.status === 'pendente' || w.status === 'em_andamento')
            .map(w => w.worker_id);
        setSelectedWorkerIds(pendingIds);
        if (pendingIds.length > 0) {
            toast.info(`${pendingIds.length} trabalhadores com horas pendentes selecionados.`);
        } else {
            toast.info('Não há trabalhadores com horas pendentes neste cliente.');
        }
    };

    const toggleWorkerSelection = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
        );
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

            {/* PAINEL DE KPIS INTERATIVOS COM FILTRO DIRETO AO CLICAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {/* 1. Total */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                        statusFilter === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20 dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-card text-card-foreground border-border hover:bg-muted/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                            Total Alocados
                        </span>
                        <Users className="h-4 w-4 opacity-70" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{kpis.total}</span>
                        <span className="text-xs opacity-60">trabalhadores</span>
                    </div>
                </button>

                {/* 2. Pendentes / Falta Enviar (Destaque Vermelho/Rose) */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('pendente')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                        statusFilter === 'pendente'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
                            : 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100/70'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            Falta Enviar
                        </span>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{kpis.pendentes}</span>
                        {kpis.pendentes > 0 && (
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                statusFilter === 'pendente' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
                            }`}>
                                Cobrar
                            </span>
                        )}
                    </div>
                </button>

                {/* 3. Portal Rascunho / Em Andamento */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('em_andamento')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                        statusFilter === 'em_andamento'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-500/20'
                            : 'bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800/60 hover:bg-sky-100/70'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            Em Andamento
                        </span>
                        <Clock className="h-4 w-4 text-sky-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{kpis.emAndamento}</span>
                        <span className="text-xs opacity-60">a preencher</span>
                    </div>
                </button>

                {/* 4. Portal Aguardando Assinatura */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('aguardando_assinatura')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                        statusFilter === 'aguardando_assinatura'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/70'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            Por Assinar
                        </span>
                        <FileText className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{kpis.assinaturas}</span>
                        <span className="text-xs opacity-60">aguardando</span>
                    </div>
                </button>

                {/* 5. Validadas / Concluídas */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('validado')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                        statusFilter === 'validado'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                            : 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            Validados
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{kpis.validados}</span>
                        <span className="text-xs opacity-60">concluídos</span>
                    </div>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-3.5 rounded-2xl border">
                <div>
                    <h2 className="text-base font-bold">{getMonthName(month)} {year}</h2>
                    <p className="text-xs text-muted-foreground">
                        {filteredWorkers.length} de {workers.length} {t('clientHoursDetail.activeWorkers')}
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
                        title="Marcar caixas de seleção de todos os trabalhadores com envio de horas pendente"
                    >
                        Selecionar Pendentes
                    </Button>

                    {/* Botão de Cobrança / Notificação para Pendentes */}
                    <Button
                        type="button"
                        onClick={() => setBroadcastDialogOpen(true)}
                        disabled={kpis.pendentes === 0}
                        className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                            kpis.pendentes > 0 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95' 
                                : 'bg-muted text-muted-foreground'
                        }`}
                        title="Disparar notificação ou mensagem aos trabalhadores com horas pendentes"
                    >
                        <Bell className="h-3.5 w-3.5" />
                        <span>Notificar Pendentes ({kpis.pendentes})</span>
                    </Button>

                    {/* Filtro de Busca */}
                    <div className="relative w-full sm:w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar trabalhador..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-9 pr-8 h-9 text-xs rounded-xl dark:bg-slate-950 dark:border-slate-800"
                        />
                        {localSearch && (
                            <button
                                onClick={() => setLocalSearch('')}
                                className="absolute right-2.5 top-2 h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Filtro de Status */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs rounded-xl bg-background dark:bg-slate-950 dark:border-slate-800 font-semibold">
                            <SelectValue placeholder="Filtrar por status" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                            <SelectItem value="all">Todos ({workers.length})</SelectItem>
                            <SelectItem value="pendente">Falta Enviar ({kpis.pendentes})</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento ({kpis.emAndamento})</SelectItem>
                            <SelectItem value="aguardando_assinatura">Por Assinar ({kpis.assinaturas})</SelectItem>
                            <SelectItem value="enviado">Para Validar ({kpis.paraValidar})</SelectItem>
                            <SelectItem value="validado">Validados ({kpis.validados})</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Barra de Ação em Lote quando há Trabalhadores Selecionados */}
            {selectedWorkerIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 p-3 px-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-black shadow-xs">
                            {selectedWorkerIds.length}
                        </span>
                        <div className="text-xs">
                            <span className="font-bold text-indigo-950 dark:text-indigo-200">
                                {selectedWorkerIds.length} {selectedWorkerIds.length === 1 ? 'colaborador selecionado' : 'colaboradores selecionados'}
                            </span>
                            <span className="text-muted-foreground ml-1 hidden sm:inline">
                                ({workers.length} no total deste cliente)
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
                            <span>Notificar Selecionados ({selectedWorkerIds.length})</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedWorkerIds([])}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                        >
                            Limpar seleção
                        </Button>
                    </div>
                </div>
            )}

            <Card className="flex-1 overflow-hidden border">
                <div className="h-full relative overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 shadow-sm backdrop-blur-md z-10">
                            <TableRow>
                                <TableHead className="w-12 text-center px-3">
                                    <Checkbox
                                        checked={filteredWorkers.length > 0 && filteredWorkers.every(w => selectedWorkerIds.includes(w.worker_id))}
                                        onCheckedChange={handleSelectAllFiltered}
                                        title="Selecionar todos os listados"
                                        aria-label="Selecionar todos os trabalhadores listados"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.worker')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.passport')}</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.phone')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">{t('clientHoursDetail.table.status')}</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Chat / Notificações</TableHead>
                                <TableHead className="font-semibold text-foreground">Anotações Internas</TableHead>
                                <TableHead className="font-semibold text-foreground">{t('clientHoursDetail.table.file')}</TableHead>
                                <TableHead className="w-[180px] text-right">{t('clientHoursDetail.table.actions')}</TableHead>
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
                                        Nenhum trabalhador corresponde aos filtros aplicados.
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

                                return (
                                <TableRow 
                                    key={`${worker.worker_id}-${worker.contratante}`} 
                                    className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                                >
                                    <TableCell className="w-12 text-center align-top pt-4 px-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleWorkerSelection(worker.worker_id)}
                                            aria-label={`Selecionar ${worker.worker_name}`}
                                        />
                                    </TableCell>
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
                                        {worker.status === 'em_andamento' && (
                                            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 font-semibold flex items-center justify-center gap-1 shadow-2xs">
                                                <Clock className="h-3 w-3 text-sky-500" />
                                                <span>Portal: Rascunho</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'aguardando_assinatura' && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold flex items-center justify-center gap-1 shadow-2xs">
                                                <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
                                                <span>Portal: Assinatura</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'assinado_encarregado' && (
                                            <Badge variant="default" className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold flex items-center justify-center gap-1 shadow-2xs">
                                                <Check className="h-3 w-3 text-emerald-600" />
                                                <span>Portal: Assinado</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'enviado' && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 animate-pulse flex items-center justify-center gap-1">
                                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                                <span>{t('clientHoursDetail.badges.processing', 'Processando IA')}</span>
                                            </Badge>
                                        )}
                                        {worker.status === 'processado' && (
                                            <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-xs font-semibold">
                                                {t('clientHoursDetail.badges.processed', 'Lido pela IA')}
                                            </Badge>
                                        )}
                                        {worker.status === 'validado' && <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">{t('clientHoursDetail.badges.validated')}</Badge>}
                                    </TableCell>
                                    {/* Coluna 1: Chat e Notificações ao Trabalhador */}
                                    <TableCell className="text-center align-top pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setWorkerNotificationDialogState({ open: true, worker })}
                                            className={`h-8 px-2.5 rounded-lg flex items-center justify-center gap-1.5 mx-auto transition-all ${
                                                msgCount.unreadByGestor > 0
                                                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-500/20 font-bold'
                                                    : msgCount.total > 0
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-medium'
                                                    : 'text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                                            }`}
                                            title="Abrir chat e histórico de notificações com o trabalhador"
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
                                                    <span>Notificar</span>
                                                )}
                                            </span>
                                        </Button>
                                    </TableCell>
                                    {/* Coluna 2: Anotações Internas do Escritório */}
                                    <TableCell className="align-top pt-4">
                                        {worker.observacoes ? (
                                            <div className="flex items-start gap-2">
                                                <div 
                                                    className="text-xs text-amber-900 bg-amber-50/90 border border-amber-200 p-2 rounded-lg max-w-[200px] whitespace-pre-wrap break-words cursor-pointer hover:bg-amber-100 transition-colors shadow-2xs"
                                                    title="Anotação interna do escritório (privada). Clique para editar."
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
                                                        <span>Interno</span>
                                                    </div>
                                                    {worker.observacoes}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-start">
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
                                                    title="Adicionar anotação interna do escritório (privada)"
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
                                        ) : ['em_andamento', 'aguardando_assinatura', 'assinado_encarregado'].includes(worker.status) ? (
                                            <div
                                                className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md font-semibold w-fit cursor-pointer hover:bg-indigo-100 transition-colors"
                                                onClick={() => handleOpenValidation(worker)}
                                                title="Clique para abrir e validar os apontamentos do portal"
                                            >
                                                <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                                                <span>Portal Digital</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right align-top pt-4">
                                        <div className="flex justify-end gap-2">
                                            {worker.status === 'pendente' && (role === 'super_admin' || role === 'admin_rh') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
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
                                                            disabled={actionLoading === worker.hour_record_id + '-dl' || actionLoading === worker.hour_record_id + '-ap' || actionLoading === worker.hour_record_id + '-rj'}
                                                            onClick={() => handleDownloadFile(worker.file_url, worker.file_name, worker.hour_record_id!)}
                                                            title="Baixar folha anexada"
                                                        >
                                                            {actionLoading === worker.hour_record_id + '-dl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                    {worker.status === 'enviado' && (role === 'super_admin' || role === 'admin_rh' || role === 'operador') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled
                                                            className="h-8 text-slate-500 bg-slate-50 border border-slate-100 flex items-center gap-1.5 cursor-not-allowed"
                                                            title={t('clientHoursDetail.tooltips.processingIA', 'Extraindo dados com IA em segundo plano...')}
                                                        >
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                                            <span>{t('clientHoursDetail.buttons.processing', 'Lendo folha...')}</span>
                                                        </Button>
                                                    )}
                                                    {['processado', 'validado', 'em_andamento', 'aguardando_assinatura', 'assinado_encarregado'].includes(worker.status) && (role === 'super_admin' || role === 'admin_rh' || role === 'operador') && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className={`h-8 text-white font-semibold px-3 flex items-center gap-1.5 shadow-sm transition-colors ${
                                                                worker.status === 'validado'
                                                                    ? 'bg-green-600 hover:bg-green-700'
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                                                    : worker.status === 'em_andamento' || worker.status === 'aguardando_assinatura'
                                                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                                                    : 'bg-slate-600 hover:bg-slate-700'
                                                            }`}
                                                            onClick={() => handleOpenValidation(worker)}
                                                            disabled={actionLoading === worker.hour_record_id + '-ap'}
                                                            title={
                                                                worker.status === 'validado'
                                                                    ? t('clientHoursDetail.tooltips.revalidate', 'Revalidar Lançamentos')
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? 'Validar Apontamento Assinado'
                                                                    : worker.status === 'em_andamento'
                                                                    ? 'Validar Apontamento do Portal'
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
                                                                    ? t('clientHoursDetail.buttons.validated', 'Validado')
                                                                    : worker.status === 'assinado_encarregado'
                                                                    ? 'Validar Assinado'
                                                                    : worker.status === 'em_andamento'
                                                                    ? 'Validar Portal'
                                                                    : worker.status === 'aguardando_assinatura'
                                                                    ? 'Ver / Validar'
                                                                    : t('clientHoursDetail.buttons.validate', 'Validar')}
                                                            </span>
                                                        </Button>
                                                    )}
                                                    {worker.file_url && (role === 'super_admin' || role === 'admin_rh') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => handleRejectFile(worker.hour_record_id!, worker.file_url!, worker.worker_id)}
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
