import React, { useEffect, useState, useRef, useMemo } from 'react';
import { renderAsync } from 'docx-preview';
import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { 
    listContracts, generateContract, deleteContract, updateContractNoticeMetadata, createManualNoticeEntry, type Contract,
    listDocumentRequests, createDocumentRequest, updateDocumentRequest, deleteDocumentRequest, approveDocumentRequest, processDocumentOcr, type DocumentRequest
} from '../api/contractsApi';
import { listWorkers } from '@/features/workers/api/workersApi';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/shared/supabase/client';
import { 
    FileText, Copy, ExternalLink, Plus, RefreshCw, CheckCircle, 
    Mail, AlertCircle, Loader2, Eye, ShieldCheck, Camera,
    MessageSquare, Send, Search, X, Pencil, Trash2, Download, Building2,
    Calendar, MapPin, Clock, AlertTriangle, FolderPlus, ArrowUpDown, ArrowUp, ArrowDown, Package,
    UploadCloud, Upload
} from 'lucide-react';
import { toast } from 'sonner';

const formatHeaderDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
};

const addDaysToIso = (isoStr: string, days: number): string => {
    if (!isoStr) return '';
    const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return isoStr;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
};

const getDaysDiff = (startIso?: string | null, endIso?: string | null): number => {
    if (!startIso || !endIso) return 15;
    const m1 = startIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const m2 = endIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m1 || !m2) return 15;
    const d1 = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
    const d2 = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

const formatIsoToBr = (isoStr?: string | null): string => {
    if (!isoStr) return '-';
    const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return isoStr;
};

const formatCurrencyEur = (val: number): string => {
    const safe = Number.isFinite(val) ? val : 0;
    return `€ ${safe.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const resolveEmpresaIdFromContratante = (contratante?: string | null, fallbackEmpresaId?: string | null): string => {
    const upper = String(contratante || '').toUpperCase();
    if (upper.includes('STOCCO')) return '441f1f5d-aed3-40e3-8c77-7b1217757251';
    if (upper.includes('LUMINOUS') || upper.includes('LUMINUS')) return '847796c4-b253-4e53-9e6b-34a127ec7d85';
    if (upper.includes('TRIANGULO') || upper.includes('TRIÂNGULO')) return 'a798620a-358a-4c6c-9db2-3a507c583cac';
    if (upper.includes('HEXAGON')) return '2c944db5-f1d0-4789-a562-8cfa1c0155b7';
    if (upper.includes('WISEOWE')) return 'dae64d51-2181-4510-b14f-e63d2f111a8e';
    return fallbackEmpresaId || 'dae64d51-2181-4510-b14f-e63d2f111a8e';
};

const computeDefaultMonthWorkedDays = (
    workStartDate?: string | null,
    noticeStartDate?: string | null,
    stopDate?: string | null,
    todayIso?: string
): number => {
    const refBase = stopDate || noticeStartDate || todayIso || new Date().toISOString().split('T')[0];
    const m = refBase.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return 0;
    const monthFirstDay = `${m[1]}-${m[2]}-01`;
    let effectiveStart = monthFirstDay;
    if (workStartDate && /^\d{4}-\d{2}-\d{2}/.test(workStartDate)) {
        const ws = workStartDate.substring(0, 10);
        if (ws > monthFirstDay) {
            effectiveStart = ws;
        }
    }
    if (refBase < effectiveStart) return 0;
    return Math.max(0, getDaysDiff(effectiveStart, refBase) + 1);
};

const computeNoticeDetails = (c: Contract, todayStr: string) => {
    const reqDate = c.metadata?.request_date || (c.created_at ? c.created_at.split('T')[0] : todayStr);
    const startNotice = c.metadata?.notice_start_date || reqDate;
    const endNotice = c.metadata?.notice_end_date || (c.terminated_at ? c.terminated_at.split('T')[0] : addDaysToIso(startNotice, 15));
    const totalNoticeDays = c.metadata?.notice_days ? Number(c.metadata.notice_days) : 15;
    const penaltyTotal = c.metadata?.penalty_total !== undefined && c.metadata?.penalty_total !== null
        ? Number(c.metadata.penalty_total)
        : 460;
    const dailyRate = totalNoticeDays > 0 ? penaltyTotal / totalNoticeDays : 30.6666667;
    const applyDeduction = c.metadata?.apply_deduction !== false;
    const stopDate = c.metadata?.stop_date || null;
    const workStartDate = c.metadata?.work_start_date || c.worker?.data_ingresso || c.worker?.data_alta_seguridad || null;

    let fulfilledDays = 0;
    if (c.metadata?.fulfilled_days_override !== undefined && c.metadata?.fulfilled_days_override !== null) {
        fulfilledDays = Math.max(0, Math.min(totalNoticeDays, Number(c.metadata.fulfilled_days_override)));
    } else if (c.metadata?.notice_status === 'completed') {
        fulfilledDays = totalNoticeDays;
    } else if (c.metadata?.notice_status === 'abandoned' && !stopDate) {
        fulfilledDays = 0;
    } else {
        // Sábado e domingo contam normalmente como dias cumpridos (dias corridos até hoje ou até a data de parada/abandono)
        const refDate = stopDate || todayStr;
        const rawDiff = getDaysDiff(startNotice, refDate);
        fulfilledDays = Math.max(0, Math.min(totalNoticeDays, rawDiff));
    }

    let computedStatus: 'in_progress' | 'completed' | 'abandoned' | 'waived' = 'in_progress';
    if (!applyDeduction) {
        computedStatus = 'waived';
    } else if (c.metadata?.notice_status === 'abandoned' || (stopDate && fulfilledDays < totalNoticeDays)) {
        computedStatus = 'abandoned';
    } else if (c.metadata?.notice_status === 'completed' || fulfilledDays >= totalNoticeDays) {
        computedStatus = 'completed';
    } else {
        computedStatus = 'in_progress';
    }

    const fulfilledAmount = Math.min(penaltyTotal, fulfilledDays * dailyRate);
    const theoreticalRemaining = Math.max(0, Number((penaltyTotal - fulfilledAmount).toFixed(2)));
    const finalToDeduct = applyDeduction ? theoreticalRemaining : 0;

    let monthWorkedDays = 0;
    if (c.metadata?.month_worked_days !== undefined && c.metadata?.month_worked_days !== null) {
        monthWorkedDays = Math.max(0, Number(c.metadata.month_worked_days));
    } else if (c.metadata?.notice_status === 'abandoned' && !stopDate) {
        monthWorkedDays = 0;
    } else {
        const refForMonth = stopDate || (todayStr > startNotice ? (todayStr < endNotice ? todayStr : endNotice) : startNotice);
        monthWorkedDays = computeDefaultMonthWorkedDays(workStartDate, startNotice, refForMonth, todayStr);
    }

    return {
        reqDate,
        startNotice,
        endNotice,
        totalNoticeDays,
        penaltyTotal,
        dailyRate,
        applyDeduction,
        stopDate,
        workStartDate,
        fulfilledDays,
        remainingDays: Math.max(0, totalNoticeDays - fulfilledDays),
        computedStatus,
        fulfilledAmount,
        theoreticalRemaining,
        finalToDeduct,
        monthWorkedDays,
        isManualEntry: Boolean(c.metadata?.is_manual_entry),
        notes: c.metadata?.notice_notes || '',
    };
};

const parseDateToInput = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    
    // Check if ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.substring(0, 10);
    }
    
    // Check if DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
        const day = ddmmyyyy[1].padStart(2, '0');
        const month = ddmmyyyy[2].padStart(2, '0');
        const year = ddmmyyyy[3];
        return `${year}-${month}-${day}`;
    }

    // Check if YYYY/MM/DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
        const year = yyyymmdd[1];
        const month = yyyymmdd[2].padStart(2, '0');
        const day = yyyymmdd[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    try {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().substring(0, 10);
        }
    } catch (_) {}

    return '';
};

const getStartDateUrgency = (dateStr?: string | null) => {
    if (!dateStr) return { text: 'A Definir', badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-400/30' };
    
    try {
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        targetDate.setHours(0,0,0,0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `Já Iniciou (${Math.abs(diffDays)}d atrás)`, badgeClass: 'bg-slate-700 text-slate-200 border-slate-600' };
        } else if (diffDays === 0) {
            return { text: '🚨 INICIA HOJE!', badgeClass: 'bg-rose-600 text-white font-extrabold animate-pulse' };
        } else if (diffDays <= 3) {
            return { text: `🔴 URGENTE: Faltam ${diffDays}d`, badgeClass: 'bg-rose-500/25 text-rose-300 border-rose-400/40 font-bold' };
        } else if (diffDays <= 7) {
            return { text: `🟡 ATENÇÃO: Faltam ${diffDays}d`, badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/40 font-bold' };
        } else {
            return { text: `🟢 Faltam ${diffDays} dias`, badgeClass: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40' };
        }
    } catch {
        return { text: 'Data Fixada', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' };
    }
};

export const resolveContratanteOption = (empresaIdOrName?: string | null): string => {
    if (!empresaIdOrName) return 'WISEOWE UNIPESSOAL LDA';
    const str = String(empresaIdOrName).trim();
    const upper = str.toUpperCase();

    if (str === '441f1f5d-aed3-40e3-8c77-7b1217757251' || upper.includes('STOCCO')) {
        return 'STOCCO';
    }
    if (str === '847796c4-b253-4e53-9e6b-34a127ec7d85' || upper.includes('LUMINOUS') || upper.includes('LUMINUS')) {
        return 'LUMINOUS CAPITAL UNIPESSOAL LDA';
    }
    if (str === 'a798620a-358a-4c6c-9db2-3a507c583cac' || upper.includes('TRIANGULO') || upper.includes('TRIÂNGULO')) {
        return 'TRIANGULO';
    }
    if (upper.includes('HEXAGON') || upper === 'HEX' || str === '2c944db5-f1d0-4789-a562-8cfa1c0155b7') return 'HEXAGON';
    if (upper.includes('MASTERCORP')) {
        return 'MASTERCORP PORTUGAL UNIPESSOAL LDA';
    }
    if (str === 'dae64d51-2181-4510-b14f-e63d2f111a8e' || upper.includes('WISEOWE')) {
        return 'WISEOWE UNIPESSOAL LDA';
    }
    return 'WISEOWE UNIPESSOAL LDA';
};

export function DocumentacionTasksPage() {
    const { selectedEmpresaId, activeEmpresaId } = useEmpresa();
    
    // Contratos state
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loadingContracts, setLoadingContracts] = useState(false);

    // Document Requests state
    const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
    const [loadingDocRequests, setLoadingDocRequests] = useState(false);
    
    // Workers state for generation & request
    const [workersList, setWorkersList] = useState<{ value: string; label: string }[]>([]);

    // Dialog & Form states - Geração de Contrato
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [selectedContratante, setSelectedContratante] = useState<string>('');
    const [selectedContractType, setSelectedContractType] = useState<string>('');
    const [generationSuccess, setGenerationSuccess] = useState<{
        signingLink: string;
        otpCode: string;
        emailSent: boolean;
        contractType?: string;
        documentUrl?: string;
    } | null>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Dialog & Form states - Carta de Rescisão
    const todayIsoStr = () => new Date().toISOString().split('T')[0];
    const [rescisaoDialogOpen, setRescisaoDialogOpen] = useState(false);
    const [generatingRescisao, setGeneratingRescisao] = useState(false);
    const [rescisaoWorkerId, setRescisaoWorkerId] = useState<string | null>(null);
    const [rescisaoAssignmentId, setRescisaoAssignmentId] = useState<string | null>(null);
    const [rescisaoContratante, setRescisaoContratante] = useState<string>('STOCCO');
    const [rescisaoPasaporte, setRescisaoPasaporte] = useState<string>('');
    const [rescisaoNif, setRescisaoNif] = useState<string>('');
    const [rescisaoNiss, setRescisaoNiss] = useState<string>('');
    const workersCacheRef = useRef<Map<string, any>>(new Map());
    const [loadingRescisaoWorker, setLoadingRescisaoWorker] = useState(false);
    const [rescisaoWorkerPhone, setRescisaoWorkerPhone] = useState<string>('');
    const [rescisaoWorkerEmail, setRescisaoWorkerEmail] = useState<string>('');
    const [rescisaoWorkerName, setRescisaoWorkerName] = useState<string>('');
    const [rescisaoWorkerDetails, setRescisaoWorkerDetails] = useState<{
        cod_colab?: string;
        funcion?: string;
        cliente?: string;
        contratante?: string;
        status_trabajador?: string;
        status_seguridad?: string;
        dni?: string;
        nie?: string;
    } | null>(null);
    const [rescisaoRequestDate, setRescisaoRequestDate] = useState<string>(todayIsoStr);
    const [rescisaoStartDate, setRescisaoStartDate] = useState<string>(todayIsoStr);
    const [rescisaoEndDate, setRescisaoEndDate] = useState<string>(() => addDaysToIso(todayIsoStr(), 15));
    const [rescisaoSuccess, setRescisaoSuccess] = useState<{
        signingLink: string;
        otpCode: string;
        emailSent: boolean;
        documentUrl?: string;
    } | null>(null);
    const [rescisaoPreviewBlob, setRescisaoPreviewBlob] = useState<Blob | null>(null);
    const [loadingRescisaoPreview, setLoadingRescisaoPreview] = useState(false);
    const rescisaoPreviewRef = useRef<HTMLDivElement>(null);

    // Filtros da aba Cartas de Rescisão & Gestão de Aviso Prévio
    const [rescisaoSubView, setRescisaoSubView] = useState<'assinaturas' | 'aviso_previo'>('assinaturas');
    const [searchTermRescisao, setSearchTermRescisao] = useState('');
    const [statusFilterRescisao, setStatusFilterRescisao] = useState('all');
    const [noticeStatusFilter, setNoticeStatusFilter] = useState<'all' | 'in_progress' | 'abandoned' | 'completed' | 'waived'>('all');
    const [empresaFilterRescisao, setEmpresaFilterRescisao] = useState('all');

    // Modal de Gestão / Inclusão de Trabalhador no Aviso Prévio
    const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
    const [noticeDialogMode, setNoticeDialogMode] = useState<'create' | 'edit'>('create');
    const [editingNoticeContract, setEditingNoticeContract] = useState<Contract | null>(null);
    const [savingNotice, setSavingNotice] = useState(false);
    const [noticeWorkerId, setNoticeWorkerId] = useState<string | null>(null);
    const [noticeWorkerName, setNoticeWorkerName] = useState<string>('');
    const [noticeAssignmentId, setNoticeAssignmentId] = useState<string | null>(null);
    const [noticeContratante, setNoticeContratante] = useState<string>('STOCCO');
    const [noticeWorkStartDate, setNoticeWorkStartDate] = useState<string>('');
    const [noticeMonthWorkedDays, setNoticeMonthWorkedDays] = useState<string>('15');
    const [noticeRequestDate, setNoticeRequestDate] = useState<string>(todayIsoStr);
    const [noticeStartDate, setNoticeStartDate] = useState<string>(todayIsoStr);
    const [noticeEndDate, setNoticeEndDate] = useState<string>(() => addDaysToIso(todayIsoStr(), 15));
    const [noticePenaltyTotal, setNoticePenaltyTotal] = useState<string>('460');
    const [noticeStatus, setNoticeStatus] = useState<'in_progress' | 'abandoned' | 'completed'>('in_progress');
    const [noticeStopDate, setNoticeStopDate] = useState<string>('');
    const [noticeFulfilledDaysOverride, setNoticeFulfilledDaysOverride] = useState<string>('');
    const [noticeApplyDeduction, setNoticeApplyDeduction] = useState<boolean>(true);
    const [noticeSignedManually, setNoticeSignedManually] = useState<boolean>(true);
    const [noticeNotes, setNoticeNotes] = useState<string>('');

    // Lista global de clientes e trabalhadores para formulários
    const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);

    // Dialog & Form states - Nova Solicitação de Docs
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [requestEmpresaId, setRequestEmpresaId] = useState<string>('dae64d51-2181-4510-b14f-e63d2f111a8e'); // Default Wiseowe
    const [requestClientId, setRequestClientId] = useState<string>('');
    const [requestStartDate, setRequestStartDate] = useState<string>('');
    const [requestWorkerId, setRequestWorkerId] = useState<string | null>(null);
    const [requestWorkersList, setRequestWorkersList] = useState<{ value: string; label: string }[]>([]);
    const [creatingRequest, setCreatingRequest] = useState(false);
    const [requestSuccessLink, setRequestSuccessLink] = useState<string | null>(null);

    // Dialog & Form states - Editar Solicitação de Docs
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
    const [editEmpresaId, setEditEmpresaId] = useState<string>('');
    const [editClientId, setEditClientId] = useState<string>('');
    const [editStartDate, setEditStartDate] = useState<string>('');
    const [updatingRequest, setUpdatingRequest] = useState(false);

    // Dialog & Form states - Verificação de Documento Enviado (Lado a Lado)
    const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [activeDocTab, setActiveDocTab] = useState<'identity' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie'>('identity');
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [selectedAttachDocType, setSelectedAttachDocType] = useState<string>('passaporte');
    const [savingAttachDoc, setSavingAttachDoc] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [rejectingDoc, setRejectingDoc] = useState(false);
    const docFileInputRef = useRef<HTMLInputElement>(null);

    const handleTabChange = (tab: 'identity' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie') => {
        setActiveDocTab(tab);
        if (tab === 'identity') setSelectedAttachDocType('passaporte');
        else if (tab === 'nif') setSelectedAttachDocType('nif');
        else if (tab === 'niss') setSelectedAttachDocType('niss');
        else if (tab === 'license') setSelectedAttachDocType('permision_conducir');
        else if (tab === 'iban') setSelectedAttachDocType('certificado_banco');
        else if (tab === 'selfie') setSelectedAttachDocType('foto');
    };
    const [verifyFormData, setVerifyFormData] = useState({
        nome: '',
        email: '',
        movil: '',
        direccion_actual: '',
        morada_contrato: '',
        ubicacion_actual: '',
        contacto_emergencia_nombre: '',
        contacto_emergencia_parentesco: '',
        contacto_emergencia_telefono: '',
        talla_camisa: '',
        talla_pantalon: '',
        banco: '',
        iban: '',
        nif: '',
        niss: '',
        nie: '',
        dni: '',
        pasaporte: '',
        licencia_conducir: '',
        nacionalidade: '',
        fecha_nacimiento: ''
    });

    // State para modal de trabalhadores associados à tarefa clicada
    const [selectedTaskForWorkers, setSelectedTaskForWorkers] = useState<any | null>(null);
    const [workersDialogOpen, setWorkersDialogOpen] = useState(false);
    const [taskWorkers, setTaskWorkers] = useState<any[]>([]);
    const [loadingTaskWorkers, setLoadingTaskWorkers] = useState(false);
    const [taskMetadata, setTaskMetadata] = useState<{ 
        clientName: string; 
        siteName: string; 
        pedidoCode: string; 
        empresaName: string; 
        clientId?: string; 
        siteId?: string; 
        empresaId?: string;
        expectedStartDate?: string | null;
        expectedEndDate?: string | null;
        requestedAt?: string | null;
        siteAddressFormatted?: string | null;
    } | null>(null);

    // States for Configuração de Modelos
    const [selectedConfigContratante, setSelectedConfigContratante] = useState<string>('STOCCO');
    const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null);
    const [uploadingTemplate, setUploadingTemplate] = useState<string | null>(null);
    const [activeUploadDocType, setActiveUploadDocType] = useState<string | null>(null);
    const configFileInputRef = useRef<HTMLInputElement>(null);

    // States para Busca e Filtros
    const [searchTermRequests, setSearchTermRequests] = useState('');
    const [statusFilterRequests, setStatusFilterRequests] = useState('all');
    const [empresaFilterRequests, setEmpresaFilterRequests] = useState('all');
    const [clientFilterRequests, setClientFilterRequests] = useState('all');
    const [pedidoFilterRequests, setPedidoFilterRequests] = useState('all');
    const [sortFieldRequests, setSortFieldRequests] = useState<'worker' | 'empresa' | 'client' | 'planned_start_date' | 'created_at'>('created_at');
    const [sortDirectionRequests, setSortDirectionRequests] = useState<'asc' | 'desc'>('desc');

    const [searchTermContracts, setSearchTermContracts] = useState('');
    const [statusFilterContracts, setStatusFilterContracts] = useState('all');
    const [pedidoFilterContracts, setPedidoFilterContracts] = useState('all');
    const [sortFieldContracts, setSortFieldContracts] = useState<'created_at' | 'worker' | 'empresa' | 'client' | 'type' | 'status'>('created_at');
    const [sortDirectionContracts, setSortDirectionContracts] = useState<'asc' | 'desc'>('desc');

    const handleContractSort = (field: 'created_at' | 'worker' | 'empresa' | 'client' | 'type' | 'status') => {
        if (sortFieldContracts === field) {
            setSortDirectionContracts(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortFieldContracts(field);
            setSortDirectionContracts(field === 'created_at' ? 'desc' : 'asc');
        }
    };

    // Get unique list of empresas from docRequests dynamically
    const uniqueEmpresasRequests = useMemo(() => {
        const set = new Set<string>();
        docRequests.forEach(req => {
            const name = req.empresa?.name || 'Stocco';
            set.add(name);
        });
        return Array.from(set).sort();
    }, [docRequests]);

    // Get unique list of clients from docRequests dynamically
    const uniqueClientsRequests = useMemo(() => {
        const set = new Set<string>();
        docRequests.forEach(req => {
            const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = req.client?.trade_name || req.client?.legal_name ||
                               activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                               req.worker?.cliente || 'Sem Alocação';
            set.add(clientName);
        });
        return Array.from(set).sort();
    }, [docRequests]);

    // Get unique list of pedidos and reemplazos from docRequests dynamically
    const uniquePedidosRequests = useMemo(() => {
        const set = new Set<string>();
        docRequests.forEach(req => {
            if (req.pedido_codigo) set.add(req.pedido_codigo);
            if (req.solicitud_codigo) set.add(req.solicitud_codigo);
        });
        return Array.from(set).sort();
    }, [docRequests]);

    // Get unique list of pedidos and reemplazos from contracts dynamically
    const uniquePedidosContracts = useMemo(() => {
        const set = new Set<string>();
        contracts.forEach(c => {
            if (c.pedido_codigo) set.add(c.pedido_codigo);
            if (c.solicitud_codigo) set.add(c.solicitud_codigo);
        });
        return Array.from(set).sort();
    }, [contracts]);

    // Handler for sorting requests
    const handleRequestSort = (field: 'worker' | 'empresa' | 'client' | 'planned_start_date' | 'created_at') => {
        if (sortFieldRequests === field) {
            setSortDirectionRequests(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortFieldRequests(field);
            setSortDirectionRequests('asc');
        }
    };

    // Filtrar solicitações localmente
    const filteredRequests = useMemo(() => {
        const filtered = docRequests.filter(req => {
            const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = req.client?.trade_name || req.client?.legal_name ||
                               activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                               req.worker?.cliente || 'Sem Alocação';
            
            const empresaName = req.empresa?.name || 'Stocco';
            const workerName = req.worker?.nome || '';
            const workerEmail = req.worker?.email || '';
            const workerMovil = req.worker?.movil || '';
            const status = req.status || '';
            const pedidoCode = req.pedido_codigo || '';
            const solicitudCode = req.solicitud_codigo || '';
            
            const textMatch = 
                workerName.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                workerEmail.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                workerMovil.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                empresaName.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                pedidoCode.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                solicitudCode.toLowerCase().includes(searchTermRequests.toLowerCase());
                
            const isExpired = new Date(req.expires_at) < new Date();
            let statusMatch = true;
            if (statusFilterRequests !== 'all') {
                if (statusFilterRequests === 'expired') {
                    statusMatch = isExpired;
                } else {
                    statusMatch = status === statusFilterRequests && !isExpired;
                }
            }

            let empresaMatch = true;
            if (empresaFilterRequests !== 'all') {
                empresaMatch = empresaName === empresaFilterRequests;
            }

            let clientMatch = true;
            if (clientFilterRequests !== 'all') {
                clientMatch = clientName === clientFilterRequests;
            }

            let pedidoMatch = true;
            if (pedidoFilterRequests !== 'all') {
                pedidoMatch = req.pedido_codigo === pedidoFilterRequests || req.solicitud_codigo === pedidoFilterRequests;
            }
            
            return textMatch && statusMatch && empresaMatch && clientMatch && pedidoMatch;
        });

        return filtered.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortFieldRequests === 'worker') {
                valA = a.worker?.nome || '';
                valB = b.worker?.nome || '';
            } else if (sortFieldRequests === 'empresa') {
                valA = a.empresa?.name || 'Stocco';
                valB = b.empresa?.name || 'Stocco';
            } else if (sortFieldRequests === 'client') {
                const activeAssA = a.worker?.assignments?.find(as => as.status === 'active');
                const latestAssA = a.worker?.assignments?.[0];
                valA = a.client?.trade_name || a.client?.legal_name ||
                       activeAssA?.client?.trade_name || activeAssA?.client?.legal_name ||
                       latestAssA?.client?.trade_name || latestAssA?.client?.legal_name ||
                       a.worker?.cliente || 'Sem Alocação';

                const activeAssB = b.worker?.assignments?.find(as => as.status === 'active');
                const latestAssB = b.worker?.assignments?.[0];
                valB = b.client?.trade_name || b.client?.legal_name ||
                       activeAssB?.client?.trade_name || activeAssB?.client?.legal_name ||
                       latestAssB?.client?.trade_name || latestAssB?.client?.legal_name ||
                       b.worker?.cliente || 'Sem Alocação';
            } else if (sortFieldRequests === 'planned_start_date') {
                const activeAssA = a.worker?.assignments?.find(as => as.status === 'active');
                const latestAssA = a.worker?.assignments?.[0];
                valA = (a as any).extracted_data?.start_date ||
                       activeAssA?.planned_start_date || activeAssA?.start_date ||
                       latestAssA?.planned_start_date || latestAssA?.start_date || '9999-12-31';

                const activeAssB = b.worker?.assignments?.find(as => as.status === 'active');
                const latestAssB = b.worker?.assignments?.[0];
                valB = (b as any).extracted_data?.start_date ||
                       activeAssB?.planned_start_date || activeAssB?.start_date ||
                       latestAssB?.planned_start_date || latestAssB?.start_date || '9999-12-31';
            } else if (sortFieldRequests === 'created_at') {
                valA = a.created_at || '';
                valB = b.created_at || '';
            }

            if (valA < valB) return sortDirectionRequests === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirectionRequests === 'asc' ? 1 : -1;
            return 0;
        });
    }, [docRequests, searchTermRequests, statusFilterRequests, empresaFilterRequests, clientFilterRequests, pedidoFilterRequests, sortFieldRequests, sortDirectionRequests]);

    // Filtrar e ordenar contratos localmente
    const filteredContracts = useMemo(() => {
        const filtered = contracts.filter(contract => {
            const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || contract.worker?.cliente || 'Sem Alocação';
            const empresaName = contract.contratante || '';
            const workerName = contract.worker?.nome || '';
            const workerEmail = contract.worker?.email || '';
            const pedidoCode = contract.pedido_codigo || '';
            const solicitudCode = contract.solicitud_codigo || '';
            
            const textMatch = 
                workerName.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                workerEmail.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                empresaName.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                pedidoCode.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                solicitudCode.toLowerCase().includes(searchTermContracts.toLowerCase());
                
            let statusMatch = true;
            if (statusFilterContracts !== 'all') {
                statusMatch = contract.status === statusFilterContracts;
            }

            let pedidoMatch = true;
            if (pedidoFilterContracts !== 'all') {
                pedidoMatch = contract.pedido_codigo === pedidoFilterContracts || contract.solicitud_codigo === pedidoFilterContracts;
            }
            
            return textMatch && statusMatch && pedidoMatch;
        });

        return filtered.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortFieldContracts === 'worker') {
                valA = (a.worker?.nome || '').toLowerCase();
                valB = (b.worker?.nome || '').toLowerCase();
            } else if (sortFieldContracts === 'empresa') {
                valA = (a.contratante || '').toLowerCase();
                valB = (b.contratante || '').toLowerCase();
            } else if (sortFieldContracts === 'client') {
                valA = (a.assignment?.client?.trade_name || a.assignment?.client?.legal_name || a.worker?.cliente || 'Sem Alocação').toLowerCase();
                valB = (b.assignment?.client?.trade_name || b.assignment?.client?.legal_name || b.worker?.cliente || 'Sem Alocação').toLowerCase();
            } else if (sortFieldContracts === 'type') {
                valA = (a.contract_type || '').toLowerCase();
                valB = (b.contract_type || '').toLowerCase();
            } else if (sortFieldContracts === 'status') {
                valA = (a.status || '').toLowerCase();
                valB = (b.status || '').toLowerCase();
            } else {
                valA = a.created_at || '';
                valB = b.created_at || '';
            }

            if (valA < valB) return sortDirectionContracts === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirectionContracts === 'asc' ? 1 : -1;
            return 0;
        });
    }, [contracts, searchTermContracts, statusFilterContracts, pedidoFilterContracts, sortFieldContracts, sortDirectionContracts]);

    const rescisaoContracts = useMemo(() => {
        return contracts.filter(c => c.contract_type === 'rescisao');
    }, [contracts]);

    const rescisaoStats = useMemo(() => {
        const total = rescisaoContracts.length;
        const pending = rescisaoContracts.filter(c => c.status === 'pending_signature').length;
        const signed = rescisaoContracts.filter(c => c.status === 'signed').length;
        return { total, pending, signed };
    }, [rescisaoContracts]);

    const noticeStats = useMemo(() => {
        const today = todayIsoStr();
        let inProgress = 0;
        let abandoned = 0;
        let completedOrWaived = 0;
        let totalToDeduct = 0;

        rescisaoContracts.forEach(c => {
            const info = computeNoticeDetails(c, today);
            if (info.computedStatus === 'in_progress') inProgress++;
            else if (info.computedStatus === 'abandoned') abandoned++;
            else completedOrWaived++;

            totalToDeduct += info.finalToDeduct;
        });

        return {
            total: rescisaoContracts.length,
            inProgress,
            abandoned,
            completedOrWaived,
            totalToDeduct: Number(totalToDeduct.toFixed(2)),
        };
    }, [rescisaoContracts]);

    const filteredRescisoes = useMemo(() => {
        const today = todayIsoStr();
        return rescisaoContracts.filter(c => {
            const clientName = c.assignment?.client?.trade_name || c.assignment?.client?.legal_name || c.worker?.cliente || 'Sem Alocação';
            const empresaName = c.contratante || '';
            const workerName = c.worker?.nome || '';
            const workerEmail = c.worker?.email || '';
            const workerDoc = c.worker?.pasaporte || c.worker?.nif || c.worker?.niss || '';

            const q = searchTermRescisao.toLowerCase();
            const textMatch = !q ||
                workerName.toLowerCase().includes(q) ||
                workerEmail.toLowerCase().includes(q) ||
                workerDoc.toLowerCase().includes(q) ||
                empresaName.toLowerCase().includes(q) ||
                clientName.toLowerCase().includes(q);

            const empresaMatch = empresaFilterRescisao === 'all' || c.contratante === empresaFilterRescisao;

            if (rescisaoSubView === 'aviso_previo') {
                if (noticeStatusFilter === 'all') return textMatch && empresaMatch;
                const info = computeNoticeDetails(c, today);
                return textMatch && empresaMatch && info.computedStatus === noticeStatusFilter;
            } else {
                const statusMatch = statusFilterRescisao === 'all' || c.status === statusFilterRescisao;
                return textMatch && statusMatch && empresaMatch;
            }
        });
    }, [rescisaoContracts, searchTermRescisao, statusFilterRescisao, noticeStatusFilter, empresaFilterRescisao, rescisaoSubView]);

    const getTemplatePath = (contratante: string, docType: string) => {
        const upper = contratante.toUpperCase();
        if (docType === 'contrato_nis') {
            return `${contratante}/CONTRATO NIS - ${upper}.docx`;
        } else if (docType === 'contrato_termo_incerto') {
            return `${contratante}/CONTRATO TERMO INCERTO - ${upper}.docx`;
        } else if (docType === 'contrato_alta') {
            return `${contratante}/CONTRATO DE ALTA - ${upper}.docx`;
        } else if (docType === 'rescisao') {
            return `${contratante}/COMUNICADO RESCISAO ${upper}.docx`;
        }
        return '';
    };

    const handleDownloadConfigTemplate = async (docType: string) => {
        try {
            setDownloadingTemplate(docType);
            const filePath = getTemplatePath(selectedConfigContratante, docType);
            if (!filePath) throw new Error("Caminho inválido");

            const { data, error } = await supabase.storage
                .from('contract-templates')
                .download(filePath);

            if (error) throw error;
            if (!data) throw new Error("Arquivo vazio retornado");

            // Baixar no navegador
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop() || 'template.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Download do modelo concluído com sucesso!");
        } catch (err: any) {
            console.error("Erro ao baixar modelo:", err);
            toast.error(`Erro ao baixar modelo: ${err.message || err}`);
        } finally {
            setDownloadingTemplate(null);
        }
    };

    const triggerUpload = (docType: string) => {
        setActiveUploadDocType(docType);
        if (configFileInputRef.current) {
            configFileInputRef.current.value = '';
            configFileInputRef.current.click();
        }
    };

    const handleUploadConfigTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeUploadDocType) return;

        // Validar extensão
        if (!file.name.toLowerCase().endsWith('.docx')) {
            toast.error("Por favor, envie um arquivo no formato Word (.docx)");
            return;
        }

        try {
            setUploadingTemplate(activeUploadDocType);
            const filePath = getTemplatePath(selectedConfigContratante, activeUploadDocType);
            if (!filePath) throw new Error("Caminho inválido");

            // Fazer upload do arquivo exatamente como foi enviado pelo usuário, sem alterar seu XML
            const fileToUpload: Blob = file;

            const { error } = await supabase.storage
                .from('contract-templates')
                .upload(filePath, fileToUpload, {
                    upsert: true,
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });

            if (error) throw error;

            toast.success(`Modelo "${file.name}" atualizado com sucesso!`);
        } catch (err: any) {
            console.error("Erro ao enviar modelo:", err);
            toast.error(`Erro ao enviar modelo: ${err.message || err}`);
        } finally {
            setUploadingTemplate(null);
            setActiveUploadDocType(null);
        }
    };

    const handleDeleteContractItem = async (contractId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este registro de contrato?")) return;
        try {
            await deleteContract(contractId);
            toast.success("Contrato excluído com sucesso!");
            loadContracts();
        } catch (err: any) {
            console.error("Erro ao excluir contrato:", err);
            toast.error(`Erro ao excluir contrato: ${err.message || err}`);
        }
    };

    const loadTaskWorkers = async (task: any) => {
        if (!task) return;
        try {
            setLoadingTaskWorkers(true);
            setTaskWorkers([]);
            setTaskMetadata(null);

            const solicitudId = task.solicitud_id;

            // Fetch full solicitud record to ensure we get client_id, client_site_id, empresa_id, codigo, tipo, title, requested_at, created_at
            const { data: solData } = await supabase
                .schema('core_operacoes')
                .from('solicitudes_operativas')
                .select('id, codigo, client_id, client_site_id, empresa_id, pedido_id, tipo, title, requested_at, created_at')
                .eq('id', solicitudId)
                .maybeSingle();

            const pedidoId = solData?.pedido_id || task.solicitud?.pedido_id;
            let clientId = solData?.client_id || task.solicitud?.client_id;
            let siteId = solData?.client_site_id || task.solicitud?.client_site_id;
            let empresaId = solData?.empresa_id || task.solicitud?.empresa_id || selectedEmpresaId;
            let pedidoCode = solData?.codigo || task.solicitud?.codigo || 'N/A';

            let expectedStartDate: string | null = null;
            let expectedEndDate: string | null = null;
            let requestedAt: string | null = solData?.requested_at || solData?.created_at || task.created_at || null;

            // If pedidoId is present, fetch order info to refine code/client/site/dates
            if (pedidoId) {
                const { data: pedidoData } = await supabase
                    .schema('core_comercial')
                    .from('pedidos')
                    .select('id, codigo, client_id, client_site_id, expected_start_date, expected_end_date, created_at, approved_at')
                    .eq('id', pedidoId)
                    .maybeSingle();

                if (pedidoData) {
                    if (pedidoData.codigo) pedidoCode = pedidoData.codigo;
                    if (pedidoData.client_id) clientId = pedidoData.client_id;
                    if (pedidoData.client_site_id) siteId = pedidoData.client_site_id;
                    if (pedidoData.expected_start_date) expectedStartDate = pedidoData.expected_start_date;
                    if (pedidoData.expected_end_date) expectedEndDate = pedidoData.expected_end_date;
                    if (pedidoData.approved_at || pedidoData.created_at) requestedAt = pedidoData.approved_at || pedidoData.created_at;
                }
            }

            // If clientId is still missing, try fetching from solicitud_targets source_client_id or target worker_assignments
            if (!clientId) {
                const { data: targetClientData } = await supabase
                    .schema('core_operacoes')
                    .from('solicitud_targets')
                    .select('source_client_id, target_client_id')
                    .eq('solicitud_id', solicitudId)
                    .limit(1)
                    .maybeSingle();

                if (targetClientData) {
                    clientId = targetClientData.source_client_id || targetClientData.target_client_id;
                }
            }

            // Fetch Names & Address for Client, Site & Empresa
            const [{ data: clientData }, { data: siteData }, { data: empresaData }] = await Promise.all([
                clientId ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, address_line, city').eq('id', clientId).maybeSingle() : Promise.resolve({ data: null }),
                siteId ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, province, postal_code').eq('id', siteId).maybeSingle() : Promise.resolve({ data: null }),
                empresaId ? supabase.schema('core_common').from('empresas').select('id, nome, trade_name, legal_name').eq('id', empresaId).maybeSingle() : Promise.resolve({ data: null })
            ]);

            let clientName = 'N/A';
            if (clientData) {
                clientName = clientData.trade_name || clientData.legal_name || 'N/A';
            }

            let siteName = 'N/A';
            let siteAddressFormatted = '';

            if (siteData) {
                siteName = siteData.name;
                const addrParts = [siteData.address_line, siteData.city, siteData.province, siteData.postal_code ? `CP ${siteData.postal_code}` : null].filter(Boolean);
                siteAddressFormatted = addrParts.join(', ');
            } else if (clientData) {
                siteName = 'Instalações do Cliente';
                const addrParts = [clientData.address_line, clientData.city].filter(Boolean);
                siteAddressFormatted = addrParts.join(', ');
            }

            const empresaName = empresaData?.trade_name || empresaData?.legal_name || empresaData?.nome || 'N/A';

            setTaskMetadata({ 
                clientName, 
                siteName, 
                pedidoCode,
                empresaName,
                clientId,
                siteId,
                empresaId,
                expectedStartDate,
                expectedEndDate,
                requestedAt,
                siteAddressFormatted
            });

            // 2. Fetch targets first
            const { data: targets, error: targetsErr } = await supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select(`
                    *,
                    source_worker:workers!solicitud_targets_source_worker_id_fkey(id, nome, cod_colab, email, movil, funcion),
                    target_worker:workers!solicitud_targets_target_worker_id_fkey(id, nome, cod_colab, email, movil, funcion)
                `)
                .eq('solicitud_id', solicitudId);

            if (targetsErr) throw targetsErr;

            let displayItems: any[] = [];
            if (targets && targets.length > 0) {
                displayItems = targets.map((t: any) => {
                    const isReplacement = t.action_type === 'replace' || t.requires_replacement === true;
                    return {
                        id: t.id,
                        worker: t.target_worker || (isReplacement ? null : t.source_worker),
                        replaced_worker: isReplacement ? t.source_worker : null,
                        action_type: t.action_type || 'substituição',
                        status: t.status || 'pendente',
                        is_replacement: isReplacement,
                        has_substitute: !!t.target_worker,
                        target_job_function_name: t.target_job_function_name
                    };
                });
            } else if (pedidoId) {
                // Fetch from worker_assignments for this specific order
                const { data: assignments, error: assignErr } = await supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select(`
                        *,
                        worker:workers(id, nome, cod_colab, email, movil, funcion)
                    `)
                    .eq('pedido_id', pedidoId)
                    .in('status', ['planned', 'active']);

                if (assignErr) throw assignErr;

                if (assignments) {
                    displayItems = assignments.map((a: any) => ({
                        id: a.id,
                        worker: a.worker,
                        action_type: 'alocação',
                        status: a.status === 'planned' ? 'planejado' : 'ativo'
                    }));
                }
            }

            // 3. For each worker, check if there is an active doc request
            if (displayItems.length > 0) {
                const workerIds = displayItems.map(item => item.worker?.id).filter(Boolean);
                if (workerIds.length > 0) {
                    const { data: requests } = await supabase
                        .schema('core_personal')
                        .from('document_requests')
                        .select('*, worker:workers(id, nome, email, movil, cod_colab)')
                        .in('worker_id', workerIds);

                    const requestsMap = new Map(requests?.map(r => [r.worker_id, r]) || []);
                    displayItems = displayItems.map(item => ({
                        ...item,
                        docRequest: item.worker ? requestsMap.get(item.worker.id) : null
                    }));
                }
            }

            setTaskWorkers(displayItems);

        } catch (err) {
            console.error("Erro ao carregar trabalhadores da tarefa:", err);
            toast.error("Erro ao obter a lista de trabalhadores.");
        } finally {
            setLoadingTaskWorkers(false);
        }
    };

    const handleSendWhatsApp = async (item: any) => {
        if (!item.worker) {
            toast.error("Trabalhador inválido.");
            return;
        }

        const workerName = item.worker.nome;
        const phone = item.worker.movil || '';
        
        let inviteLink = '';
        
        // Se já existe uma solicitação de documentos, usa o token existente
        if (item.docRequest) {
            inviteLink = `${window.location.origin}/enviar-documentos/${item.docRequest.token}`;
        } else {
            // Caso contrário, cria uma nova solicitação silenciosamente na hora!
            try {
                const loadingToast = toast.loading("Gerando link de envio de documentos...");
                const empId = taskMetadata?.empresaId || item.worker?.empresa_id || selectedEmpresaId!;
                const res = await createDocumentRequest(empId, item.worker.id, taskMetadata?.clientId);
                inviteLink = `${window.location.origin}/enviar-documentos/${res.token}`;
                
                // Atualiza a lista local
                setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: res } : w));
                // Atualiza a aba geral de solicitações de documentos
                loadDocRequests();
                toast.dismiss(loadingToast);
            } catch (err) {
                console.error("Erro ao criar solicitação automática:", err);
                toast.dismiss();
                toast.error("Erro ao gerar link de documentos.");
                return;
            }
        }

        // Constrói a mensagem personalizada
        const msg = `Hola ${workerName}
A continuación se compartirá un link, donde proporcionarás la documentación e información requerida para poder continuar con el proceso de gestión de contrato.
 
*LINK: ${inviteLink}
 
Muchas gracias.`;

        // Copia a mensagem para a área de transferência
        try {
            await navigator.clipboard.writeText(msg);
        } catch (clipErr) {
            console.warn("Clipboard copy failed: ", clipErr);
        }
        
        // Abre o link do WhatsApp
        const cleanPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
        const whatsappUrl = cleanPhone 
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
            
        window.open(whatsappUrl, '_blank');
        
        toast.success(`Mensagem personalizada para ${workerName} copiada e WhatsApp aberto!`);
    };

    // 1. Carregar Contratos
    const loadContracts = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoadingContracts(true);
            const data = await listContracts({ empresaId: selectedEmpresaId });
            setContracts(data);
        } catch (err: any) {
            console.error("Erro ao carregar contratos:", err);
            toast.error("Erro ao carregar lista de contratos.");
        } finally {
            setLoadingContracts(false);
        }
    };

    // 2. Carregar Solicitações de Documentos
    const loadDocRequests = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoadingDocRequests(true);
            const data = await listDocumentRequests(selectedEmpresaId);
            setDocRequests(data);
        } catch (err) {
            console.error("Erro ao carregar solicitações de documentos:", err);
            toast.error("Erro ao carregar solicitações de documentos.");
        } finally {
            setLoadingDocRequests(false);
        }
    };

    // 3. Carregar Trabalhadores para o Combobox (sempre carrega todos os trabalhadores do grupo sem duplicatas)
    const loadWorkersForEmpresa = async (_empresaId?: string | null, specificWorkerId?: string) => {
        const HOLDING_ID = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';
        try {
            const res = await listWorkers({
                empresaId: HOLDING_ID,
                page: 1,
                pageSize: 5000,
            });
            const seenIds = new Set<string>();
            const seenCodes = new Set<string>();
            const options: { value: string; label: string }[] = [];

            res.data.forEach(w => {
                if (!w.id) return;
                workersCacheRef.current.set(w.id, w);
                if (seenIds.has(w.id)) return;
                const codeKey = w.cod_colab ? w.cod_colab.trim().toUpperCase() : '';
                if (codeKey && seenCodes.has(codeKey)) return;
                seenIds.add(w.id);
                if (codeKey) seenCodes.add(codeKey);

                const companySuffix = w.contratante ? ` · ${w.contratante}` : '';
                options.push({
                    value: w.id,
                    label: `${w.nome} (${w.cod_colab || 'Sem Cód.'})${companySuffix}`
                });
            });

            const targetWorkerId = specificWorkerId || selectedWorkerId || rescisaoWorkerId;
            if (targetWorkerId && !options.some(o => o.value === targetWorkerId)) {
                const { data: sw } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, nome, cod_colab, contratante')
                    .eq('id', targetWorkerId)
                    .maybeSingle();
                if (sw) {
                    const companySuffix = sw.contratante ? ` · ${sw.contratante}` : '';
                    options.unshift({
                        value: sw.id,
                        label: `${sw.nome} (${sw.cod_colab || 'Sem Cód.'})${companySuffix}`
                    });
                }
            }

            setRequestWorkersList(options);
            setWorkersList(options);
        } catch (err) {
            console.error("Erro ao carregar trabalhadores:", err);
        }
    };

    const loadWorkers = async () => {
        await loadWorkersForEmpresa('bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d');
    };

    // Carregar Lista de Clientes Ativos (com Código e filtro por Empresa)
    const loadClients = async (empresaId?: string, ensureClientId?: string, fallbackClientName?: string) => {
        try {
            const { data, error } = await supabase
                .schema('core_common')
                .from('clients')
                .select(`
                    id, codigo, trade_name, legal_name, tax_id,
                    client_company_settings (
                        empresa_id,
                        status
                    )
                `)
                .is('deleted_at', null)
                .order('trade_name', { ascending: true });
            
            if (error) throw error;

            const holdingId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

            const mapped = (data || [])
                .filter(client => {
                    // Sempre incluir o cliente que já está explicitamente vinculado a este documento/trabalhador
                    if (ensureClientId && client.id === ensureClientId) return true;
                    if (fallbackClientName && (
                        (client.trade_name && client.trade_name.toLowerCase().includes(fallbackClientName.toLowerCase())) ||
                        (client.legal_name && client.legal_name.toLowerCase().includes(fallbackClientName.toLowerCase()))
                    )) return true;

                    const settings = client.client_company_settings || [];
                    if (settings.length === 0) return true;
                    
                    if (empresaId) {
                        const targetSetting = settings.find((s: any) => s.empresa_id === empresaId);
                        if (targetSetting) {
                            return targetSetting.status === 'active';
                        }
                    }
                    // Se não tiver setting para a empresa selecionada ou for holding, checa se está ativo na holding ou em qualquer empresa
                    const holdingSetting = settings.find((s: any) => s.empresa_id === holdingId);
                    if (holdingSetting && holdingSetting.status === 'active') return true;

                    return settings.some((s: any) => s.status === 'active');
                })
                .map(client => {
                    const codePrefix = client.codigo ? `[${client.codigo}] ` : (client.tax_id ? `[NIF: ${client.tax_id}] ` : '');
                    const clientName = client.trade_name || client.legal_name || 'Sem Nome';
                    return {
                        id: client.id,
                        name: `${codePrefix}${clientName}`
                    };
                });

            setClientsList(mapped);
            return mapped;
        } catch (err) {
            console.error("Erro ao carregar lista de clientes:", err);
            return [];
        }
    };

    useEffect(() => {
        loadClients(selectedEmpresaId);
    }, [selectedEmpresaId]);

    useEffect(() => {
        if (selectedEmpresaId) {
            loadContracts();
            loadDocRequests();
            loadWorkers();
        }
    }, [selectedEmpresaId]);

    useEffect(() => {
        if (requestDialogOpen && selectedEmpresaId) {
            loadWorkers();
        }
    }, [requestDialogOpen, selectedEmpresaId]);

    useEffect(() => {
        if (generateDialogOpen) {
            if (!selectedContractType) {
                setSelectedContractType('contrato_termo_incerto');
            }
            if (!selectedContratante) {
                setSelectedContratante(resolveContratanteOption(activeEmpresaId || selectedEmpresaId));
            }
            if (workersList.length === 0) {
                loadWorkers();
            }
        }
    }, [generateDialogOpen, selectedEmpresaId, activeEmpresaId]);

    useEffect(() => {
        if (previewBlob && previewContainerRef.current) {
            console.log("Renderizando visualização prévia do contrato gerado...");
            previewContainerRef.current.innerHTML = "";
            renderAsync(previewBlob, previewContainerRef.current, undefined, {
                className: "docx",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                breakPages: true,
                experimental: true,
                useBase64URL: true,
                renderHeaders: true,
                renderFooters: true,
                ignoreLastRenderedPageBreak: true,
            })
            .then(() => {
                if (previewContainerRef.current?.parentElement) {
                    previewContainerRef.current.parentElement.scrollTop = 0;
                }
            })
            .catch(err => {
                console.error("Erro ao renderizar pré-visualização:", err);
            });
        }
    }, [previewBlob]);

    useEffect(() => {
        if (rescisaoPreviewBlob && rescisaoPreviewRef.current) {
            rescisaoPreviewRef.current.innerHTML = "";
            renderAsync(rescisaoPreviewBlob, rescisaoPreviewRef.current, undefined, {
                className: "docx",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                breakPages: true,
                experimental: true,
                useBase64URL: true,
                renderHeaders: true,
                renderFooters: true,
                ignoreLastRenderedPageBreak: true,
            })
            .then(() => {
                if (rescisaoPreviewRef.current?.parentElement) {
                    rescisaoPreviewRef.current.parentElement.scrollTop = 0;
                }
            })
            .catch(err => {
                console.error("Erro ao renderizar pré-visualização da carta de rescisão:", err);
            });
        }
    }, [rescisaoPreviewBlob]);

    const handleOpenRescisaoDialog = (prefillWorkerId?: string, prefillContratante?: string) => {
        const today = todayIsoStr();
        setRescisaoSuccess(null);
        setRescisaoPreviewBlob(null);
        setRescisaoRequestDate(today);
        setRescisaoStartDate(today);
        setRescisaoEndDate(addDaysToIso(today, 15));
        setRescisaoWorkerId(prefillWorkerId || null);
        setRescisaoAssignmentId(null);
        setRescisaoPasaporte('');
        setRescisaoNif('');
        setRescisaoNiss('');
        setRescisaoWorkerPhone('');
        setRescisaoWorkerEmail('');
        setRescisaoWorkerName('');
        setRescisaoWorkerDetails(null);
        setRescisaoContratante(prefillContratante || resolveContratanteOption(activeEmpresaId || selectedEmpresaId));
        setRescisaoDialogOpen(true);
        loadWorkers();
        if (prefillWorkerId) {
            handleSelectRescisaoWorker(prefillWorkerId);
        }
    };

    const handleSelectRescisaoWorker = async (workerId: string | null) => {
        setRescisaoWorkerId(workerId);
        if (!workerId) {
            setRescisaoPasaporte('');
            setRescisaoNif('');
            setRescisaoNiss('');
            setRescisaoWorkerPhone('');
            setRescisaoWorkerEmail('');
            setRescisaoWorkerName('');
            setRescisaoWorkerDetails(null);
            return;
        }

        // 1. Preenchimento imediato a partir do cache em memória (se já carregado por search_workers)
        const cached = workersCacheRef.current.get(workerId);
        if (cached) {
            setRescisaoWorkerName(cached.nome || '');
            setRescisaoPasaporte(cached.pasaporte || cached.dni || cached.nie || '');
            setRescisaoNif(cached.nif || '');
            setRescisaoNiss(cached.niss || '');
            setRescisaoWorkerPhone(cached.movil || '');
            setRescisaoWorkerEmail(cached.email || '');
            setRescisaoWorkerDetails({
                cod_colab: cached.cod_colab || '',
                funcion: cached.funcion || '',
                cliente: cached.cliente || '',
                contratante: cached.contratante || '',
                status_trabajador: cached.status_trabajador || '',
                status_seguridad: cached.status_seguridad || '',
                dni: cached.dni || '',
                nie: cached.nie || '',
            });
            if (cached.contratante) {
                setRescisaoContratante(resolveContratanteOption(cached.contratante));
            }
        }

        // 2. Busca completa no banco (core_personal.workers + public.colaboradores + document_requests)
        try {
            setLoadingRescisaoWorker(true);
            const { data: w, error: wErr } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('*')
                .eq('id', workerId)
                .maybeSingle();

            if (wErr) {
                console.error("Erro ao consultar core_personal.workers:", wErr);
            }

            const codColab = w?.cod_colab || cached?.cod_colab;

            const [colabRes, docReqRes, waRes] = await Promise.all([
                codColab
                    ? supabase
                          .schema('public')
                          .from('colaboradores')
                          .select('cod_colab, nombre, pasaporte, nif, niss, dni, nie, movil, email, contratante, funcion')
                          .eq('cod_colab', codColab)
                          .maybeSingle()
                    : Promise.resolve({ data: null }),
                supabase
                    .schema('core_personal')
                    .from('document_requests')
                    .select('empresa_id, extracted_data')
                    .eq('worker_id', workerId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select('id, empresa_id')
                    .eq('worker_id', workerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            const colab = colabRes?.data as any;
            const ed = (docReqRes?.data as any)?.extracted_data || {};
            const wa = waRes?.data as any;

            const finalName = w?.nome || colab?.nombre || ed?.nome || cached?.nome || '';
            const finalPasaporte = w?.pasaporte || colab?.pasaporte || ed?.pasaporte || w?.dni || colab?.dni || ed?.dni || w?.nie || colab?.nie || ed?.nie || cached?.pasaporte || '';
            const finalNif = w?.nif || colab?.nif || ed?.nif || cached?.nif || '';
            const finalNiss = w?.niss || colab?.niss || ed?.niss || cached?.niss || '';
            const finalPhone = w?.movil || colab?.movil || ed?.movil || ed?.telefono || cached?.movil || '';
            const finalEmail = w?.email || colab?.email || ed?.email || cached?.email || '';
            const finalContratanteRaw = w?.contratante || colab?.contratante || wa?.empresa_id || (docReqRes?.data as any)?.empresa_id || cached?.contratante || '';

            setRescisaoWorkerName(finalName);
            setRescisaoPasaporte(finalPasaporte);
            setRescisaoNif(finalNif);
            setRescisaoNiss(finalNiss);
            setRescisaoWorkerPhone(finalPhone);
            setRescisaoWorkerEmail(finalEmail);
            setRescisaoWorkerDetails({
                cod_colab: codColab || '',
                funcion: w?.funcion || colab?.funcion || cached?.funcion || '',
                cliente: w?.cliente || cached?.cliente || '',
                contratante: w?.contratante || colab?.contratante || cached?.contratante || '',
                status_trabajador: w?.status_trabajador || cached?.status_trabajador || '',
                status_seguridad: w?.status_seguridad || cached?.status_seguridad || '',
                dni: w?.dni || colab?.dni || ed?.dni || '',
                nie: w?.nie || colab?.nie || ed?.nie || '',
            });

            if (wa?.id) {
                setRescisaoAssignmentId(wa.id);
            }
            if (finalContratanteRaw) {
                setRescisaoContratante(resolveContratanteOption(finalContratanteRaw));
            }
        } catch (err) {
            console.error("Erro ao carregar dados completos do trabalhador para rescisão:", err);
        } finally {
            setLoadingRescisaoWorker(false);
        }
    };

    const handleGenerateRescisao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rescisaoWorkerId || !rescisaoContratante) {
            toast.error("Por favor, selecione o trabalhador e a empresa contratante.");
            return;
        }
        if (!rescisaoRequestDate || !rescisaoStartDate || !rescisaoEndDate) {
            toast.error("Por favor, preencha as datas da solicitação e do período de aviso prévio.");
            return;
        }

        try {
            setGeneratingRescisao(true);
            setRescisaoPreviewBlob(null);
            const res = await generateContract({
                worker_id: rescisaoWorkerId,
                assignment_id: rescisaoAssignmentId || undefined,
                contratante: rescisaoContratante,
                contract_type: 'rescisao',
                empresa_id: selectedEmpresaId || undefined,
                request_date: rescisaoRequestDate,
                notice_start_date: rescisaoStartDate,
                notice_end_date: rescisaoEndDate,
                effective_date: rescisaoStartDate,
                worker_updates: {
                    pasaporte: rescisaoPasaporte,
                    nif: rescisaoNif,
                    niss: rescisaoNiss,
                },
            });

            setRescisaoSuccess({
                signingLink: res.signing_link,
                otpCode: res.otp_code,
                emailSent: res.email_sent,
                documentUrl: res.document_url,
            });

            toast.success("Carta de Rescisão gerada e pronta para assinatura eletrônica!");
            loadContracts();

            if (res.document_url) {
                setLoadingRescisaoPreview(true);
                try {
                    const { data: signedData, error: signedErr } = await supabase.storage
                        .from('worker-contracts')
                        .createSignedUrl(res.document_url, 300);
                    if (signedErr || !signedData?.signedUrl) throw signedErr || new Error("Sem URL assinada");
                    const fileRes = await fetch(signedData.signedUrl);
                    const fileData = await fileRes.blob();
                    setRescisaoPreviewBlob(fileData);
                } catch {
                    try {
                        const { data: fileData } = await supabase.storage
                            .from('worker-contracts')
                            .download(res.document_url);
                        if (fileData) setRescisaoPreviewBlob(fileData);
                    } catch (err2) {
                        console.error("Erro ao baixar preview da rescisão:", err2);
                    }
                } finally {
                    setLoadingRescisaoPreview(false);
                }
            }
        } catch (err: any) {
            console.error("Erro ao gerar Carta de Rescisão:", err);
            toast.error(err.message || "Erro ao gerar Carta de Rescisão.");
        } finally {
            setGeneratingRescisao(false);
        }
    };

    // 4. Submeter geração de contrato
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkerId || !selectedContratante || !selectedContractType) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        try {
            setGenerating(true);
            setPreviewBlob(null);
            const res = await generateContract({
                worker_id: selectedWorkerId,
                assignment_id: selectedAssignmentId || undefined,
                contratante: selectedContratante,
                contract_type: selectedContractType,
                empresa_id: selectedEmpresaId || undefined,
            });

            setGenerationSuccess({
                signingLink: res.signing_link,
                otpCode: res.otp_code,
                emailSent: res.email_sent,
                contractType: selectedContractType,
                documentUrl: res.document_url
            });
            
            toast.success(selectedContractType === 'contrato_alta' ? "Contrato de alta emitido!" : "Contrato emitido e pronto para assinatura!");
            loadContracts();

            // Baixar o arquivo para visualização prévia
            if (res.document_url) {
                setLoadingPreview(true);
                try {
                    console.log("Obtendo link assinado para preview:", res.document_url);
                    const { data: signedData, error: signedErr } = await supabase.storage
                        .from('worker-contracts')
                        .createSignedUrl(res.document_url, 300);
                    
                    if (signedErr) throw signedErr;
                    if (!signedData?.signedUrl) throw new Error("Link assinado não retornado.");

                    console.log("Baixando blob do link assinado...");
                    const fileRes = await fetch(signedData.signedUrl);
                    if (!fileRes.ok) throw new Error(`Falha no download HTTP: ${fileRes.status}`);
                    
                    const fileData = await fileRes.blob();
                    setPreviewBlob(fileData);
                } catch (previewErr: any) {
                    console.error("Erro ao obter documento via link assinado, tentando download direto:", previewErr);
                    // Fallback para download direto
                    try {
                        const { data: fileData, error: fileErr } = await supabase.storage
                            .from('worker-contracts')
                            .download(res.document_url);
                        if (fileErr) throw fileErr;
                        setPreviewBlob(fileData);
                    } catch (directErr) {
                        console.error("Erro no download direto de preview:", directErr);
                    }
                } finally {
                    setLoadingPreview(false);
                }
            }
        } catch (err: any) {
            console.error("Erro ao gerar contrato:", err);
            toast.error(err.message || "Erro interno ao tentar emitir o contrato.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadContract = async (contract: Contract) => {
        const path = contract.signed_document_url || contract.document_url;
        if (!path) {
            toast.error("Documento não encontrado.");
            return;
        }
        try {
            const { data, error } = await supabase.storage
                .from('worker-contracts')
                .createSignedUrl(path, 3600);
            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            console.error("Erro ao baixar documento:", err);
            toast.error("Erro ao gerar link de download do documento.");
        }
    };

    const handleAttachContractToWorkerProfile = async (contract: Contract) => {
        const rawPath = contract.signed_document_url || contract.document_url;
        if (!rawPath) {
            toast.error("Nenhum arquivo de contrato disponível para este registro.");
            return;
        }

        if (!contract.worker_id) {
            toast.error("Trabalhador não identificado neste contrato.");
            return;
        }

        try {
            const loadingToast = toast.loading("Arquivando contrato no cadastro do colaborador...");

            const isPdf = rawPath.toLowerCase().endsWith('.pdf');
            const ext = isPdf ? 'pdf' : 'docx';
            const mimeType = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            const isAlta = contract.contract_type === 'contrato_alta';
            const isRescisao = contract.contract_type === 'rescisao';
            const docType = isRescisao ? 'carta_renuncia' : isAlta ? 'contrato_alta' : 'contrato_trabalho';
            const statusPrefix = isRescisao
                ? (contract.status === 'signed' ? 'Carta de Rescisão Assinada' : 'Carta de Rescisão')
                : (contract.status === 'signed' ? 'Contrato Assinado' : isAlta ? 'Contrato de Alta' : 'Contrato de Trabalho');

            const workerName = contract.worker?.nome || 'Trabalhador';
            const fileName = `${statusPrefix} - ${workerName}.${ext}`;

            // Get file size from storage.objects in bucket worker-contracts
            let fileSize = 0;
            try {
                const cleanFolder = rawPath.includes('/') ? rawPath.substring(0, rawPath.lastIndexOf('/')) : '';
                const cleanFileName = rawPath.includes('/') ? rawPath.substring(rawPath.lastIndexOf('/') + 1) : rawPath;
                const { data: storageObj } = await supabase.storage
                    .from('worker-contracts')
                    .list(cleanFolder, { search: cleanFileName });
                fileSize = storageObj?.[0]?.metadata?.size || 0;
            } catch {
                fileSize = 0;
            }

            // Full path stored in worker_documents: worker-contracts/filePath
            const targetFilePath = rawPath.startsWith('worker-contracts/') ? rawPath : `worker-contracts/${rawPath}`;

            // Check if already in worker_documents for this worker
            const { data: existingDoc } = await supabase
                .schema('core_personal')
                .from('worker_documents')
                .select('id')
                .eq('worker_id', contract.worker_id)
                .eq('file_path', targetFilePath)
                .maybeSingle();

            if (existingDoc) {
                const { error: updateErr } = await supabase
                    .schema('core_personal')
                    .from('worker_documents')
                    .update({
                        doc_type: docType,
                        file_name: fileName,
                        file_size: fileSize,
                        mime_type: mimeType
                    })
                    .eq('id', existingDoc.id);

                if (updateErr) throw updateErr;
            } else {
                const { error: insertErr } = await supabase
                    .schema('core_personal')
                    .from('worker_documents')
                    .insert({
                        empresa_id: contract.empresa_id || selectedEmpresaId,
                        worker_id: contract.worker_id,
                        doc_type: docType,
                        file_path: targetFilePath,
                        file_name: fileName,
                        file_size: fileSize,
                        mime_type: mimeType
                    });

                if (insertErr) throw insertErr;
            }

            toast.dismiss(loadingToast);
            toast.success(`Contrato (${statusPrefix}) arquivado no cadastro de ${workerName} com sucesso!`);
        } catch (err: any) {
            console.error("Erro ao arquivar contrato no cadastro:", err);
            toast.error(`Erro ao arquivar contrato: ${err.message || 'Erro desconhecido'}`);
        }
    };

    // 5. Submeter nova solicitação de documentos
    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestWorkerId || !requestEmpresaId) {
            toast.error("Por favor, selecione a Empresa e o Trabalhador.");
            return;
        }

        try {
            setCreatingRequest(true);
            const targetClient = (requestClientId && requestClientId !== 'none') ? requestClientId : undefined;
            const res = await createDocumentRequest(requestEmpresaId, requestWorkerId, targetClient, requestStartDate || undefined);
            const link = `${window.location.origin}/enviar-documentos/${res.token}`;
            setRequestSuccessLink(link);
            toast.success("Solicitação criada com sucesso!");
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao solicitar documentos:", err);
            toast.error("Falha ao criar solicitação de documentos.");
        } finally {
            setCreatingRequest(false);
        }
    };

    // 5b. Editar Solicitação Existente
    const handleOpenEditRequest = async (req: DocumentRequest) => {
        setEditingRequest(req);
        setEditEmpresaId(req.empresa_id);

        const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
        const latestAssignment = req.worker?.assignments?.[0];

        let explicitClientId = (req as any).extracted_data?.client_id || 
                               (req as any).client?.id || 
                               activeAssignment?.client_id || 
                               (activeAssignment?.client as any)?.id || 
                               latestAssignment?.client_id || 
                               (latestAssignment?.client as any)?.id || '';

        const clientNameFallback = req.worker?.cliente || (req as any).client?.trade_name || (req as any).client?.legal_name;

        // Carrega a lista garantindo que o cliente atual desta solicitação não seja filtrado
        const loadedClients = await loadClients(req.empresa_id, explicitClientId || undefined, clientNameFallback || undefined);

        // Se ainda não tinha explicitClientId mas temos o nome do cliente, tenta bater pelo nome ou código
        if (!explicitClientId && clientNameFallback && loadedClients.length > 0) {
            const cleanFallback = clientNameFallback.toLowerCase().trim();
            const matched = loadedClients.find(c => c.name.toLowerCase().includes(cleanFallback));
            if (matched) {
                explicitClientId = matched.id;
            }
        }

        setEditClientId(explicitClientId || 'none');
        const explicitStartDate = (req as any).extracted_data?.start_date || (req as any).worker?.assignments?.[0]?.start_date || (req as any).worker?.assignments?.[0]?.planned_start_date || '';
        setEditStartDate(explicitStartDate);
        setEditDialogOpen(true);
    };

    const handleSaveEditRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest || !editEmpresaId) {
            toast.error("Por favor, selecione a Empresa.");
            return;
        }

        try {
            setUpdatingRequest(true);
            const targetClient = (editClientId && editClientId !== 'none') ? editClientId : undefined;
            await updateDocumentRequest(editingRequest.id, editEmpresaId, targetClient, editStartDate || undefined);
            toast.success("Solicitação atualizada com sucesso!");
            setEditDialogOpen(false);
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao atualizar solicitação:", err);
            toast.error("Falha ao atualizar solicitação de documentos.");
        } finally {
            setUpdatingRequest(false);
        }
    };

    // 5c. Excluir Solicitação
    const handleDeleteRequest = async (reqId: string, workerName?: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir a solicitação de documentos de ${workerName || 'este trabalhador'}?`)) {
            return;
        }

        try {
            await deleteDocumentRequest(reqId);
            toast.success("Solicitação excluída com sucesso!");
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao excluir solicitação:", err);
            toast.error("Falha ao excluir solicitação.");
        }
    };

    // 6. Abrir verificação lado a lado de documentos
    const handleOpenVerify = (req: DocumentRequest) => {
        setSelectedRequest(req);
        const data = req.extracted_data || {};
        const rawBirthDate = data.fecha_nacimiento || req.worker?.fecha_nacimiento || '';
        const normalizedBirthDate = parseDateToInput(rawBirthDate);

        setVerifyFormData({
            nome: data.nome || req.worker?.nome || '',
            email: data.email || req.worker?.email || '',
            movil: data.movil || (data as any).telefono || req.worker?.movil || '',
            direccion_actual: data.direccion_actual || req.worker?.address_line || '',
            morada_contrato: data.morada_contrato || req.worker?.morada_contrato || '',
            ubicacion_actual: data.ubicacion_actual || req.worker?.location || '',
            contacto_emergencia_nombre: data.contacto_emergencia_nombre || '',
            contacto_emergencia_parentesco: data.contacto_emergencia_parentesco || '',
            contacto_emergencia_telefono: data.contacto_emergencia_telefono || '',
            talla_camisa: data.talla_camisa || (req.worker as any)?.camiseta || '',
            talla_pantalon: data.talla_pantalon || (req.worker as any)?.pantalones || '',
            banco: data.banco || '',
            iban: data.iban || req.worker?.iban || '',
            nif: data.nif || req.worker?.nif || '',
            niss: data.niss || req.worker?.niss || '',
            nie: data.nie || req.worker?.nie || '',
            dni: data.dni || req.worker?.dni || '',
            pasaporte: data.pasaporte || req.worker?.pasaporte || '',
            licencia_conducir: data.licencia_conducir || req.worker?.licencia_conducir || '',
            nacionalidade: data.nacionalidade || req.worker?.nacionalidade || '',
            fecha_nacimiento: normalizedBirthDate
        });
        setActiveDocTab('identity');
        setSelectedAttachDocType('passaporte');
        setVerifyDialogOpen(true);
    };

    const handleSaveDocToWorkerProfile = async () => {
        if (!selectedRequest || !selectedRequest.worker_id) {
            toast.error("Trabalhador não identificado.");
            return;
        }

        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'nif') path = selectedRequest.nif_url || '';
        else if (activeDocTab === 'niss') path = selectedRequest.niss_url || '';
        else if (activeDocTab === 'license') path = selectedRequest.license_url || '';
        else if (activeDocTab === 'iban') path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || '';
        else if (activeDocTab === 'selfie') path = selectedRequest.selfie_url || '';

        if (!path) {
            toast.error("Nenhum arquivo enviado para esta aba de documento.");
            return;
        }

        try {
            setSavingAttachDoc(true);

            const docTypeLabelMap: Record<string, string> = {
                foto: 'Foto do Trabalhador',
                passaporte: 'Passaporte',
                identificacao: 'Doc. Identificação Genérica',
                nif: 'NIF',
                niss: 'NISS',
                permision_conducir: 'Permissão de Condução',
                certificado_banco: 'Cert. Titularidade Banco',
                autorizacao_banco: 'Autorização Conta Banco',
                contrato_trabalho: 'Contrato de Trabalho',
                contrato_alta: 'Contrato de Alta',
                doc_alta_seguridade: 'Doc Alta Seguridade',
                doc_baixa_seguridade: 'Doc Baixa Seguridade',
                doc_anulacao_alta: 'Anulação de Alta',
                carta_renuncia: 'Carta de Renuncia',
                carta_laboral: 'Carta Laboral',
                prova_vida: 'Prova de Vida',
                nomina: 'Recibo de Vencimento',
                a1: 'Certificado A1',
                apto_medico: 'Apto Médico',
                prl_certificate: 'Certificado PRL',
                epi_recibo: 'Recibo de EPIs',
                outros: 'Documento'
            };

            const docLabel = docTypeLabelMap[selectedAttachDocType] || 'Documento';
            const workerName = selectedRequest.worker?.nome || verifyFormData.nome || 'Trabalhador';
            const ext = path.split('.').pop() || 'jpg';
            const fileName = `${docLabel} - ${workerName}.${ext}`;

            // Try to fetch file size from storage.objects
            let fileSize = 0;
            try {
                const cleanFolder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
                const cleanFileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
                const { data: storageObj } = await supabase.storage
                    .from('worker-incoming-docs')
                    .list(cleanFolder, { search: cleanFileName });
                fileSize = storageObj?.[0]?.metadata?.size || 0;
            } catch {
                fileSize = 0;
            }

            const targetFilePath = `worker-incoming-docs/${path}`;

            // Insert into core_personal.worker_documents
            const { error: dbErr } = await supabase
                .schema('core_personal')
                .from('worker_documents')
                .insert({
                    empresa_id: selectedRequest.empresa_id || selectedEmpresaId,
                    worker_id: selectedRequest.worker_id,
                    doc_type: selectedAttachDocType,
                    file_path: targetFilePath,
                    file_name: fileName,
                    file_size: fileSize,
                    mime_type: ext.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg'
                });

            if (dbErr) throw dbErr;

            // If doc_type is foto, also update worker's profile photo
            if (selectedAttachDocType === 'foto') {
                await supabase
                    .schema('core_personal')
                    .from('workers')
                    .update({ foto: targetFilePath })
                    .eq('id', selectedRequest.worker_id);

                if (selectedRequest.worker?.cod_colab) {
                    try {
                        await supabase
                            .schema('public')
                            .from('colaboradores')
                            .update({
                                foto: targetFilePath,
                                foto_trabalhador: targetFilePath
                            })
                            .eq('cod_colab', selectedRequest.worker.cod_colab);
                    } catch (e) {
                        console.warn("Aviso ao atualizar foto em public.colaboradores:", e);
                    }
                }
            }

            toast.success(`Documento (${docLabel}) salvo no cadastro de ${workerName} com sucesso!`);
        } catch (err: any) {
            console.error("Erro ao salvar documento no cadastro:", err);
            toast.error(`Erro ao anexar documento: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setSavingAttachDoc(false);
        }
    };

    // 6.2 Upload / Substituição de documento diretamente da aba ativa
    const handleUploadDocForCurrentTab = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRequest) return;

        // Reset the input value so selecting the same file triggers change again
        e.target.value = '';

        try {
            setUploadingDoc(true);
            const ext = file.name.split('.').pop() || 'jpg';
            const cleanExt = ext.toLowerCase();
            const tokenFolder = selectedRequest.token || selectedRequest.id;
            const targetFilePath = `${tokenFolder}/${activeDocTab}_${Date.now()}.${cleanExt}`;

            toast.info(`Fazendo upload do arquivo para ${activeDocTab.toUpperCase()}...`);

            const { error: uploadError } = await supabase.storage
                .from('worker-incoming-docs')
                .upload(targetFilePath, file, {
                    upsert: true,
                    contentType: file.type || (cleanExt === 'pdf' ? 'application/pdf' : 'image/jpeg')
                });

            if (uploadError) throw uploadError;

            // Mapeamento para coluna de document_requests
            let updateColumn = '';
            if (activeDocTab === 'identity') updateColumn = 'passport_url';
            else if (activeDocTab === 'nif') updateColumn = 'nif_url';
            else if (activeDocTab === 'niss') updateColumn = 'niss_url';
            else if (activeDocTab === 'license') updateColumn = 'license_url';
            else if (activeDocTab === 'iban') updateColumn = 'iban_url';
            else if (activeDocTab === 'selfie') updateColumn = 'selfie_url';

            const updatePayload: any = {
                [updateColumn]: targetFilePath,
                updated_at: new Date().toISOString()
            };

            if (activeDocTab === 'iban') {
                updatePayload.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    iban_url: targetFilePath
                };
            }

            const { error: dbErr } = await supabase
                .schema('core_personal')
                .from('document_requests')
                .update(updatePayload)
                .eq('id', selectedRequest.id);

            if (dbErr) throw dbErr;

            // Atualizar o selectedRequest em memória
            const updatedRequest: DocumentRequest = {
                ...selectedRequest,
                [updateColumn]: targetFilePath,
                ...(activeDocTab === 'iban' ? {
                    extracted_data: {
                        ...(selectedRequest.extracted_data || {}),
                        iban_url: targetFilePath
                    }
                } : {})
            };
            setSelectedRequest(updatedRequest);

            // Atualizar lista docRequests
            setDocRequests(prev => prev.map(r => r.id === updatedRequest.id ? { ...r, ...updatedRequest } : r));

            // Gerar URL assinada imediata para visualização
            const { data: signedData } = await supabase.storage
                .from('worker-incoming-docs')
                .createSignedUrl(targetFilePath, 3600);

            if (signedData?.signedUrl) {
                setActiveDocUrl(signedData.signedUrl);
            }

            toast.success(`Arquivo de ${activeDocTab.toUpperCase()} anexado com sucesso!`);

            // Executar OCR se for documento de identificação/NIF/NISS/Carta
            if (['identity', 'nif', 'niss', 'license'].includes(activeDocTab)) {
                try {
                    toast.info("Processando leitura inteligente (OCR) do arquivo...");
                    const ocrRes = await processDocumentOcr({
                        file_path: targetFilePath,
                        mime_type: file.type || (cleanExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                        document_type: activeDocTab
                    });

                    if (ocrRes.success && ocrRes.data) {
                        const data = ocrRes.data;
                        setVerifyFormData(prev => {
                            const updated = { ...prev };
                            if (activeDocTab === 'identity') {
                                if (!updated.nome && data.nome_completo) updated.nome = data.nome_completo;
                                if (!updated.nacionalidade && data.nacionalidade) updated.nacionalidade = data.nacionalidade;
                                if (!updated.fecha_nacimiento && data.data_nascimento) updated.fecha_nacimiento = parseDateToInput(data.data_nascimento);
                                const docNum = data.numero_documento || '';
                                if (data.tipo_identificacao === 'passaporte' && !updated.pasaporte) updated.pasaporte = docNum;
                                else if (data.tipo_identificacao === 'nie' && !updated.nie) updated.nie = docNum;
                                else if (!updated.dni && !updated.pasaporte) updated.dni = docNum;
                            } else if (activeDocTab === 'nif' && !updated.nif && data.nif) {
                                updated.nif = data.nif;
                            } else if (activeDocTab === 'niss' && !updated.niss && data.niss) {
                                updated.niss = data.niss;
                            } else if (activeDocTab === 'license' && !updated.licencia_conducir && data.licencia_conducir) {
                                updated.licencia_conducir = data.licencia_conducir;
                            }
                            return updated;
                        });
                        toast.success("Dados cadastrais pré-preenchidos com a leitura do documento!");
                    }
                } catch (ocrErr: any) {
                    console.warn("OCR não executado ou falhou:", ocrErr);
                }
            }
        } catch (err: any) {
            console.error("Erro no upload do arquivo:", err);
            toast.error(`Falha no upload do arquivo: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setUploadingDoc(false);
        }
    };

    // 6.7. Recusar / Eliminar documento da aba atual
    const handleRejectCurrentDoc = async () => {
        if (!selectedRequest) return;

        let path = '';
        let updateColumn = '';
        let tabLabel = '';

        if (activeDocTab === 'identity') { path = selectedRequest.passport_url || ''; updateColumn = 'passport_url'; tabLabel = 'Identificação'; }
        else if (activeDocTab === 'nif') { path = selectedRequest.nif_url || ''; updateColumn = 'nif_url'; tabLabel = 'NIF'; }
        else if (activeDocTab === 'niss') { path = selectedRequest.niss_url || ''; updateColumn = 'niss_url'; tabLabel = 'NISS'; }
        else if (activeDocTab === 'license') { path = selectedRequest.license_url || ''; updateColumn = 'license_url'; tabLabel = 'Carta de Condução'; }
        else if (activeDocTab === 'iban') { path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || ''; updateColumn = 'iban_url'; tabLabel = 'IBAN'; }
        else if (activeDocTab === 'selfie') { path = selectedRequest.selfie_url || ''; updateColumn = 'selfie_url'; tabLabel = 'Selfie'; }

        if (!path && !activeDocUrl) {
            toast.error("Não há arquivo nesta aba para recusar/eliminar.");
            return;
        }

        const confirmed = window.confirm(
            `Tem certeza que deseja RECUSAR e ELIMINAR o documento da aba "${tabLabel}"?\n\nO arquivo atual será removido para que você possa anexar o documento correto.`
        );
        if (!confirmed) return;

        setRejectingDoc(true);
        try {
            const reqUpdatePayload: any = {
                [updateColumn]: null
            };
            if (activeDocTab === 'iban') {
                reqUpdatePayload.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    iban_url: null
                };
            }

            const { error: updateErr } = await supabase
                .schema('core_personal')
                .from('document_requests')
                .update(reqUpdatePayload)
                .eq('id', selectedRequest.id);

            if (updateErr) throw updateErr;

            // Se o documento também já tinha sido anexado na ficha do trabalhador (worker_documents), remover de lá
            if (selectedRequest.worker_id && path) {
                const fullStoragePath = `worker-incoming-docs/${path}`;
                await supabase
                    .schema('core_personal')
                    .from('worker_documents')
                    .delete()
                    .eq('worker_id', selectedRequest.worker_id)
                    .in('file_path', [fullStoragePath, path]);

                if (activeDocTab === 'selfie') {
                    await supabase
                        .schema('core_personal')
                        .from('workers')
                        .update({ foto: null })
                        .eq('id', selectedRequest.worker_id)
                        .eq('foto', fullStoragePath);
                }
            }

            // Tentar remover do Storage para limpar espaço
            if (path) {
                await supabase.storage
                    .from('worker-incoming-docs')
                    .remove([path]);
            }

            const updatedReq: any = {
                ...selectedRequest,
                [updateColumn]: null
            };
            if (activeDocTab === 'iban') {
                updatedReq.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    iban_url: null
                };
            }

            setSelectedRequest(updatedReq);
            setDocRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedReq : r));
            setActiveDocUrl(null);

            toast.success(`Documento de ${tabLabel} recusado e eliminado! Agora você pode carregar o arquivo correto.`);
        } catch (err: any) {
            console.error("Erro ao recusar/eliminar documento:", err);
            toast.error(`Erro ao eliminar documento: ${err.message || 'Falha desconhecida'}`);
        } finally {
            setRejectingDoc(false);
        }
    };

    // 7. Obter URL temporária assinada para visualizar a imagem enviada
    useEffect(() => {
        if (!selectedRequest) return;
        
        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'nif') path = selectedRequest.nif_url || '';
        else if (activeDocTab === 'niss') path = selectedRequest.niss_url || '';
        else if (activeDocTab === 'license') path = selectedRequest.license_url || '';
        else if (activeDocTab === 'iban') path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || '';
        else if (activeDocTab === 'selfie') path = selectedRequest.selfie_url || '';

        if (!path) {
            setActiveDocUrl(null);
            return;
        }

        async function getSigned() {
            try {
                const { data, error } = await supabase.storage
                    .from('worker-incoming-docs')
                    .createSignedUrl(path, 3600);
                
                if (error) throw error;
                setActiveDocUrl(data?.signedUrl || null);
            } catch (err) {
                console.error("Erro ao gerar URL assinada:", err);
                setActiveDocUrl(null);
            }
        }
        getSigned();
    }, [selectedRequest, activeDocTab]);

    // Funções para download individual e em lote dos documentos enviados pelo trabalhador
    const handleDownloadCurrentDoc = async () => {
        if (!selectedRequest) return;
        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'nif') path = selectedRequest.nif_url || '';
        else if (activeDocTab === 'niss') path = selectedRequest.niss_url || '';
        else if (activeDocTab === 'license') path = selectedRequest.license_url || '';
        else if (activeDocTab === 'iban') path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || '';
        else if (activeDocTab === 'selfie') path = selectedRequest.selfie_url || '';

        if (!path) {
            toast.error("Nenhum arquivo enviado nesta aba de documento.");
            return;
        }

        const workerName = selectedRequest.worker?.nome || 'Trabalhador';
        try {
            const { data, error } = await supabase.storage
                .from('worker-incoming-docs')
                .createSignedUrl(path, 60, { download: true });

            if (error || !data?.signedUrl) throw error;

            const ext = path.split('.').pop() || 'file';
            const a = document.createElement('a');
            a.href = data.signedUrl;
            a.download = `${workerName}_${activeDocTab}.${ext}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Download do documento (${activeDocTab.toUpperCase()}) iniciado!`);
        } catch (err: any) {
            console.error("Erro ao baixar documento:", err);
            toast.error("Falha ao baixar o documento.");
        }
    };

    const handleDownloadAllDocs = async () => {
        if (!selectedRequest) return;
        const workerName = selectedRequest.worker?.nome || 'Trabalhador';
        const docs = [
            { label: 'Identificacao_Passaporte', path: selectedRequest.passport_url },
            { label: 'NIF', path: selectedRequest.nif_url },
            { label: 'NISS', path: selectedRequest.niss_url },
            { label: 'Carta_Conducao', path: selectedRequest.license_url },
            { label: 'Comprovativo_IBAN', path: selectedRequest.iban_url || selectedRequest.extracted_data?.iban_url },
            { label: 'Selfie', path: selectedRequest.selfie_url },
        ].filter(d => Boolean(d.path));

        if (docs.length === 0) {
            toast.error("Nenhum documento anexado para download.");
            return;
        }

        toast.info(`Iniciando download de ${docs.length} documentos de ${workerName}...`);
        for (const doc of docs) {
            try {
                const { data } = await supabase.storage
                    .from('worker-incoming-docs')
                    .createSignedUrl(doc.path!, 60, { download: true });

                if (data?.signedUrl) {
                    const ext = doc.path!.split('.').pop() || 'file';
                    const a = document.createElement('a');
                    a.href = data.signedUrl;
                    a.download = `${workerName}_${doc.label}.${ext}`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            } catch (err) {
                console.error(`Erro ao baixar ${doc.label}:`, err);
            }
        }
    };

    // 8. Salvar aprovação de cadastro
    const handleApproveVerify = async (e?: React.FormEvent, thenGenerateContract: boolean = false) => {
        if (e) e.preventDefault();
        if (!selectedRequest) return;

        try {
            setVerifying(true);
            
            // Montar notas consolidadas de contatos de emergência e uniformes se houver
            let emergencyNotes = '';
            if (verifyFormData.contacto_emergencia_nombre || verifyFormData.contacto_emergencia_telefono) {
                emergencyNotes += `Contacto Emergência: ${verifyFormData.contacto_emergencia_nombre} (${verifyFormData.contacto_emergencia_parentesco || 'Familiar'}) - Tel: ${verifyFormData.contacto_emergencia_telefono}`;
            }
            if (verifyFormData.talla_camisa || verifyFormData.talla_pantalon) {
                if (emergencyNotes) emergencyNotes += ' | ';
                emergencyNotes += `Uniformes - Camisa: ${verifyFormData.talla_camisa || '-'}, Calça: ${verifyFormData.talla_pantalon || '-'}`;
            }

            const cleanBirthDate = parseDateToInput(verifyFormData.fecha_nacimiento) || verifyFormData.fecha_nacimiento;

            // Selfie URL passa a ser a foto oficial do trabalhador se presente
            const approvedPayload = {
                nome: verifyFormData.nome,
                email: verifyFormData.email || undefined,
                movil: verifyFormData.movil || undefined,
                location: verifyFormData.ubicacion_actual || undefined,
                address_line: verifyFormData.direccion_actual || undefined,
                morada_contrato: verifyFormData.morada_contrato || undefined,
                notes: emergencyNotes || undefined,
                iban: verifyFormData.iban || undefined,
                nif: verifyFormData.nif || undefined,
                niss: verifyFormData.niss || undefined,
                nie: verifyFormData.nie || undefined,
                dni: verifyFormData.dni || undefined,
                pasaporte: verifyFormData.pasaporte || undefined,
                licencia_conducir: verifyFormData.licencia_conducir || undefined,
                nacionalidade: verifyFormData.nacionalidade || undefined,
                fecha_nacimiento: cleanBirthDate || undefined,
                camiseta: verifyFormData.talla_camisa || undefined,
                pantalones: verifyFormData.talla_pantalon || undefined,
                foto: selectedRequest.selfie_url 
                    ? (selectedRequest.selfie_url.startsWith('worker-incoming-docs/') 
                        ? selectedRequest.selfie_url 
                        : `worker-incoming-docs/${selectedRequest.selfie_url.replace(/^\/+/, '')}`) 
                    : undefined
            };

            const updatedFormData = {
                ...verifyFormData,
                fecha_nacimiento: cleanBirthDate
            };

            await approveDocumentRequest(selectedRequest.id, selectedRequest.worker_id, approvedPayload, updatedFormData);
            toast.success("Documentação validada e cadastro atualizado com sucesso!");
            setVerifyDialogOpen(false);
            loadDocRequests();
            if (selectedTaskForWorkers) {
                loadTaskWorkers(selectedTaskForWorkers);
            }

            if (thenGenerateContract) {
                handleTriggerGenerate(selectedRequest.worker_id, selectedRequest.empresa_id, selectedRequest.worker || { nome: verifyFormData.nome });
            }
        } catch (err: any) {
            console.error("Erro ao aprovar documentos:", err);
            toast.error(`Erro ao salvar validação de documentos: ${err?.message || 'Falha ao salvar'}`);
        } finally {
            setVerifying(false);
        }
    };

    // 8.4 Abrir modal de gerar contrato pelo botão geral
    const handleOpenGenerateDialog = () => {
        setGenerationSuccess(null);
        setPreviewBlob(null);
        setSelectedWorkerId(null);
        setSelectedAssignmentId(null);
        
        // Pré-seleciona contratante com base na empresa ativa
        const defaultContratante = resolveContratanteOption(activeEmpresaId || selectedEmpresaId);
        setSelectedContratante(defaultContratante);
        setSelectedContractType('contrato_termo_incerto');
        
        setGenerateDialogOpen(true);
        loadWorkers();
    };

    // 8.5 Trigger para abrir modal de gerar contrato a partir de uma solicitação validada
    const handleTriggerGenerate = (workerId: string, empresaId: string, workerObj?: any) => {
        // 1. Limpar estados de sucesso e pré-visualização e definir worker
        setGenerationSuccess(null);
        setPreviewBlob(null);
        setSelectedWorkerId(workerId);
        
        // 2. Mapear empresaId para selectedContratante com função robusta
        const contratanteName = resolveContratanteOption(empresaId || activeEmpresaId || selectedEmpresaId);
        setSelectedContratante(contratanteName);
        
        // 3. Pré-definir modelo de contrato padrão
        setSelectedContractType('contrato_termo_incerto');

        // 4. Se tiver workerObj, injeta imediatamente na workersList
        if (workerObj && workerObj.nome) {
            const workerLabel = `${workerObj.nome} (${workerObj.cod_colab || 'Sem Cód.'})`;
            setWorkersList(prev => {
                if (prev.some(w => w.value === workerId)) return prev;
                return [{ value: workerId, label: workerLabel }, ...prev];
            });
        }

        // 5. Abre o Dialog INSTANTANEAMENTE na tela sem travar
        setGenerateDialogOpen(true);

        // 6. Carrega alocações e lista completa em segundo plano
        (async () => {
            try {
                const { data: wa } = await supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select('id, client_id')
                    .eq('worker_id', workerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (wa) {
                    setSelectedAssignmentId(wa.id);
                }
            } catch (e) {
                console.error("Erro ao buscar alocação do trabalhador:", e);
            }

            try {
                await loadWorkersForEmpresa(empresaId || selectedEmpresaId || activeEmpresaId, workerId);
            } catch (e) {
                console.error("Erro ao carregar lista de trabalhadores:", e);
            }
        })();
    };

    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success("Link copiado para a área de transferência!");
    };

    const handleCopyInviteLink = (link: string, workerName?: string) => {
        const greeting = workerName ? `Hola ${workerName}` : 'Hola';
        const msg = `${greeting} 
A continuación se compartirá un link, donde proporcionarás la documentación e información requerida para poder continuar con el proceso de gestión de contrato.
 
*LINK: ${link}
 
Muchas gracias.`;
        navigator.clipboard.writeText(msg);
        toast.success("Mensagem padrão com o link copiada!");
    };

    const handleCopyContractSignLink = (link: string, workerName?: string, otpCode?: string) => {
        const nameText = workerName ? `Sr. ${workerName}` : 'Sr.';
        const codeText = otpCode ? `*${otpCode}*` : '';
        const msg = `Hola ${nameText}
Adjunto encontrará un link para firmar el contrato, por favor revise el mismo y al final le mostrará opción "IR PARA FIRMAR CONTRATO", firme el contrato y se le solicitará este código único ${codeText} digítelo para confirmar y finalizar el proceso.
*LINK* ${link}
Muchas gracias.`;
        navigator.clipboard.writeText(msg);
        toast.success("Mensagem padrão do contrato copiada!");
    };

    const buildRescisaoMessage = (link: string, workerName?: string, otpCode?: string, startIso?: string, endIso?: string) => {
        const nameText = workerName ? `Sr(a). ${workerName}` : 'Colaborador(a)';
        const codeText = otpCode ? `*${otpCode}*` : '';
        const periodText = startIso && endIso ? ` (período de preaviso del ${formatIsoToBr(startIso)} al ${formatIsoToBr(endIso)})` : '';
        return `Hola ${nameText}
Adjunto encontrará el enlace para revisar y firmar electrónicamente su Solicitud de Rescisión de Contrato de Trabajo${periodText}.
Por favor revise el documento, pulse en "Assinar Documento" y digite este código único ${codeText} para confirmar y finalizar el proceso.
*LINK:* ${link}
Muchas gracias.`;
    };

    const handleCopyRescisaoSignLink = (link: string, workerName?: string, otpCode?: string, startIso?: string, endIso?: string) => {
        const msg = buildRescisaoMessage(link, workerName, otpCode, startIso, endIso);
        navigator.clipboard.writeText(msg);
        toast.success("Mensagem de assinatura da Carta de Rescisão copiada!");
    };

    const handleSendRescisaoWhatsApp = (link: string, workerName?: string, phone?: string, otpCode?: string, startIso?: string, endIso?: string) => {
        const msg = buildRescisaoMessage(link, workerName, otpCode, startIso, endIso);
        navigator.clipboard.writeText(msg).catch(() => {});
        const cleanPhone = (phone || '').replace(/\D/g, '');
        const whatsappUrl = cleanPhone
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleOpenCreateManualNotice = () => {
        const today = todayIsoStr();
        const end = addDaysToIso(today, 15);
        setNoticeDialogMode('create');
        setEditingNoticeContract(null);
        setNoticeWorkerId(null);
        setNoticeWorkerName('');
        setNoticeAssignmentId(null);
        setNoticeContratante(resolveContratanteOption(activeEmpresaId || selectedEmpresaId));
        setNoticeWorkStartDate('');
        setNoticeRequestDate(today);
        setNoticeStartDate(today);
        setNoticeEndDate(end);
        setNoticeMonthWorkedDays(String(computeDefaultMonthWorkedDays(null, today, null, today)));
        setNoticePenaltyTotal('460');
        setNoticeStatus('in_progress');
        setNoticeStopDate('');
        setNoticeFulfilledDaysOverride('');
        setNoticeApplyDeduction(true);
        setNoticeSignedManually(true);
        setNoticeNotes('');
        setNoticeDialogOpen(true);
        loadWorkers();
    };

    const handleSelectManualNoticeWorker = async (workerId: string | null) => {
        setNoticeWorkerId(workerId);
        if (!workerId) {
            setNoticeWorkerName('');
            setNoticeWorkStartDate('');
            return;
        }
        const cached = workersCacheRef.current.get(workerId);
        if (cached) {
            setNoticeWorkerName(cached.nome || '');
            if (cached.contratante) {
                setNoticeContratante(resolveContratanteOption(cached.contratante));
            }
        }
        try {
            const [{ data: w }, { data: wa }] = await Promise.all([
                supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, nome, contratante, data_ingresso, data_alta_seguridad')
                    .eq('id', workerId)
                    .maybeSingle(),
                supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select('id, empresa_id, start_date, planned_start_date')
                    .eq('worker_id', workerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            if (w?.nome) setNoticeWorkerName(w.nome);
            if (wa?.id) setNoticeAssignmentId(wa.id);
            const rawContratante = w?.contratante || wa?.empresa_id || cached?.contratante;
            if (rawContratante) {
                setNoticeContratante(resolveContratanteOption(rawContratante));
            }
            const admissionDate = (w?.data_ingresso || w?.data_alta_seguridad || wa?.start_date || wa?.planned_start_date || '').substring(0, 10);
            setNoticeWorkStartDate(admissionDate);
            const defaultWorked = computeDefaultMonthWorkedDays(admissionDate || null, noticeStartDate, noticeStopDate || null, todayIsoStr());
            setNoticeMonthWorkedDays(String(defaultWorked));
        } catch (err) {
            console.error('Erro ao buscar dados do trabalhador para aviso prévio:', err);
        }
    };

    const handleOpenEditNotice = (contract: Contract, prefillStopToday: boolean = false) => {
        const today = todayIsoStr();
        const info = computeNoticeDetails(contract, today);
        setNoticeDialogMode('edit');
        setEditingNoticeContract(contract);
        setNoticeWorkerId(contract.worker_id);
        setNoticeWorkerName(contract.worker?.nome || 'Trabalhador');
        setNoticeAssignmentId(contract.assignment_id);
        setNoticeContratante(contract.contratante || 'STOCCO');
        setNoticeWorkStartDate(info.workStartDate ? info.workStartDate.substring(0, 10) : '');
        setNoticeRequestDate(info.reqDate);
        setNoticeStartDate(info.startNotice);
        setNoticeEndDate(info.endNotice);
        setNoticeMonthWorkedDays(String(info.monthWorkedDays));
        setNoticePenaltyTotal(String(info.penaltyTotal));

        if (prefillStopToday) {
            const stopIso = info.stopDate || today;
            setNoticeStatus('abandoned');
            setNoticeStopDate(stopIso);
            const autoFulfilled = Math.max(0, Math.min(info.totalNoticeDays, getDaysDiff(info.startNotice, stopIso)));
            setNoticeFulfilledDaysOverride(
                contract.metadata?.fulfilled_days_override !== undefined && contract.metadata?.fulfilled_days_override !== null
                    ? String(contract.metadata.fulfilled_days_override)
                    : String(autoFulfilled)
            );
            setNoticeApplyDeduction(true);
        } else {
            const st = contract.metadata?.notice_status === 'abandoned'
                ? 'abandoned'
                : contract.metadata?.notice_status === 'completed'
                ? 'completed'
                : 'in_progress';
            setNoticeStatus(st);
            setNoticeStopDate(info.stopDate || '');
            setNoticeFulfilledDaysOverride(
                contract.metadata?.fulfilled_days_override !== undefined && contract.metadata?.fulfilled_days_override !== null
                    ? String(contract.metadata.fulfilled_days_override)
                    : ''
            );
            setNoticeApplyDeduction(info.applyDeduction);
        }
        setNoticeNotes(info.notes);
        setNoticeDialogOpen(true);
    };

    const handleQuickToggleDeduction = async (contract: Contract) => {
        const currentApply = contract.metadata?.apply_deduction !== false;
        const nextApply = !currentApply;
        try {
            await updateContractNoticeMetadata(contract.id, {
                apply_deduction: nextApply,
            });
            toast.success(
                nextApply
                    ? `Desconto de aviso prévio ativado para ${contract.worker?.nome || 'o trabalhador'}.`
                    : `${contract.worker?.nome || 'Trabalhador'} marcado como Isento (Não Descontar).`
            );
            loadContracts();
        } catch (err: any) {
            toast.error(`Erro ao atualizar opção de desconto: ${err.message || err}`);
        }
    };

    const handleSaveNoticeModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (noticeDialogMode === 'create' && !noticeWorkerId) {
            toast.error('Selecione o trabalhador para incluir no controle de aviso prévio.');
            return;
        }
        if (!noticeStartDate || !noticeEndDate) {
            toast.error('Informe a data de início e fim do período de aviso prévio.');
            return;
        }

        const parsedPenalty = Number(String(noticePenaltyTotal).replace(',', '.'));
        const penaltyTotalVal = Number.isFinite(parsedPenalty) && parsedPenalty >= 0 ? parsedPenalty : 460;
        const parsedWorkedDays = noticeMonthWorkedDays.trim() !== '' ? Number(noticeMonthWorkedDays) : null;
        const parsedOverride = noticeFulfilledDaysOverride.trim() !== '' ? Number(noticeFulfilledDaysOverride) : null;

        const metadataPayload: NonNullable<Contract['metadata']> = {
            request_date: noticeRequestDate || noticeStartDate,
            notice_start_date: noticeStartDate,
            notice_end_date: noticeEndDate,
            effective_date: noticeStartDate,
            notice_days: 15,
            penalty_total: penaltyTotalVal,
            apply_deduction: noticeApplyDeduction,
            notice_status: noticeStatus,
            stop_date: noticeStatus === 'abandoned' ? (noticeStopDate || todayIsoStr()) : (noticeStopDate || null),
            work_start_date: noticeWorkStartDate || null,
            month_worked_days: parsedWorkedDays !== null && Number.isFinite(parsedWorkedDays) ? parsedWorkedDays : null,
            fulfilled_days_override: parsedOverride !== null && Number.isFinite(parsedOverride) ? parsedOverride : null,
            notice_notes: noticeNotes.trim() || null,
        };

        try {
            setSavingNotice(true);
            if (noticeDialogMode === 'create' && noticeWorkerId) {
                const targetEmpresaId = resolveEmpresaIdFromContratante(noticeContratante, selectedEmpresaId || activeEmpresaId);
                await createManualNoticeEntry({
                    empresa_id: targetEmpresaId,
                    worker_id: noticeWorkerId,
                    contratante: noticeContratante,
                    assignment_id: noticeAssignmentId,
                    signed_manually: noticeSignedManually,
                    metadata: metadataPayload,
                });
                toast.success('Trabalhador incluído no controle de Aviso Prévio com sucesso!');
                setRescisaoSubView('aviso_previo');
            } else if (editingNoticeContract) {
                await updateContractNoticeMetadata(editingNoticeContract.id, metadataPayload);
                toast.success('Dados do Aviso Prévio e Desconto atualizados com sucesso!');
            }
            setNoticeDialogOpen(false);
            loadContracts();
        } catch (err: any) {
            console.error('Erro ao salvar gestão de aviso prévio:', err);
            toast.error(`Erro ao salvar: ${err.message || err}`);
        } finally {
            setSavingNotice(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-115px)] overflow-hidden space-y-6 p-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            Painel de Documentos & Contratos
                        </h1>
                        <p className="text-muted-foreground">
                            Gerencie e emita contratos de trabalho com assinatura eletrônica e captura inteligente de documentos.
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Botão Solicitar Documentos */}
                        <Dialog open={requestDialogOpen} onOpenChange={(open) => {
                            setRequestDialogOpen(open);
                            if (!open) {
                                setRequestWorkerId(null);
                                setRequestSuccessLink(null);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-600/25 hover:bg-slate-50 dark:hover:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold gap-1.5">
                                    <Camera className="h-4 w-4" />
                                    Solicitar Documentos
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
                                <DialogHeader>
                                    <DialogTitle>Solicitar Documentos por Link</DialogTitle>
                                    <DialogDescription>
                                        Gere um portal exclusivo e temporário para o trabalhador tirar fotos e enviar os documentos de cadastro do próprio celular.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                {!requestSuccessLink ? (
                                    <form onSubmit={handleCreateRequest} className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Empresa (Contratante)</Label>
                                            <Select 
                                                value={requestEmpresaId} 
                                                onValueChange={(val) => {
                                                    setRequestEmpresaId(val);
                                                    setRequestWorkerId(null);
                                                    setRequestClientId('none');
                                                    loadWorkersForEmpresa(val);
                                                    loadClients(val);
                                                }}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                    <SelectValue placeholder="Selecione a empresa contratante..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dae64d51-2181-4510-b14f-e63d2f111a8e">Wiseowe Unipessoal Lda</SelectItem>
                                                    <SelectItem value="441f1f5d-aed3-40e3-8c77-7b1217757251">Stocco, Lda</SelectItem>
                                                    <SelectItem value="847796c4-b253-4e53-9e6b-34a127ec7d85">Luminous Capital Unipessoal Lda</SelectItem>
                                                    <SelectItem value="a798620a-358a-4c6c-9db2-3a507c583cac">Triângulo</SelectItem>
                                                <SelectItem value="2c944db5-f1d0-4789-a562-8cfa1c0155b7">Hexagon</SelectItem>

                                                    <SelectItem value="f5d32323-4d68-4a54-8fb8-0ba670dcaecf">Kotrik & Rosas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                         <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Cliente (Alocação / Destino)
                                            </Label>
                                            <Combobox
                                                options={[
                                                    { value: 'none', label: 'Sem Cliente Especificado' },
                                                    ...clientsList.map(cli => ({ value: cli.id, label: cli.name }))
                                                ]}
                                                value={requestClientId || 'none'}
                                                onChange={(val) => setRequestClientId(val || 'none')}
                                                placeholder="Pesquise o cliente pelo nome ou código..."
                                                emptyText="Nenhum cliente ativo encontrado."
                                                className="h-10 text-sm bg-white dark:bg-black border-slate-200 dark:border-slate-800 w-full"
                                                popoverClassName="w-[450px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Data de Início Previsto (Trabalho)</Label>
                                            <Input 
                                                type="date"
                                                value={requestStartDate}
                                                onChange={(e) => setRequestStartDate(e.target.value)}
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Selecionar Trabalhador</Label>
                                            <Combobox
                                                options={requestWorkersList.length > 0 ? requestWorkersList : workersList}
                                                value={requestWorkerId || ''}
                                                onChange={(val) => setRequestWorkerId(val || null)}
                                                placeholder="Pesquise o trabalhador cadastrado..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={creatingRequest || !requestWorkerId || !requestEmpresaId} className="bg-indigo-600 hover:bg-indigo-500">
                                                {creatingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Criar Link
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-4 pt-2">
                                        <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                <CheckCircle className="h-5 w-5" />
                                                <span>Link de Cadastro Criado!</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Copie o link seguro abaixo e envie para o trabalhador iniciar o preenchimento e captura das fotos:</p>
                                            
                                            <div className="flex gap-2">
                                                <Input readOnly value={requestSuccessLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                <Button size="icon" variant="outline" onClick={() => {
                                                     const workerObj = requestWorkersList.find(w => w.value === requestWorkerId) || workersList.find(w => w.value === requestWorkerId);
                                                     handleCopyInviteLink(requestSuccessLink, workerObj?.label);
                                                 }} title="Copiar mensagem formatada com o link">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Modal de Editar Solicitação de Documentos */}
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
                                <DialogHeader>
                                    <DialogTitle>Editar Solicitação de Documentos</DialogTitle>
                                    <DialogDescription>
                                        Altere a Empresa Contratante, o Cliente de destino e a Data de Início do trabalho para <strong>{editingRequest?.worker?.nome}</strong>.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleSaveEditRequest} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Empresa (Contratante)</Label>
                                        <Select 
                                            value={editEmpresaId} 
                                            onValueChange={(val) => {
                                                setEditEmpresaId(val);
                                                setEditClientId('none');
                                                loadClients(val);
                                            }}
                                        >
                                            <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                <SelectValue placeholder="Selecione a empresa contratante..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dae64d51-2181-4510-b14f-e63d2f111a8e">Wiseowe Unipessoal Lda</SelectItem>
                                                <SelectItem value="441f1f5d-aed3-40e3-8c77-7b1217757251">Stocco, Lda</SelectItem>
                                                <SelectItem value="847796c4-b253-4e53-9e6b-34a127ec7d85">Luminous Capital Unipessoal Lda</SelectItem>
                                                <SelectItem value="a798620a-358a-4c6c-9db2-3a507c583cac">Triângulo</SelectItem>
                                                <SelectItem value="2c944db5-f1d0-4789-a562-8cfa1c0155b7">Hexagon</SelectItem>
                                                <SelectItem value="f5d32323-4d68-4a54-8fb8-0ba670dcaecf">Kotrik & Rosas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Cliente (Alocação / Destino)
                                        </Label>
                                        <Combobox
                                            options={[
                                                { value: 'none', label: 'Sem Cliente Especificado' },
                                                ...clientsList.map(cli => ({ value: cli.id, label: cli.name }))
                                            ]}
                                            value={editClientId || 'none'}
                                            onChange={(val) => setEditClientId(val || 'none')}
                                            placeholder="Pesquise o cliente pelo nome ou código..."
                                            emptyText="Nenhum cliente ativo encontrado."
                                            className="h-10 text-sm bg-white dark:bg-black border-slate-200 dark:border-slate-800 w-full"
                                            popoverClassName="w-[450px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Data de Início Previsto (Trabalho)</Label>
                                        <Input 
                                            type="date"
                                            value={editStartDate}
                                            onChange={(e) => setEditStartDate(e.target.value)}
                                            className="bg-white dark:bg-black"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={updatingRequest || !editEmpresaId} className="bg-indigo-600 hover:bg-indigo-500">
                                            {updatingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Botão Gerar Contrato */}
                        <Dialog open={generateDialogOpen} onOpenChange={(open) => {
                            setGenerateDialogOpen(open);
                            if (!open) {
                                setSelectedWorkerId(null);
                                setSelectedAssignmentId(null);
                                setGenerationSuccess(null);
                                setPreviewBlob(null);
                            } else {
                                if (!selectedContractType) {
                                    setSelectedContractType('contrato_termo_incerto');
                                }
                                if (!selectedContratante) {
                                    setSelectedContratante(resolveContratanteOption(activeEmpresaId || selectedEmpresaId));
                                }
                            }
                        }}>
                            <Button 
                                onClick={handleOpenGenerateDialog}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Gerar Contrato
                            </Button>
                            <DialogContent className={`${generationSuccess ? 'max-w-7xl h-[85vh]' : 'max-w-md'} flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300`}>
                                <DialogHeader>
                                    <DialogTitle>Gerar Novo Contrato</DialogTitle>
                                    <DialogDescription>
                                        Selecione o trabalhador e o modelo de contrato. O sistema gerará o arquivo automaticamente com validade eIDAS.
                                    </DialogDescription>
                                </DialogHeader>

                                {!generationSuccess ? (
                                    <form onSubmit={handleGenerate} className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Selecionar Trabalhador</Label>
                                            <Combobox
                                                options={workersList}
                                                value={selectedWorkerId || ''}
                                                onChange={async (val) => {
                                                    setSelectedWorkerId(val || null);
                                                    if (val) {
                                                        try {
                                                            const { data: wa } = await supabase
                                                                .schema('core_personal')
                                                                .from('worker_assignments')
                                                                .select('id, empresa_id')
                                                                .eq('worker_id', val)
                                                                .order('created_at', { ascending: false })
                                                                .limit(1)
                                                                .maybeSingle();

                                                            if (wa) {
                                                                setSelectedAssignmentId(wa.id);
                                                                if (wa.empresa_id) {
                                                                    setSelectedContratante(resolveContratanteOption(wa.empresa_id));
                                                                }
                                                            } else {
                                                                const { data: dr } = await supabase
                                                                    .schema('core_personal')
                                                                    .from('document_requests')
                                                                    .select('empresa_id')
                                                                    .eq('worker_id', val)
                                                                    .order('created_at', { ascending: false })
                                                                    .limit(1)
                                                                    .maybeSingle();
                                                                if (dr?.empresa_id) {
                                                                    setSelectedContratante(resolveContratanteOption(dr.empresa_id));
                                                                }
                                                            }
                                                        } catch (err) {
                                                            console.error("Erro ao auto-selecionar contratante do trabalhador:", err);
                                                        }
                                                    }
                                                }}
                                                placeholder="Digite o nome do trabalhador..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Empresa Contratante</Label>
                                            <Select value={selectedContratante || undefined} onValueChange={setSelectedContratante}>
                                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="Selecione a empresa contratante..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    <SelectItem value="STOCCO">Stocco</SelectItem>
                                                    <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                                    <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                                    <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                                    <SelectItem value="TRIANGULO">Triangulo</SelectItem>
                                            <SelectItem value="HEXAGON">Hexagon</SelectItem>

                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Modelo de Contrato</Label>
                                            <Select value={selectedContractType || undefined} onValueChange={setSelectedContractType}>
                                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="Selecione o tipo de contrato..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    <SelectItem value="contrato_termo_incerto">Contrato a Termo Incerto (Passaporte)</SelectItem>
                                                    <SelectItem value="contrato_nis">Contrato NIS (NIF)</SelectItem>
                                                    <SelectItem value="contrato_alta">Contrato de Alta (Contabilidade - Sem Assinatura)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={generating} className="bg-indigo-600 hover:bg-indigo-500">
                                                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Gerar Contrato
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0 pt-2">
                                        {/* Painel Esquerdo: Pré-visualização do Contrato */}
                                        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 relative min-h-0 flex flex-col docx-preview-container-parent">
                                            {loadingPreview && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 gap-2">
                                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Carregando visualização prévia...</span>
                                                </div>
                                            )}
                                            {!loadingPreview && !previewBlob && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                                    <AlertCircle className="h-10 w-10 text-slate-400 mb-2" />
                                                    <span className="text-sm text-center font-medium text-slate-500">Pré-visualização indisponível.</span>
                                                </div>
                                            )}
                                            <style>{`
                                                .docx-wrapper img {
                                                    max-width: none !important;
                                                    display: inline-block !important;
                                                }
                                            `}</style>
                                            <div ref={previewContainerRef} className="docx-wrapper" />
                                        </div>

                                        {/* Painel Direito: Ações e Status */}
                                        <div className="w-full md:w-[380px] shrink-0 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto">
                                            <div className="space-y-4">
                                                <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                        <CheckCircle className="h-5 w-5" />
                                                        <span>Contrato Gerado com Sucesso!</span>
                                                    </div>
                                                    {generationSuccess.contractType === 'contrato_alta' ? (
                                                        <p className="text-xs text-slate-500 leading-relaxed">
                                                            Este contrato foi classificado como <strong>Alta (Contabilidade)</strong>. Não requer assinatura eletrônica ou código OTP. O arquivo foi enviado diretamente para o histórico de contratos.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs text-slate-500">
                                                                Código OTP temporário (Desenvolvimento): <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded">{generationSuccess.otpCode}</span>
                                                            </p>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-muted-foreground">Link de Assinatura Pública</Label>
                                                                <div className="flex gap-2">
                                                                    <Input readOnly value={generationSuccess.signingLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                                    <Button size="icon" variant="outline" onClick={() => handleCopyContractSignLink(generationSuccess.signingLink, workersList.find(w => w.value === selectedWorkerId)?.label.split(' (')[0], generationSuccess.otpCode)} title="Copiar mensagem padrão com link e código OTP">
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {generationSuccess.documentUrl && (
                                                        <div className="pt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold"
                                                                onClick={() => handleDownloadContract({
                                                                    document_url: generationSuccess.documentUrl,
                                                                    contract_type: generationSuccess.contractType,
                                                                    worker: { nome: 'Contrato' }
                                                                } as any)}
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                Baixar Arquivo Gerado (.docx)
                                                            </Button>
                                                        </div>
                                                    )}

                                                    <div className="text-xs flex items-center gap-2 text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 leading-normal">
                                                        {generationSuccess.contractType === 'contrato_alta' ? (
                                                            <span>Pronto para envio à contabilidade.</span>
                                                        ) : generationSuccess.emailSent ? (
                                                            <>
                                                                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                <span>E-mail enviado com sucesso ao trabalhador.</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                                                <span>Sem envio automático de e-mail (Resend não configurado ou trabalhador sem e-mail). Copie o link acima.</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                                                <Button onClick={() => setGenerateDialogOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                                    Fechar Painel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Botão & Modal Gerar Carta de Rescisão */}
                        <Dialog open={rescisaoDialogOpen} onOpenChange={(open) => {
                            setRescisaoDialogOpen(open);
                            if (!open) {
                                setRescisaoSuccess(null);
                                setRescisaoPreviewBlob(null);
                            }
                        }}>
                            <Button
                                onClick={() => handleOpenRescisaoDialog()}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                                <FileText className="h-4 w-4" />
                                Carta de Rescisão
                            </Button>
                            <DialogContent className={`${rescisaoSuccess ? 'max-w-7xl sm:max-w-7xl w-[96vw] h-[88vh]' : 'max-w-5xl sm:max-w-5xl w-[95vw] max-h-[92vh]'} flex flex-col bg-white dark:bg-slate-900 p-6 overflow-hidden transition-all duration-300`}>
                                <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-rose-600 dark:text-rose-400">
                                        <FileText className="h-6 w-6" />
                                        Emitir Carta de Rescisão (Solicitud de Rescisión)
                                    </DialogTitle>
                                    <DialogDescription className="text-sm">
                                        Selecione o trabalhador para carregar automaticamente seus documentos (Passaporte, NIF e NISS), confira o período de aviso prévio de 15 dias corridos e gere o link para assinatura eletrônica.
                                    </DialogDescription>
                                </DialogHeader>

                                {!rescisaoSuccess ? (
                                    <form onSubmit={handleGenerateRescisao} className="space-y-5 pt-3 overflow-y-auto pr-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold">Selecionar Trabalhador</Label>
                                                <Combobox
                                                    options={workersList}
                                                    value={rescisaoWorkerId || ''}
                                                    onChange={(val) => handleSelectRescisaoWorker(val || null)}
                                                    placeholder="Digite o nome ou código do trabalhador..."
                                                    className="h-11 text-sm font-medium"
                                                    popoverClassName="w-[420px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold">Empresa Contratante (Modelo Word)</Label>
                                                <Select value={rescisaoContratante} onValueChange={setRescisaoContratante}>
                                                    <SelectTrigger className="h-11 text-sm font-medium bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                        <SelectValue placeholder="Selecione a empresa..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[9999]">
                                                        <SelectItem value="STOCCO">Stocco, Lda</SelectItem>
                                                        <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                                        <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                                        <SelectItem value="TRIANGULO">Triângulo (TRI)</SelectItem>
                                                        <SelectItem value="HEXAGON">Hexagon (HEX)</SelectItem>
                                                        <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Ficha Resumo + Documentos de Identificação na Carta */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                        Dados do Trabalhador & Documentos (Impressos no Cabeçalho da Carta)
                                                    </span>
                                                    {loadingRescisaoWorker && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando dados...
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500">Você pode complementar ou editar qualquer campo abaixo</span>
                                            </div>

                                            {/* Resumo cadastral do trabalhador quando selecionado */}
                                            {rescisaoWorkerId && rescisaoWorkerDetails && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Código / Colaborador</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">
                                                            {rescisaoWorkerDetails.cod_colab || '-'} — {rescisaoWorkerName}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Cliente / Obra Atual</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {rescisaoWorkerDetails.cliente || 'Sem cliente vinculado'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Função / Cargo</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {rescisaoWorkerDetails.funcion || '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Contato (WhatsApp / E-mail)</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block" title={`${rescisaoWorkerPhone} ${rescisaoWorkerEmail}`}>
                                                            {rescisaoWorkerPhone || rescisaoWorkerEmail || 'Sem telefone'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        Pasaporte / Documento ID
                                                    </Label>
                                                    <Input
                                                        value={rescisaoPasaporte}
                                                        onChange={(e) => setRescisaoPasaporte(e.target.value)}
                                                        placeholder="Ex: BH249938"
                                                        className="h-10 text-sm font-mono font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        NIF (Portugal)
                                                    </Label>
                                                    <Input
                                                        value={rescisaoNif}
                                                        onChange={(e) => setRescisaoNif(e.target.value)}
                                                        placeholder="Ex: 335193510"
                                                        className="h-10 text-sm font-mono font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        NISS (Segurança Social)
                                                    </Label>
                                                    <Input
                                                        value={rescisaoNiss}
                                                        onChange={(e) => setRescisaoNiss(e.target.value)}
                                                        placeholder="Ex: 12182540026"
                                                        className="h-10 text-sm font-mono font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>
                                            </div>

                                            {/* Linha prévia exata que vai sair no cabeçalho da carta */}
                                            {rescisaoWorkerId && (
                                                <div className="text-xs bg-slate-100 dark:bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-slate-500 font-medium">Linha impressa na Carta:</span>
                                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        {[
                                                            rescisaoPasaporte ? `PASAPORTE: ${rescisaoPasaporte}` : null,
                                                            rescisaoNif ? `NIF: ${rescisaoNif}` : null,
                                                            rescisaoNiss ? `NISS: ${rescisaoNiss}` : null,
                                                        ].filter(Boolean).join('   ') || 'Nenhum documento informado'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Regra de Datas do Aviso Prévio (15 dias corridos) */}
                                        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                                        <Calendar className="h-4 w-4" />
                                                        Datas da Solicitação e Aviso Prévio (15 Dias Corridos)
                                                    </span>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Ao alterar a data de início, a data final é calculada automaticamente (+15 dias), mas você pode editá-las livremente (inclusive retroativo).
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900">
                                                        Prazo: {getDaysDiff(rescisaoStartDate, rescisaoEndDate)} dias corridos
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRescisaoEndDate(addDaysToIso(rescisaoStartDate, 15))}
                                                        className="text-xs px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold transition-colors"
                                                        title="Recalcular +15 dias a partir da data de início"
                                                    >
                                                        Resetar +15d
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        Data da Solicitação / Carta
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={rescisaoRequestDate}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setRescisaoRequestDate(val);
                                                            if (val) {
                                                                setRescisaoStartDate(val);
                                                                setRescisaoEndDate(addDaysToIso(val, 15));
                                                            }
                                                        }}
                                                        className="h-10 text-sm font-medium bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        Início do Aviso Prévio
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={rescisaoStartDate}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setRescisaoStartDate(val);
                                                            if (val) {
                                                                setRescisaoEndDate(addDaysToIso(val, 15));
                                                            }
                                                        }}
                                                        className="h-10 text-sm font-medium bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        Fim do Aviso Prévio (+15d)
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={rescisaoEndDate}
                                                        onChange={(e) => setRescisaoEndDate(e.target.value)}
                                                        className="h-10 text-sm font-medium bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                    />
                                                </div>
                                            </div>

                                            {/* Prévia em tempo real do parágrafo da carta */}
                                            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                "Solicito que dicha rescisión surta efecto a partir del <strong className="text-slate-900 dark:text-white not-italic underline">{formatIsoToBr(rescisaoStartDate)}</strong>, respetando el plazo legal de preaviso, que se cumplirá entre el <strong className="text-slate-900 dark:text-white not-italic underline">{formatIsoToBr(rescisaoStartDate)}</strong> y el <strong className="text-slate-900 dark:text-white not-italic underline">{formatIsoToBr(rescisaoEndDate)}</strong>."
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="outline" className="h-10 px-5" onClick={() => setRescisaoDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={generatingRescisao || !rescisaoWorkerId} className="h-10 px-6 bg-rose-600 hover:bg-rose-500 text-white font-semibold">
                                                {generatingRescisao ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-1.5" />}
                                                Gerar Carta de Rescisão
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0 pt-2">
                                        {/* Painel Esquerdo: Pré-visualização do Documento */}
                                        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 relative min-h-0 flex flex-col docx-preview-container-parent">
                                            {loadingRescisaoPreview && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 gap-2">
                                                    <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Carregando visualização da Carta de Rescisão...</span>
                                                </div>
                                            )}
                                            {!loadingRescisaoPreview && !rescisaoPreviewBlob && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                                    <AlertCircle className="h-10 w-10 text-slate-400 mb-2" />
                                                    <span className="text-sm text-center font-medium text-slate-500">Pré-visualização indisponível.</span>
                                                </div>
                                            )}
                                            <div ref={rescisaoPreviewRef} className="docx-wrapper" />
                                        </div>

                                        {/* Painel Direito: Link, OTP, WhatsApp e Download */}
                                        <div className="w-full md:w-[390px] shrink-0 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto">
                                            <div className="space-y-4">
                                                <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                        <CheckCircle className="h-5 w-5" />
                                                        <span>Carta de Rescisão Emitida!</span>
                                                    </div>

                                                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                                                        <div><span className="text-slate-400">Trabalhador:</span> <strong>{rescisaoWorkerName || workersList.find(w => w.value === rescisaoWorkerId)?.label.split(' (')[0]}</strong></div>
                                                        <div><span className="text-slate-400">Empresa:</span> <strong>{rescisaoContratante}</strong></div>
                                                        <div><span className="text-slate-400">Aviso Prévio:</span> <strong className="text-rose-600 dark:text-rose-400">{formatIsoToBr(rescisaoStartDate)} → {formatIsoToBr(rescisaoEndDate)}</strong></div>
                                                    </div>

                                                    <p className="text-xs text-slate-500">
                                                        Código OTP de Assinatura: <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-slate-800 px-2 py-0.5 rounded">{rescisaoSuccess.otpCode}</span>
                                                    </p>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Link de Assinatura Eletrônica</Label>
                                                        <div className="flex gap-2">
                                                            <Input readOnly value={rescisaoSuccess.signingLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={() => handleCopyRescisaoSignLink(
                                                                    rescisaoSuccess.signingLink,
                                                                    rescisaoWorkerName || workersList.find(w => w.value === rescisaoWorkerId)?.label.split(' (')[0],
                                                                    rescisaoSuccess.otpCode,
                                                                    rescisaoStartDate,
                                                                    rescisaoEndDate
                                                                )}
                                                                title="Copiar mensagem com link e código OTP"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2 pt-2">
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                                                            onClick={() => handleSendRescisaoWhatsApp(
                                                                rescisaoSuccess.signingLink,
                                                                rescisaoWorkerName || workersList.find(w => w.value === rescisaoWorkerId)?.label.split(' (')[0],
                                                                rescisaoWorkerPhone,
                                                                rescisaoSuccess.otpCode,
                                                                rescisaoStartDate,
                                                                rescisaoEndDate
                                                            )}
                                                        >
                                                            <Send className="h-4 w-4" />
                                                            Enviar para Assinatura via WhatsApp
                                                        </Button>

                                                        {rescisaoSuccess.documentUrl && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full flex items-center justify-center gap-2 border-slate-300 dark:border-slate-700 font-semibold"
                                                                onClick={() => handleDownloadContract({
                                                                    document_url: rescisaoSuccess.documentUrl,
                                                                    contract_type: 'rescisao',
                                                                    worker: { nome: rescisaoWorkerName || 'Carta_Rescisao' }
                                                                } as any)}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                Baixar Arquivo Word (.docx)
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setRescisaoSuccess(null)}
                                                    className="flex-1"
                                                >
                                                    Emitir Outra
                                                </Button>
                                                <Button
                                                    onClick={() => setRescisaoDialogOpen(false)}
                                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                                                >
                                                    Concluir
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Tabs de Navegação */}
                <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0 overflow-hidden" onValueChange={(value) => {
                    if (value === 'requests') {
                        loadDocRequests();
                    } else if (value === 'contracts' || value === 'rescisoes') {
                        loadContracts();
                    } else if (value === 'tasks' && selectedTaskForWorkers) {
                        loadTaskWorkers(selectedTaskForWorkers);
                    }
                }}>
                    <TabsList className="grid w-full md:w-[1040px] grid-cols-2 md:grid-cols-5 shrink-0">
                        <TabsTrigger value="tasks">Tarefas Operacionais</TabsTrigger>
                        <TabsTrigger value="requests">Solicitações de Documentos</TabsTrigger>
                        <TabsTrigger value="contracts">Contratos & Assinaturas</TabsTrigger>
                        <TabsTrigger value="rescisoes" className="flex items-center gap-1.5">
                            <span>Cartas de Rescisão</span>
                            {rescisaoStats.pending > 0 && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                                    {rescisaoStats.pending}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="templates">Configuração de Modelos</TabsTrigger>
                    </TabsList>
                    
                    {/* Conteúdo 1: Tarefas do Kanban */}
                    <TabsContent value="tasks" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4">
                        <DepartmentTaskBoard 
                            title="Fila de Tarefas de Documentação" 
                            departmentCodes={['DOCUMENTACION', 'CONTRATOS']} 
                            onTaskClick={(task) => {
                                setSelectedTaskForWorkers(task);
                                loadTaskWorkers(task);
                                setWorkersDialogOpen(true);
                            }}
                        />
                    </TabsContent>

                    {/* Conteúdo 2: Solicitações de Documentos (OCR) */}
                    <TabsContent value="requests" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4 space-y-4">
                        {/* Barra de Filtros e Busca */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTermRequests}
                                    onChange={(e) => setSearchTermRequests(e.target.value)}
                                    placeholder="Pesquisar por trabalhador, empresa ou cliente..."
                                    className="pl-9 pr-8 bg-white dark:bg-black"
                                />
                                {searchTermRequests && (
                                    <button
                                        onClick={() => setSearchTermRequests('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[180px]">
                                    <Select value={empresaFilterRequests} onValueChange={setEmpresaFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Empresa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as Empresas</SelectItem>
                                            {uniqueEmpresasRequests.map(emp => (
                                                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[200px]">
                                    <Select value={clientFilterRequests} onValueChange={setClientFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Clientes</SelectItem>
                                            {uniqueClientsRequests.map(cli => (
                                                <SelectItem key={cli} value={cli}>{cli}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[200px]">
                                    <Select value={pedidoFilterRequests} onValueChange={setPedidoFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Pedido / Reemplazo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Pedidos / Reemplazos</SelectItem>
                                            {uniquePedidosRequests.map(ped => (
                                                <SelectItem key={ped} value={ped}>
                                                    <span className="font-mono">{ped}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[180px]">
                                    <Select value={statusFilterRequests} onValueChange={setStatusFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Status</SelectItem>
                                            <SelectItem value="pending_upload">Aguardando Envio</SelectItem>
                                            <SelectItem value="submitted">Recebido - Analisar</SelectItem>
                                            <SelectItem value="verified">Cadastro Validado</SelectItem>
                                            <SelectItem value="expired">Expirado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(searchTermRequests || statusFilterRequests !== 'all' || empresaFilterRequests !== 'all' || clientFilterRequests !== 'all' || pedidoFilterRequests !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTermRequests('');
                                            setStatusFilterRequests('all');
                                            setEmpresaFilterRequests('all');
                                            setClientFilterRequests('all');
                                            setPedidoFilterRequests('all');
                                        }}
                                        className="text-indigo-600 dark:text-indigo-400 font-semibold"
                                    >
                                        Limpar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Links e Envios Cadastrais</h3>
                                <Button size="sm" variant="ghost" onClick={loadDocRequests}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingDocRequests ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Carregando solicitações...</span>
                                    </div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Camera className="h-10 w-10 text-slate-400" />
                                        <span>Nenhuma solicitação de documentos encontrada.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('worker')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Trabalhador
                                                        {sortFieldRequests === 'worker' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('empresa')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Empresa
                                                        {sortFieldRequests === 'empresa' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('client')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Cliente
                                                        {sortFieldRequests === 'client' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('planned_start_date')}
                                                >
                                                    <div className="flex items-center gap-1 flex-row">
                                                        Início Previsto
                                                        {sortFieldRequests === 'planned_start_date' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('created_at')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Criado Em
                                                        {sortFieldRequests === 'created_at' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead>Expira Em</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRequests.map((req) => {
                                                const inviteLink = `${window.location.origin}/enviar-documentos/${req.token}`;
                                                const isExpired = new Date(req.expires_at) < new Date();
                                                
                                                const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
                                                const latestAssignment = req.worker?.assignments?.[0];
                                                const clientName = req.client?.trade_name || req.client?.legal_name ||
                                                                   activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                                                                   latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                                                                   req.worker?.cliente || 'Sem Alocação';
                                                
                                                const rawWorkerCode = (req.worker as any)?.cod_colab || '';
                                                const workerCode = rawWorkerCode ? (String(rawWorkerCode).startsWith('E') ? String(rawWorkerCode) : `E${rawWorkerCode}`) : '';

                                                const rawClientCode = (req.client as any)?.codigo || (activeAssignment?.client as any)?.codigo || (latestAssignment?.client as any)?.codigo || '';
                                                const clientCode = rawClientCode ? (String(rawClientCode).startsWith('C') ? String(rawClientCode) : `C${rawClientCode}`) : '';

                                                const empresaName = req.empresa?.name || 'Stocco';
                                                
                                                const plannedStartDate = (req as any).extracted_data?.start_date ||
                                                                          activeAssignment?.planned_start_date || activeAssignment?.start_date ||
                                                                          latestAssignment?.planned_start_date || latestAssignment?.start_date;

                                                const formatDisplayDate = (dateStr?: string | null) => {
                                                    if (!dateStr) return 'Não informada';
                                                    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
                                                    if (match) {
                                                        return `${match[3]}/${match[2]}/${match[1]}`;
                                                    }
                                                    try {
                                                        return new Date(dateStr).toLocaleDateString('pt-PT');
                                                    } catch (_) {
                                                        return dateStr;
                                                    }
                                                };

                                                return (
                                                    <TableRow key={req.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                                                <span>{req.worker?.nome}</span>
                                                                {workerCode && (
                                                                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                                        ({workerCode})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{req.worker?.email || req.worker?.movil || 'Sem contato'}</div>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            {empresaName}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {clientCode && (
                                                                    <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-1.5 py-0.5 rounded">
                                                                        [{clientCode}]
                                                                    </span>
                                                                )}
                                                                <span>{clientName}</span>
                                                            </div>
                                                            {req.pedido_codigo && (
                                                                <div className="mt-1 flex items-center gap-1 flex-wrap">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`font-mono text-[11px] px-1.5 py-0.5 gap-1 ${
                                                                            req.solicitud_tipo === 'replacement' || req.pedido_codigo?.startsWith('R-')
                                                                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                                        }`}
                                                                    >
                                                                        <Package className="w-3 h-3" />
                                                                        {req.pedido_codigo}
                                                                        {req.solicitud_tipo === 'replacement' && !req.pedido_codigo?.startsWith('R-') && (
                                                                            <span className="text-[10px] opacity-80">(Reemplazo)</span>
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            {formatDisplayDate(plannedStartDate)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                                req.status === 'submitted' ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/20' :
                                                                isExpired ? 'bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20' :
                                                                'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10'
                                                            }>
                                                                {req.status === 'verified' ? 'Cadastro Validado' :
                                                                 req.status === 'submitted' ? 'Recebido - Analisar' :
                                                                 isExpired ? 'Expirado' : 'Aguardando Envio'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {new Date(req.created_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {new Date(req.expires_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleOpenEditRequest(req)}
                                                                title="Editar Empresa e Cliente"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleDeleteRequest(req.id, req.worker?.nome)}
                                                                title="Excluir Solicitação"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>

                                                            {req.status === 'pending_upload' && !isExpired && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    onClick={() => handleCopyInviteLink(inviteLink, req.worker?.nome)}
                                                                    title="Copiar Link de Envio"
                                                                >
                                                                    <Copy className="h-4 w-4 mr-1 text-slate-500" /> Copiar Link
                                                                </Button>
                                                            )}
                                                            {req.status === 'submitted' && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-indigo-600 hover:bg-indigo-500"
                                                                    onClick={() => handleOpenVerify(req)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" /> Analisar
                                                                </Button>
                                                            )}
                                                            {req.status === 'verified' && (
                                                                <div className="inline-flex items-center gap-2">
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold text-xs gap-1"
                                                                        onClick={() => handleOpenVerify(req)}
                                                                        title="Visualizar e Baixar Documentos do Trabalhador"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5" /> Visualizar / Baixar Docs
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                                        onClick={() => handleTriggerGenerate(req.worker_id, req.empresa_id, req.worker)}
                                                                    >
                                                                        <Plus className="h-3 w-3" /> Gerar Contrato
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Conteúdo 3: Gerenciador de Contratos */}
                    <TabsContent value="contracts" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4 space-y-4">
                        {/* Barra de Filtros e Busca */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTermContracts}
                                    onChange={(e) => setSearchTermContracts(e.target.value)}
                                    placeholder="Pesquisar por trabalhador, empresa ou cliente..."
                                    className="pl-9 pr-8 bg-white dark:bg-black"
                                />
                                {searchTermContracts && (
                                    <button
                                        onClick={() => setSearchTermContracts('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[200px]">
                                    <Select value={statusFilterContracts} onValueChange={setStatusFilterContracts}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Status</SelectItem>
                                            <SelectItem value="pending_signature">Pendente Assinatura</SelectItem>
                                            <SelectItem value="signed">Assinado</SelectItem>
                                            <SelectItem value="no_signature">Não Requer Assinatura</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[200px]">
                                    <Select value={pedidoFilterContracts} onValueChange={setPedidoFilterContracts}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Pedido / Reemplazo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Pedidos / Reemplazos</SelectItem>
                                            {uniquePedidosContracts.map(ped => (
                                                <SelectItem key={ped} value={ped}>
                                                    <span className="font-mono">{ped}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[240px]">
                                    <Select 
                                        value={`${sortFieldContracts}_${sortDirectionContracts}`} 
                                        onValueChange={(val) => {
                                            if (val === 'created_at_desc') { setSortFieldContracts('created_at'); setSortDirectionContracts('desc'); }
                                            else if (val === 'created_at_asc') { setSortFieldContracts('created_at'); setSortDirectionContracts('asc'); }
                                            else if (val === 'worker_asc') { setSortFieldContracts('worker'); setSortDirectionContracts('asc'); }
                                            else if (val === 'worker_desc') { setSortFieldContracts('worker'); setSortDirectionContracts('desc'); }
                                            else if (val === 'empresa_asc') { setSortFieldContracts('empresa'); setSortDirectionContracts('asc'); }
                                            else if (val === 'empresa_desc') { setSortFieldContracts('empresa'); setSortDirectionContracts('desc'); }
                                            else if (val === 'client_asc') { setSortFieldContracts('client'); setSortDirectionContracts('asc'); }
                                            else if (val === 'client_desc') { setSortFieldContracts('client'); setSortDirectionContracts('desc'); }
                                        }}
                                    >
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Ordenar por..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="created_at_desc">📅 Data (Mais Recente)</SelectItem>
                                            <SelectItem value="created_at_asc">📅 Data (Mais Antigo)</SelectItem>
                                            <SelectItem value="worker_asc">🔤 Trabalhador (A-Z / Crescente)</SelectItem>
                                            <SelectItem value="worker_desc">🔤 Trabalhador (Z-A / Decrescente)</SelectItem>
                                            <SelectItem value="empresa_asc">🏢 Empresa (A-Z / Crescente)</SelectItem>
                                            <SelectItem value="empresa_desc">🏢 Empresa (Z-A / Decrescente)</SelectItem>
                                            <SelectItem value="client_asc">🏬 Cliente (A-Z / Crescente)</SelectItem>
                                            <SelectItem value="client_desc">🏬 Cliente (Z-A / Decrescente)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(searchTermContracts || statusFilterContracts !== 'all' || pedidoFilterContracts !== 'all' || sortFieldContracts !== 'created_at' || sortDirectionContracts !== 'desc') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTermContracts('');
                                            setStatusFilterContracts('all');
                                            setPedidoFilterContracts('all');
                                            setSortFieldContracts('created_at');
                                            setSortDirectionContracts('desc');
                                        }}
                                        className="text-indigo-600 dark:text-indigo-400 font-semibold"
                                    >
                                        Limpar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Contratos Gerados</h3>
                                <Button size="sm" variant="ghost" onClick={loadContracts}><RefreshCw className="h-4 w-4" /></Button>
                            </div>

                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingContracts ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Buscando contratos gerados...</span>
                                    </div>
                                ) : filteredContracts.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <span>Nenhum contrato encontrado.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('worker')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Trabalhador
                                                        {sortFieldContracts === 'worker' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('empresa')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Empresa
                                                        {sortFieldContracts === 'empresa' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('client')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Cliente
                                                        {sortFieldContracts === 'client' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('type')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Tipo
                                                        {sortFieldContracts === 'type' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead>OTP Código</TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('status')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Status
                                                        {sortFieldContracts === 'status' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleContractSort('created_at')}>
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                        Data de Geração
                                                        {sortFieldContracts === 'created_at' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredContracts.map((contract) => {
                                                const signLink = `${window.location.origin}/assinar/${contract.signature_token}`;
                                                const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || contract.worker?.cliente || 'Sem Alocação';
                                                
                                                return (
                                                    <TableRow key={contract.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {contract.worker?.nome}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {contract.worker?.email || 'E-mail não cadastrado'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {contract.contratante}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div>{clientName}</div>
                                                            {contract.pedido_codigo && (
                                                                <div className="mt-1 flex items-center gap-1 flex-wrap">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`font-mono text-[11px] px-1.5 py-0.5 gap-1 ${
                                                                            contract.solicitud_tipo === 'replacement' || contract.pedido_codigo?.startsWith('R-')
                                                                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                                        }`}
                                                                    >
                                                                        <Package className="w-3 h-3" />
                                                                        {contract.pedido_codigo}
                                                                        {contract.solicitud_tipo === 'replacement' && !contract.pedido_codigo?.startsWith('R-') && (
                                                                            <span className="text-[10px] opacity-80">(Reemplazo)</span>
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">
                                                                {contract.contract_type.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                                            {contract.otp_code || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                                contract.status === 'pending_signature' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20' :
                                                                contract.status === 'no_signature' ? 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/20' :
                                                                'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10'
                                                            }>
                                                                {contract.status === 'signed' ? 'Assinado' :
                                                                 contract.status === 'pending_signature' ? 'Pendente Assinatura' :
                                                                 contract.status === 'no_signature' ? 'Não Requer Assinatura' :
                                                                 contract.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {contract.created_at ? new Date(contract.created_at).toLocaleDateString('pt-PT') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDownloadContract(contract)}
                                                                title="Visualizar / Baixar Contrato"
                                                            >
                                                                <FileText className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleAttachContractToWorkerProfile(contract)}
                                                                title="Arquivar Contrato no Cadastro do Trabalhador"
                                                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800"
                                                            >
                                                                <FolderPlus className="h-4 w-4" />
                                                            </Button>

                                                            {contract.status !== 'no_signature' && (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleCopyContractSignLink(signLink, contract.worker?.nome, contract.otp_code)}
                                                                        title="Copiar mensagem padrão do contrato com link e código OTP"
                                                                    >
                                                                        <Copy className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>
                                                                    
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => window.open(signLink, '_blank')}
                                                                        title="Abrir Tela de Assinatura"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteContractItem(contract.id)}
                                                                title="Excluir Contrato"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-rose-500 hover:text-rose-700" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Conteúdo 3.5: Controle de Cartas de Rescisão & Gestão do Aviso Prévio */}
                    <TabsContent value="rescisoes" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4 space-y-4">
                        {/* Cards de Resumo Dinâmicos conforme a Sub-Visão selecionada */}
                        {rescisaoSubView === 'assinaturas' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilterRescisao('all')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        statusFilterRescisao === 'all'
                                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Cartas / Registros</span>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{rescisaoStats.total}</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilterRescisao('pending_signature')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        statusFilterRescisao === 'pending_signature'
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Não Assinadas (Pendentes)</span>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{rescisaoStats.pending}</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilterRescisao('signed')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        statusFilterRescisao === 'signed'
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Assinadas pelo Trabalhador</span>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{rescisaoStats.signed}</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setNoticeStatusFilter('all')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        noticeStatusFilter === 'all'
                                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total em Controle de Aviso</span>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{noticeStats.total}</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">Base padrão: € 460,00 (€ 30,67/dia)</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNoticeStatusFilter('in_progress')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        noticeStatusFilter === 'in_progress'
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cumprindo Aviso (Ativos)</span>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{noticeStats.inProgress}</div>
                                        <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">Reduz € 30,67/dia (Sáb/Dom incl.)</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                        <RefreshCw className="h-5 w-5" />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNoticeStatusFilter('abandoned')}
                                    className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        noticeStatusFilter === 'abandoned'
                                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Abandonaram / Pararam</span>
                                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{noticeStats.abandoned}</div>
                                        <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">Contagem parada p/ desconto</div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                </button>

                                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/30 dark:to-slate-900 flex items-center justify-between shadow-sm">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Saldo Previsto a Descontar</span>
                                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                            {formatCurrencyEur(noticeStats.totalToDeduct)}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Cumpridos / Isentos: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{noticeStats.completedOrWaived}</span>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                                        €
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barra de Busca, Filtros e Ações Rápidas */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTermRescisao}
                                    onChange={(e) => setSearchTermRescisao(e.target.value)}
                                    placeholder="Pesquisar trabalhador, passaporte, NIF ou empresa..."
                                    className="pl-9 pr-8 bg-white dark:bg-black"
                                />
                                {searchTermRescisao && (
                                    <button
                                        onClick={() => setSearchTermRescisao('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {rescisaoSubView === 'assinaturas' ? (
                                    <div className="w-[200px]">
                                        <Select value={statusFilterRescisao} onValueChange={setStatusFilterRescisao}>
                                            <SelectTrigger className="bg-white dark:bg-black">
                                                <SelectValue placeholder="Status da Assinatura" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos os Status</SelectItem>
                                                <SelectItem value="pending_signature">⏳ Pendente Assinatura</SelectItem>
                                                <SelectItem value="signed">✅ Assinado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="w-[215px]">
                                        <Select value={noticeStatusFilter} onValueChange={(v: any) => setNoticeStatusFilter(v)}>
                                            <SelectTrigger className="bg-white dark:bg-black">
                                                <SelectValue placeholder="Situação do Aviso" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas as Situações</SelectItem>
                                                <SelectItem value="in_progress">⏳ Em Cumprimento</SelectItem>
                                                <SelectItem value="abandoned">🛑 Abandonou / Parou</SelectItem>
                                                <SelectItem value="completed">✅ Aviso Cumprido</SelectItem>
                                                <SelectItem value="waived">⚪ Isento (Não Descontar)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="w-[210px]">
                                    <Select value={empresaFilterRescisao} onValueChange={setEmpresaFilterRescisao}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Empresa Contratante" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as Empresas</SelectItem>
                                            <SelectItem value="STOCCO">Stocco</SelectItem>
                                            <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                            <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital</SelectItem>
                                            <SelectItem value="TRIANGULO">Triângulo</SelectItem>
                                            <SelectItem value="HEXAGON">Hexagon</SelectItem>
                                            <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleOpenCreateManualNotice}
                                    className="border-amber-500/50 bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold gap-1.5"
                                    title="Incluir trabalhador que assinou carta manual ou sem carta digital para controlar o aviso prévio e desconto"
                                >
                                    <Plus className="h-4 w-4" />
                                    Incluir no Aviso Prévio
                                </Button>

                                <Button
                                    onClick={() => handleOpenRescisaoDialog()}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nova Carta de Rescisão
                                </Button>
                            </div>
                        </div>

                        {/* Galeria Principal com Alternador Lateral: Controle Carta Rescisão | Aviso Prévio */}
                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="inline-flex p-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setRescisaoSubView('assinaturas')}
                                            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                                                rescisaoSubView === 'assinaturas'
                                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5 text-rose-500" />
                                            Controle de Cartas de Rescisão
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                {rescisaoStats.total}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setRescisaoSubView('aviso_previo')}
                                            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                                                rescisaoSubView === 'aviso_previo'
                                                    ? 'bg-amber-500 text-white shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Clock className="h-3.5 w-3.5" />
                                            Aviso Prévio & Descontos
                                            <Badge className={`text-[10px] px-1.5 py-0 h-4 ${
                                                rescisaoSubView === 'aviso_previo'
                                                    ? 'bg-white/20 text-white border-transparent'
                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                            }`}>
                                                {noticeStats.total}
                                            </Badge>
                                        </button>
                                    </div>

                                    {rescisaoSubView === 'aviso_previo' && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline-flex items-center gap-1.5 pl-2">
                                            • 15 dias corridos (Sáb/Dom contam como cumpridos) • Base padrão: <strong>€ 460,00</strong> (€ 30,67/dia)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {rescisaoSubView === 'aviso_previo' && (
                                        <Button
                                            size="sm"
                                            onClick={handleOpenCreateManualNotice}
                                            className="h-8 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Incluir Trabalhador (Manual)
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={loadContracts} title="Atualizar lista">
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingContracts ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                                        <span>Carregando registros...</span>
                                    </div>
                                ) : filteredRescisoes.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <span>Nenhum trabalhador encontrado para os filtros selecionados.</span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleOpenCreateManualNotice}
                                                className="border-amber-500/50 text-amber-700 dark:text-amber-300 font-semibold gap-1.5"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Incluir Trabalhador no Aviso Prévio
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenRescisaoDialog()}
                                                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Emitir Carta de Rescisão
                                            </Button>
                                        </div>
                                    </div>
                                ) : rescisaoSubView === 'assinaturas' ? (
                                    /* SUB-VISÃO 1: CONTROLE DE ASSINATURAS (GALERIA MELHORADA COM INÍCIO DE TRABALHO E DIAS NO MÊS) */
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Trabalhador</TableHead>
                                                <TableHead>Empresa / Cliente</TableHead>
                                                <TableHead>Início Trabalho & Dias no Mês</TableHead>
                                                <TableHead>Solicitação & Aviso (15d)</TableHead>
                                                <TableHead>Resumo Aviso Prévio</TableHead>
                                                <TableHead>Código OTP</TableHead>
                                                <TableHead>Status Assinatura</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRescisoes.map((c) => {
                                                const today = todayIsoStr();
                                                const info = computeNoticeDetails(c, today);
                                                const signLink = `${window.location.origin}/assinar/${c.signature_token}`;
                                                const clientName = c.assignment?.client?.trade_name || c.assignment?.client?.legal_name || c.worker?.cliente || 'Sem Alocação';

                                                return (
                                                    <TableRow key={c.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <span>{c.worker?.nome}</span>
                                                                {info.isManualEntry && (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/50 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30">
                                                                        Manual
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {[c.worker?.pasaporte ? `Pass: ${c.worker.pasaporte}` : null, c.worker?.nif ? `NIF: ${c.worker.nif}` : null, c.worker?.movil].filter(Boolean).join(' • ') || c.worker?.email || '-'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{c.contratante}</div>
                                                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={clientName}>{clientName}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                className="text-left group hover:bg-slate-100 dark:hover:bg-slate-800/70 p-1.5 -m-1.5 rounded-md transition-colors"
                                                                title="Clique para ajustar a data de início ou dias trabalhados no mês"
                                                            >
                                                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                                                                    <span>Início: <strong>{info.workStartDate ? formatIsoToBr(info.workStartDate) : 'Informar'}</strong></span>
                                                                    <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="mt-1">
                                                                    <Badge variant="outline" className={`text-[10px] font-semibold ${
                                                                        info.monthWorkedDays > 0
                                                                            ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                                                            : 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                                                    }`}>
                                                                        {info.monthWorkedDays} {info.monthWorkedDays === 1 ? 'dia trab. no mês' : 'dias trab. no mês'}
                                                                    </Badge>
                                                                </div>
                                                            </button>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-[11px] text-slate-500 mb-0.5">
                                                                Solicitado: <span className="font-medium text-slate-700 dark:text-slate-300">{formatIsoToBr(info.reqDate)}</span>
                                                            </div>
                                                            <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded">
                                                                <span>{formatIsoToBr(info.startNotice)}</span>
                                                                <span>→</span>
                                                                <span className="font-bold">{formatIsoToBr(info.endNotice)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                className="text-left group space-y-0.5"
                                                                title="Clique para gerenciar o aviso prévio e desconto na folha"
                                                            >
                                                                <div className="text-xs font-bold flex items-center gap-1.5">
                                                                    <span className={info.finalToDeduct > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                                        {info.applyDeduction ? `Descontar: ${formatCurrencyEur(info.finalToDeduct)}` : 'Isento (€ 0,00)'}
                                                                    </span>
                                                                    <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    {info.fulfilledDays}/{info.totalNoticeDays}d cumpridos
                                                                    {info.stopDate ? ` • Parou ${formatIsoToBr(info.stopDate)}` : ''}
                                                                </div>
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                                            {c.otp_code || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {c.status === 'signed' ? (
                                                                <div className="space-y-0.5">
                                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                                                                        {info.isManualEntry && !c.document_url ? '📝 Assinado (Manual)' : '✅ Assinado'}
                                                                    </Badge>
                                                                    {c.signed_at && (
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {new Date(c.signed_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                                                                    ⏳ Não Assinado (Pendente)
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                title="Gerenciar Aviso Prévio & Desconto em Folha"
                                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-slate-800"
                                                            >
                                                                <Clock className="h-4 w-4" />
                                                            </Button>

                                                            {c.document_url && (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleDownloadContract(c)}
                                                                        title="Visualizar / Baixar Carta de Rescisão (.docx)"
                                                                    >
                                                                        <FileText className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleAttachContractToWorkerProfile(c)}
                                                                        title="Arquivar Carta de Rescisão no Cadastro do Trabalhador"
                                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800"
                                                                    >
                                                                        <FolderPlus className="h-4 w-4" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleSendRescisaoWhatsApp(signLink, c.worker?.nome, c.worker?.movil, c.otp_code, info.startNotice, info.endNotice)}
                                                                        title="Enviar Link de Assinatura via WhatsApp"
                                                                        className="text-emerald-600 hover:text-emerald-700"
                                                                    >
                                                                        <Send className="h-4 w-4" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleCopyRescisaoSignLink(signLink, c.worker?.nome, c.otp_code, info.startNotice, info.endNotice)}
                                                                        title="Copiar mensagem com link e código OTP"
                                                                    >
                                                                        <Copy className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => window.open(signLink, '_blank')}
                                                                        title="Abrir Tela de Assinatura"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteContractItem(c.id)}
                                                                title="Excluir Registro"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-rose-500 hover:text-rose-700" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    /* SUB-VISÃO 2: GESTÃO DO AVISO PRÉVIO & DESCONTOS NA FOLHA */
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Trabalhador</TableHead>
                                                <TableHead>Empresa / Cliente</TableHead>
                                                <TableHead>Início Trabalho & Dias no Mês</TableHead>
                                                <TableHead>Período Aviso (15d)</TableHead>
                                                <TableHead>Cumprimento (Sáb/Dom incl.)</TableHead>
                                                <TableHead>Valor Base / Diária</TableHead>
                                                <TableHead>Saldo a Descontar (Folha)</TableHead>
                                                <TableHead className="text-right">Gestão / Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRescisoes.map((c) => {
                                                const today = todayIsoStr();
                                                const info = computeNoticeDetails(c, today);
                                                const clientName = c.assignment?.client?.trade_name || c.assignment?.client?.legal_name || c.worker?.cliente || 'Sem Alocação';
                                                const progressPct = Math.min(100, Math.max(0, Math.round((info.fulfilledDays / info.totalNoticeDays) * 100)));

                                                return (
                                                    <TableRow key={c.id} className={info.computedStatus === 'abandoned' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <span>{c.worker?.nome}</span>
                                                                {info.isManualEntry ? (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/50 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30">
                                                                        Manual
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-400/40 text-indigo-600 dark:text-indigo-300">
                                                                        Carta Digital
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {[c.worker?.cod_colab ? `Cód: ${c.worker.cod_colab}` : null, c.worker?.pasaporte ? `Pass: ${c.worker.pasaporte}` : null, c.worker?.nif ? `NIF: ${c.worker.nif}` : null].filter(Boolean).join(' • ') || '-'}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{c.contratante}</div>
                                                            <div className="text-[11px] text-muted-foreground truncate max-w-[170px]" title={clientName}>{clientName}</div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                className="text-left group hover:bg-slate-100 dark:hover:bg-slate-800/70 p-1.5 -m-1.5 rounded-md transition-colors"
                                                                title="Clique para editar data de admissão e dias trabalhados no mês"
                                                            >
                                                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                                                                    <span>Início: <strong>{info.workStartDate ? formatIsoToBr(info.workStartDate) : 'Definir'}</strong></span>
                                                                    <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="mt-1 flex items-center gap-1">
                                                                    <Badge variant="outline" className={`text-[10px] font-bold ${
                                                                        info.monthWorkedDays > 0
                                                                            ? 'border-indigo-200 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                                                            : 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                                                    }`}>
                                                                        {info.monthWorkedDays} {info.monthWorkedDays === 1 ? 'dia trab. no mês' : 'dias trab. no mês'}
                                                                    </Badge>
                                                                </div>
                                                            </button>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                                                                <span>{formatIsoToBr(info.startNotice)}</span>
                                                                <span>→</span>
                                                                <span className="font-bold">{formatIsoToBr(info.endNotice)}</span>
                                                            </div>
                                                            {info.stopDate && (
                                                                <div className="mt-1">
                                                                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] px-1.5 py-0">
                                                                        🛑 Parou em: {formatIsoToBr(info.stopDate)}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="w-[175px] space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                                                        {info.fulfilledDays} / {info.totalNoticeDays} dias
                                                                    </span>
                                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                        - {formatCurrencyEur(info.fulfilledAmount)}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all ${
                                                                            info.computedStatus === 'abandoned'
                                                                                ? 'bg-rose-500'
                                                                                : info.computedStatus === 'completed'
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-amber-500'
                                                                        }`}
                                                                        style={{ width: `${progressPct}%` }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between pt-0.5">
                                                                    {info.computedStatus === 'abandoned' ? (
                                                                        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0">
                                                                            🛑 Abandonou / Parou
                                                                        </Badge>
                                                                    ) : info.computedStatus === 'completed' ? (
                                                                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                                            ✅ Aviso Cumprido
                                                                        </Badge>
                                                                    ) : info.computedStatus === 'waived' ? (
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                                                                            ⚪ Isento de Desconto
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                                                                            ⏳ Em Cumprimento ({info.remainingDays}d rest.)
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                className="text-left group"
                                                                title="Clique para ajustar o valor base (ex: € 460,00)"
                                                            >
                                                                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                                                    <span>{formatCurrencyEur(info.penaltyTotal)}</span>
                                                                    <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground font-mono">
                                                                    {formatCurrencyEur(info.dailyRate)} / dia
                                                                </div>
                                                            </button>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className={`text-sm font-black font-mono ${
                                                                    !info.applyDeduction || info.finalToDeduct === 0
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : 'text-rose-600 dark:text-rose-400'
                                                                }`}>
                                                                    {formatCurrencyEur(info.finalToDeduct)}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickToggleDeduction(c)}
                                                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                                                        info.applyDeduction
                                                                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                                                    }`}
                                                                    title="Clique para alternar entre Descontar na Folha ou Isentar"
                                                                >
                                                                    {info.applyDeduction ? '💰 Descontar na Folha' : '⚪ Não Descontar (Isento)'}
                                                                </button>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                            {info.computedStatus !== 'completed' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleOpenEditNotice(c, true)}
                                                                    className="h-8 text-xs font-semibold border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2.5"
                                                                    title="Informar data em que o trabalhador abandonou/parou e travar valor para desconto em folha"
                                                                >
                                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                                    Parar / Abandonou
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleOpenEditNotice(c, false)}
                                                                className="h-8 text-xs font-semibold gap-1 px-2.5"
                                                                title="Editar datas, dias trabalhados no mês e valores do aviso prévio"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                                                                Gerenciar
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteContractItem(c.id)}
                                                                title="Excluir Registro"
                                                                className="h-8 w-8"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-rose-500 hover:text-rose-700" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Conteúdo 4: Configuração de Modelos */}
                    <TabsContent value="templates" className="flex-1 overflow-y-auto min-h-0 pt-4">
                        <div className="rounded-md border bg-card p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                        Modelos de Contratos e Documentos
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Selecione a empresa contratante para gerenciar e customizar os modelos de arquivo .docx
                                    </p>
                                </div>
                                <div className="w-full md:w-[320px]">
                                    <Label className="text-xs text-slate-500 font-semibold mb-1 block">Empresa Contratante</Label>
                                    <Select value={selectedConfigContratante} onValueChange={setSelectedConfigContratante}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione a empresa contratante..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STOCCO">Stocco</SelectItem>
                                            <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                            <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                            <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                            <SelectItem value="TRIANGULO">Triangulo</SelectItem>
                                            <SelectItem value="HEXAGON">Hexagon</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                                {[
                                    {
                                        type: 'contrato_termo_incerto',
                                        name: 'Contrato a Termo Incerto (Passaporte)',
                                        desc: 'Modelo padrão para admissão de trabalhadores temporários identificados por número de Passaporte.',
                                        fileName: `CONTRATO TERMO INCERTO - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'contrato_nis',
                                        name: 'Contrato NIS (NIF)',
                                        desc: 'Modelo padrão para admissão de trabalhadores com identificação NISS/NIF registrada.',
                                        fileName: `CONTRATO NIS - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'contrato_alta',
                                        name: 'Contrato de Alta (Sem Assinatura)',
                                        desc: 'Modelo enviado diretamente à contabilidade/administrativo. Não exige assinatura eletrônica do trabalhador.',
                                        fileName: `CONTRATO DE ALTA - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'rescisao',
                                        name: 'Carta de Rescisão (Solicitud de Rescisión)',
                                        desc: 'Modelo oficial em espanhol com cálculo de 15 dias de aviso prévio. Variáveis dinâmicas suportadas no Word: {{nome}}, {{linha_documentos}}, {{data_carta_extenso_es}}, {{data_efeito}}, {{data_inicio_aviso}}, {{data_fim_aviso}} e [ASSINATURA].',
                                        fileName: `COMUNICADO RESCISAO ${selectedConfigContratante.toUpperCase()}.docx`
                                    }
                                ].map((doc) => (
                                    <div key={doc.type} className="flex flex-col justify-between border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/50 dark:bg-slate-900/20 hover:shadow-sm transition-all">
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</h4>
                                                <Badge variant="outline" className="text-[10px] font-mono border-indigo-100 bg-indigo-50/30 text-indigo-600 dark:border-slate-800 dark:text-indigo-400">
                                                    .docx
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{doc.desc}</p>
                                            <div className="pt-2 text-[11px] font-mono text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-800 mt-2">
                                                <div><span className="text-slate-500">Pasta:</span> {selectedConfigContratante}/</div>
                                                <div className="truncate"><span className="text-slate-500">Arquivo:</span> {doc.fileName}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 pt-5 border-t border-slate-200 dark:border-slate-800/80 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => handleDownloadConfigTemplate(doc.type)}
                                                disabled={downloadingTemplate === doc.type}
                                            >
                                                {downloadingTemplate === doc.type ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                        Baixando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                                                        Baixar Modelo
                                                    </>
                                                )}
                                            </Button>
                                            
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => triggerUpload(doc.type)}
                                                disabled={uploadingTemplate === doc.type}
                                            >
                                                {uploadingTemplate === doc.type ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                                        Subir Novo
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Input de Arquivo oculto para upload de templates */}
                        <input
                            type="file"
                            ref={configFileInputRef}
                            onChange={handleUploadConfigTemplate}
                            accept=".docx"
                            className="hidden"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal Lado a Lado de Verificação (Revisão OCR) */}
            <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
                <DialogContent className="max-w-7xl h-[85vh] flex flex-col bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    Revisão e Visualização de Documentos do Trabalhador
                                </DialogTitle>
                                <DialogDescription>
                                    Visualize e baixe os documentos originais (Identificação, NIF, NISS, Carta de Condução, Selfie) enviados pelo trabalhador.
                                </DialogDescription>
                            </div>
                            {selectedRequest && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold gap-1.5"
                                        onClick={handleDownloadCurrentDoc}
                                    >
                                        <Download className="h-4 w-4" /> Baixar Doc Atual
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
                                        onClick={handleDownloadAllDocs}
                                    >
                                        <Download className="h-4 w-4" /> Baixar Todos os Anexos
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden pt-2">
                            {/* Painel Esquerdo: Anexos Enviados */}
                            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
                                {/* Navegador de Abas de Anexos */}
                                <div className="flex border-b dark:border-slate-800 text-xs font-semibold bg-slate-100 dark:bg-slate-800/80">
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('identity')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'identity' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Identificação {selectedRequest.passport_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('nif')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'nif' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NIF {selectedRequest.nif_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('niss')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'niss' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NISS {selectedRequest.niss_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('license')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'license' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Carta {selectedRequest.license_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('iban')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'iban' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        IBAN {(selectedRequest.iban_url || selectedRequest.extracted_data?.iban_url) ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('selfie')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'selfie' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Selfie {selectedRequest.selfie_url ? '●' : ''}
                                    </button>
                                </div>

                                {/* Barra de Ação Rápida: Classificar & Anexar ao Cadastro do Trabalhador */}
                                <div className="p-2.5 bg-indigo-950/40 border-b border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                                        <span className="text-[11px] font-semibold text-indigo-300 shrink-0">Tipo no Cadastro:</span>
                                        <select
                                            value={selectedAttachDocType}
                                            onChange={(e) => setSelectedAttachDocType(e.target.value)}
                                            className="h-8 text-xs bg-slate-900 border border-slate-700 text-white rounded px-2 w-full flex-1 focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="foto">Foto do Trabalhador</option>
                                            <option value="passaporte">Passaporte</option>
                                            <option value="identificacao">Doc. Identificação Genérica</option>
                                            <option value="nif">NIF</option>
                                            <option value="niss">NISS</option>
                                            <option value="permision_conducir">Permissão de Condução</option>
                                            <option value="certificado_banco">Cert. Titularidade Banco</option>
                                            <option value="autorizacao_banco">Autorização Mudança Conta Banco</option>
                                            <option value="contrato_trabalho">Contrato de Trabalho</option>
                                            <option value="contrato_alta">Contrato de Alta</option>
                                            <option value="doc_alta_seguridade">Doc Alta Seguridade</option>
                                            <option value="doc_baixa_seguridade">Doc Baixa Seguridade</option>
                                            <option value="doc_anulacao_alta">Anulação de Alta</option>
                                            <option value="carta_renuncia">Carta de Renuncia</option>
                                            <option value="carta_laboral">Carta Laboral</option>
                                            <option value="prova_vida">Prova de Vida</option>
                                            <option value="nomina">Recibo de Vencimento (Nómina)</option>
                                            <option value="a1">Certificado A1</option>
                                            <option value="apto_medico">Apto Médico</option>
                                            <option value="prl_certificate">Certificado PRL</option>
                                            <option value="epi_recibo">Recibo de EPIs</option>
                                            <option value="outros">Outros</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 flex-wrap justify-end">
                                        {activeDocUrl && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={rejectingDoc || uploadingDoc}
                                                onClick={handleRejectCurrentDoc}
                                                className="h-8 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold gap-1 shrink-0 px-2.5"
                                                title="Recusar e eliminar o documento atual desta aba para liberar novo envio"
                                            >
                                                {rejectingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                Recusar / Eliminar
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={uploadingDoc}
                                            onClick={() => docFileInputRef.current?.click()}
                                            className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1 shrink-0 px-3"
                                            title="Carregar ou substituir o documento desta categoria"
                                        >
                                            {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                                            {activeDocUrl ? 'Substituir Arquivo' : 'Carregar Arquivo'}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!activeDocUrl || savingAttachDoc}
                                            onClick={handleSaveDocToWorkerProfile}
                                            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1 shrink-0 px-3 w-full sm:w-auto"
                                        >
                                            {savingAttachDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                            Anexar ao Cadastro
                                        </Button>
                                    </div>
                                </div>

                                {/* Preview da Imagem & Dropzone de Upload */}
                                <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 overflow-auto relative">
                                    <input
                                        type="file"
                                        ref={docFileInputRef}
                                        onChange={handleUploadDocForCurrentTab}
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                    />
                                    {uploadingDoc && (
                                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2 text-white">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                                            <span className="text-sm font-medium">Enviando e processando arquivo...</span>
                                        </div>
                                    )}
                                    {activeDocUrl ? (
                                        activeDocUrl.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                                            <iframe src={activeDocUrl} className="w-full h-full border-none rounded bg-white" title="PDF Document Viewer" />
                                        ) : (
                                            <img src={activeDocUrl} className="max-w-full max-h-full object-contain rounded" alt="Document Preview" />
                                        )
                                    ) : (
                                        <div 
                                            onClick={() => docFileInputRef.current?.click()}
                                            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-900/60 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all max-w-sm"
                                        >
                                            <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                <UploadCloud className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-200">Nenhum arquivo enviado para {activeDocTab.toUpperCase()}</p>
                                                <p className="text-xs text-slate-400 mt-1">Clique aqui para carregar o arquivo (Foto/PDF) enviado pelo trabalhador via WhatsApp ou e-mail</p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="mt-2 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                                            >
                                                <Upload className="h-3.5 w-3.5 mr-1" /> Selecionar Arquivo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Painel Direito: Formulário com Dados do OCR */}
                            <form onSubmit={handleApproveVerify} className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 p-4 justify-between overflow-y-auto">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 text-sm">Dados Cadastrais Revisados</h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs">Nome Completo</Label>
                                            <Input required value={verifyFormData.nome} onChange={(e) => setVerifyFormData({ ...verifyFormData, nome: e.target.value })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Banco / Entidade</Label>
                                                <Input value={verifyFormData.banco} onChange={(e) => setVerifyFormData({ ...verifyFormData, banco: e.target.value })} placeholder="Ex: Santander, Revolut" />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Número de IBAN</Label>
                                                <Input value={verifyFormData.iban} onChange={(e) => setVerifyFormData({ ...verifyFormData, iban: e.target.value })} placeholder="Ex: ES91 2100..." className="font-mono text-xs" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">NIF (Portugal)</Label>
                                                <Input value={verifyFormData.nif} onChange={(e) => setVerifyFormData({ ...verifyFormData, nif: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">NISS (Portugal)</Label>
                                                <Input value={verifyFormData.niss} onChange={(e) => setVerifyFormData({ ...verifyFormData, niss: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <Label className="text-xs">DNI</Label>
                                                <Input value={verifyFormData.dni} onChange={(e) => setVerifyFormData({ ...verifyFormData, dni: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">NIE</Label>
                                                <Input value={verifyFormData.nie} onChange={(e) => setVerifyFormData({ ...verifyFormData, nie: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Passaporte</Label>
                                                <Input value={verifyFormData.pasaporte} onChange={(e) => setVerifyFormData({ ...verifyFormData, pasaporte: e.target.value })} />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Carta de Condução / Habilitação</Label>
                                            <Input value={verifyFormData.licencia_conducir} onChange={(e) => setVerifyFormData({ ...verifyFormData, licencia_conducir: e.target.value })} />
                                        </div>

                                         <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">Nacionalidade</Label>
                                                <Input value={verifyFormData.nacionalidade} onChange={(e) => setVerifyFormData({ ...verifyFormData, nacionalidade: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Data de Nascimento (AAAA-MM-DD)</Label>
                                                <Input type="date" value={verifyFormData.fecha_nacimiento} onChange={(e) => setVerifyFormData({ ...verifyFormData, fecha_nacimiento: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto & Moradas</h5>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Correo Electrónico (E-mail)</Label>
                                                    <Input type="email" value={verifyFormData.email} onChange={(e) => setVerifyFormData({ ...verifyFormData, email: e.target.value })} placeholder="email@exemplo.com" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Telefone / Telemóvel (Móvil)</Label>
                                                    <Input type="tel" value={verifyFormData.movil} onChange={(e) => setVerifyFormData({ ...verifyFormData, movil: e.target.value })} placeholder="+34 600... / +55..." />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Ubicación / Cidade e País</Label>
                                                    <Input value={verifyFormData.ubicacion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, ubicacion_actual: e.target.value })} placeholder="Ex: Madrid, España" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Endereço / Morada Atual (Origem)</Label>
                                                    <Input value={verifyFormData.direccion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, direccion_actual: e.target.value })} placeholder="Ex: Calle Mayor 12, 3ºB" />
                                                </div>
                                            </div>

                                            {/* Campo para Endereço Oficial do Contrato em Portugal */}
                                            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                                                <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Endereço para Contrato (Portugal)
                                                </Label>
                                                <Input 
                                                    value={verifyFormData.morada_contrato} 
                                                    onChange={(e) => setVerifyFormData({ ...verifyFormData, morada_contrato: e.target.value })} 
                                                    placeholder="Ex: Rua Garrett 25, 2º Dto, 1200-203 Lisboa, Portugal" 
                                                    className="bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-sm font-medium"
                                                />
                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                                                    * Se preenchido, este endereço de Portugal será utilizado na morada do contrato em vez do endereço de origem.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto de Emergência / Familiar</h5>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs">Nome do Familiar</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_nombre} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_nombre: e.target.value })} placeholder="Nome completo" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Parentesco</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_parentesco} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_parentesco: e.target.value })} placeholder="Ex: Esposa" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Telefone</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_telefono} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_telefono: e.target.value })} placeholder="+34 600..." />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Tamanhos de Uniforme / EPI</h5>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Talla Camisa / Polo</Label>
                                                    <Input value={verifyFormData.talla_camisa} onChange={(e) => setVerifyFormData({ ...verifyFormData, talla_camisa: e.target.value })} placeholder="Ex: M, L, XL" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Talla Pantalón</Label>
                                                    <Input value={verifyFormData.talla_pantalon} onChange={(e) => setVerifyFormData({ ...verifyFormData, talla_pantalon: e.target.value })} placeholder="Ex: 40, 42, 44" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t mt-4">
                                    <Button type="button" variant="outline" className="px-4" onClick={() => setVerifyDialogOpen(false)}>Fechar</Button>
                                    <Button type="submit" disabled={verifying} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                        {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {selectedRequest?.status === 'verified' ? 'Salvar Alterações no Cadastro' : 'Aprovar & Salvar no Cadastro'}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        disabled={verifying} 
                                        onClick={() => handleApproveVerify(undefined, true)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5"
                                    >
                                        {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4" />}
                                        Salvar & Gerar Contrato ⚡
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Gerenciamento de Trabalhadores da Solicitação */}
            <Dialog open={workersDialogOpen} onOpenChange={setWorkersDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Trabalhadores da Solicitação {selectedTaskForWorkers?.solicitud?.codigo}
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie o envio de documentos, contato via WhatsApp e emissão de contratos para os trabalhadores vinculados a este pedido.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumo da solicitação/pedido (Card Premium Executivo) */}
                    {taskMetadata && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-4 shadow-xl mb-3 mt-1 relative overflow-hidden">
                            {/* Glow de fundo */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
                                {/* 1. DATA DE INÍCIO PREVISTA (DESTAQUE MÁXIMO URGÊNCIA) */}
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                                            Início Previsto
                                        </span>
                                        {taskMetadata.expectedStartDate && (
                                            <Badge className={`text-[10px] px-1.5 py-0.5 border ${
                                                getStartDateUrgency(taskMetadata.expectedStartDate).badgeClass
                                            }`}>
                                                {getStartDateUrgency(taskMetadata.expectedStartDate).text}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xl font-black text-amber-300 tracking-tight my-0.5">
                                        {taskMetadata.expectedStartDate ? formatHeaderDate(taskMetadata.expectedStartDate) : 'A Definir'}
                                    </div>
                                    {taskMetadata.expectedEndDate ? (
                                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                            Até: <span className="font-semibold text-white">{formatHeaderDate(taskMetadata.expectedEndDate)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-slate-400">Duração indeterminada</div>
                                    )}
                                </div>

                                {/* 2. CLIENTE & CONTRATANTE */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1 mb-1">
                                            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                                            Cliente & Grupo
                                        </span>
                                        <div className="text-base font-bold text-white leading-snug truncate" title={taskMetadata.clientName}>
                                            {taskMetadata.clientName}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                                        <span className="text-slate-400">Contratante:</span>
                                        <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-200 border-indigo-400/30 px-2 py-0">
                                            {taskMetadata.empresaName || 'N/A'}
                                        </Badge>
                                    </div>
                                </div>

                                {/* 3. LOCAL / OBRA & ENDEREÇO */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1 mb-1">
                                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                            Local / Obra
                                        </span>
                                        <div className="text-sm font-bold text-white truncate" title={taskMetadata.siteName}>
                                            {taskMetadata.siteName}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-1 truncate" title={taskMetadata.siteAddressFormatted || 'Sem endereço específico'}>
                                        {taskMetadata.siteAddressFormatted ? (
                                            <span className="text-slate-200">{taskMetadata.siteAddressFormatted}</span>
                                        ) : (
                                            <span className="italic text-slate-400">Endereço do cliente</span>
                                        )}
                                    </div>
                                </div>

                                {/* 4. PEDIDO & REGISTRO DA SOLICITAÇÃO */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1 mb-1">
                                            <FileText className="h-3.5 w-3.5 text-sky-400" />
                                            Pedido / Código
                                        </span>
                                        <div className="font-mono text-xs font-bold text-sky-200 bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 rounded inline-block truncate max-w-full" title={taskMetadata.pedidoCode}>
                                            {taskMetadata.pedidoCode}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
                                        <span className="text-slate-400">Criado em:</span>
                                        <span className="font-medium text-white">{taskMetadata.requestedAt ? formatHeaderDate(taskMetadata.requestedAt) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 relative min-h-[300px] border rounded-lg mt-2 [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                        {loadingTaskWorkers ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <span>Carregando trabalhadores...</span>
                            </div>
                        ) : taskWorkers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 h-full">
                                <AlertCircle className="h-10 w-10 text-slate-400" />
                                <span>Nenhum trabalhador vinculado a este pedido foi encontrado.</span>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                    <TableRow>
                                        <TableHead>Trabalhador</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Status Documentos</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taskWorkers.map((item) => {
                                        const phone = item.worker?.movil || 'Sem telefone';
                                        
                                        // Determinar status do convite de documentos
                                        const docStatus = item.docRequest?.status;
                                        const isVacantReplacement = item.is_replacement && !item.worker;
                                        
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {isVacantReplacement ? (
                                                        <>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                                                                    A Definir (Substituto)
                                                                </span>
                                                            </div>
                                                            {item.replaced_worker && (
                                                                <div className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">
                                                                    Substituindo: {item.replaced_worker.nome} (Cód: {item.replaced_worker.cod_colab || 'N/A'})
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {item.worker?.nome || 'N/A'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Cód: {item.worker?.cod_colab || 'N/A'} | Tel: {phone}
                                                            </div>
                                                            {item.is_replacement && item.replaced_worker && (
                                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                                                    Substituindo: {item.replaced_worker.nome}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {item.worker?.funcion || item.target_job_function_name || item.replaced_worker?.funcion || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {isVacantReplacement ? (
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200">
                                                            Aguardando Contratação
                                                        </Badge>
                                                    ) : !item.docRequest ? (
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200">
                                                            Sem Link de Envio
                                                        </Badge>
                                                    ) : docStatus === 'verified' ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                                            Cadastro Validado
                                                        </Badge>
                                                    ) : docStatus === 'submitted' ? (
                                                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
                                                            Recebido - Analisar
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                                            Aguardando Envio
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                    {/* Analisar Button */}
                                                    {docStatus === 'submitted' && item.worker && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                            onClick={() => handleOpenVerify(item.docRequest)}
                                                            title="Analisar documentos enviados"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            Analisar
                                                        </Button>
                                                    )}

                                                    {/* WhatsApp Button */}
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                                                        onClick={() => handleSendWhatsApp(item)}
                                                        title="Enviar mensagem com template via WhatsApp"
                                                        disabled={isVacantReplacement}
                                                    >
                                                        <Send className="h-3 w-3" />
                                                        WhatsApp
                                                    </Button>

                                                    {/* Copiar Link Button */}
                                                     {item.docRequest ? (
                                                         <Button
                                                             size="sm"
                                                             variant="outline"
                                                             className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                                             onClick={() => handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${item.docRequest.token}`, item.worker?.nome)}
                                                             title="Copiar mensagem com link formatado"
                                                             disabled={isVacantReplacement}
                                                         >
                                                             <Copy className="h-3.5 w-3.5 mr-1" />
                                                             Link
                                                         </Button>
                                                     ) : (
                                                         <Button
                                                             size="sm"
                                                             variant="outline"
                                                             className="text-slate-600 hover:text-indigo-600"
                                                             onClick={async () => {
                                                                  if (isVacantReplacement) return;
                                                                  try {
                                                                      const empId = taskMetadata?.empresaId || selectedEmpresaId!;
                                                                      const res = await createDocumentRequest(empId, item.worker.id, taskMetadata?.clientId);
                                                                      setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: res } : w));
                                                                      loadDocRequests();
                                                                      handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${res.token}`, item.worker?.nome);
                                                                  } catch (err) {
                                                                      toast.error("Erro ao criar link cadastral.");
                                                                  }
                                                              }}
                                                             title="Criar e copiar mensagem com link"
                                                             disabled={isVacantReplacement}
                                                         >
                                                             <Plus className="h-3.5 w-3.5 mr-1" />
                                                             Criar Link
                                                         </Button>
                                                     )}

                                                    {/* Gerar Contrato Button */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
                                                        onClick={() => {
                                                            if (isVacantReplacement) return;
                                                            setWorkersDialogOpen(false);
                                                            handleTriggerGenerate(item.worker.id, taskMetadata?.empresaId || item.empresa_id || selectedEmpresaId, item.worker);
                                                        }}
                                                        title="Emitir contrato de trabalho"
                                                        disabled={isVacantReplacement}
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                        <Button variant="outline" onClick={() => setWorkersDialogOpen(false)}>Fechar</Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Modal de Gestão e Inclusão no Controle de Aviso Prévio */}
            <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Clock className="h-5 w-5 text-amber-500" />
                            {noticeDialogMode === 'create'
                                ? 'Incluir Trabalhador no Controle de Aviso Prévio'
                                : `Gerenciar Aviso Prévio & Desconto — ${noticeWorkerName}`}
                        </DialogTitle>
                        <DialogDescription>
                            {noticeDialogMode === 'create'
                                ? 'Adicione um trabalhador ao controle de aviso prévio (ex: carta assinada manualmente) para acompanhar os 15 dias corridos, os dias trabalhados no mês e o saldo a descontar na folha.'
                                : 'Ajuste a data de início no trabalho, os dias trabalhados no mês, o valor base do aviso (€ 460,00 padrão) ou registre a data de abandono/encerramento para congelar o valor a descontar na folha.'}
                        </DialogDescription>
                    </DialogHeader>

                    {(() => {
                        const parsedPenalty = Number(String(noticePenaltyTotal).replace(',', '.'));
                        const safePenalty = Number.isFinite(parsedPenalty) && parsedPenalty >= 0 ? parsedPenalty : 460;
                        const dailyRatePreview = safePenalty / 15;
                        const today = todayIsoStr();

                        let previewFulfilledDays = 0;
                        if (noticeFulfilledDaysOverride.trim() !== '' && Number.isFinite(Number(noticeFulfilledDaysOverride))) {
                            previewFulfilledDays = Math.max(0, Math.min(15, Number(noticeFulfilledDaysOverride)));
                        } else if (noticeStatus === 'completed') {
                            previewFulfilledDays = 15;
                        } else if (noticeStatus === 'abandoned' && !noticeStopDate) {
                            previewFulfilledDays = 0;
                        } else {
                            const ref = noticeStopDate || today;
                            previewFulfilledDays = Math.max(0, Math.min(15, getDaysDiff(noticeStartDate, ref)));
                        }

                        const previewAbatido = Math.min(safePenalty, previewFulfilledDays * dailyRatePreview);
                        const previewRestante = Math.max(0, Number((safePenalty - previewAbatido).toFixed(2)));
                        const previewFinalDesconto = noticeApplyDeduction ? previewRestante : 0;

                        return (
                            <form onSubmit={handleSaveNoticeModal} className="space-y-5 pt-2">
                                {noticeDialogMode === 'create' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">Trabalhador *</Label>
                                            <Combobox
                                                options={workersList}
                                                value={noticeWorkerId}
                                                onChange={(val) => handleSelectManualNoticeWorker(val)}
                                                placeholder="Buscar por nome, passaporte, NIF ou código..."
                                                emptyText="Nenhum trabalhador encontrado."
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">Empresa Contratante *</Label>
                                            <Select value={noticeContratante} onValueChange={setNoticeContratante}>
                                                <SelectTrigger className="bg-white dark:bg-black">
                                                    <SelectValue placeholder="Selecione a empresa..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STOCCO">Stocco</SelectItem>
                                                    <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                                    <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                                    <SelectItem value="TRIANGULO">Triângulo</SelectItem>
                                                    <SelectItem value="HEXAGON">Hexagon</SelectItem>
                                                    <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{noticeWorkerName}</div>
                                            <div className="text-xs text-slate-500">Empresa: <strong>{noticeContratante}</strong></div>
                                        </div>
                                        <Badge variant="outline" className="w-fit text-xs font-mono">
                                            Período: {formatIsoToBr(noticeStartDate)} → {formatIsoToBr(noticeEndDate)}
                                        </Badge>
                                    </div>
                                )}

                                {/* Bloco 1: Início do Trabalho (Admissão) e Controle de Dias Trabalhados no Mês */}
                                <div className="p-4 rounded-lg border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            1. Histórico de Trabalho & Dias Trabalhados no Mês
                                        </h4>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setNoticeMonthWorkedDays('0')}
                                            className="h-6 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2"
                                        >
                                            Zerar Dias no Mês (Abandono s/ Saldo)
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">Data que Iniciou o Trabalho (Admissão)</Label>
                                            <Input
                                                type="date"
                                                value={noticeWorkStartDate}
                                                onChange={(e) => {
                                                    const ws = e.target.value;
                                                    setNoticeWorkStartDate(ws);
                                                    const autoDays = computeDefaultMonthWorkedDays(ws || null, noticeStartDate, noticeStopDate || null, today);
                                                    setNoticeMonthWorkedDays(String(autoDays));
                                                }}
                                                className="bg-white dark:bg-black"
                                            />
                                            <p className="text-[11px] text-slate-500">
                                                Data em que o colaborador começou a trabalhar na empresa/obra.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">Dias Trabalhados no Mês da Rescisão</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={31}
                                                value={noticeMonthWorkedDays}
                                                onChange={(e) => setNoticeMonthWorkedDays(e.target.value)}
                                                className="bg-white dark:bg-black font-bold"
                                            />
                                            <p className="text-[11px] text-slate-500">
                                                Ex: pediu aviso dia 15 → tem 15 dias trabalhados no mês para abater/conferir na folha.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloco 2: Período de 15 Dias e Valor Base (€ 460,00 padrão) */}
                                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        2. Período do Aviso Prévio (15 Dias Corridos) & Valor Base
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold leading-tight block">Início do Aviso Prévio</Label>
                                            <Input
                                                type="date"
                                                value={noticeStartDate}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNoticeStartDate(val);
                                                    if (val) {
                                                        setNoticeEndDate(addDaysToIso(val, 15));
                                                    }
                                                }}
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold leading-tight block">Fim do Aviso (15 dias)</Label>
                                            <Input
                                                type="date"
                                                value={noticeEndDate}
                                                onChange={(e) => setNoticeEndDate(e.target.value)}
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold leading-tight block">
                                                Valor Total do Aviso (€)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={noticePenaltyTotal}
                                                    onChange={(e) => setNoticePenaltyTotal(e.target.value)}
                                                    className="bg-white dark:bg-black font-bold pr-24"
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">
                                                    {formatCurrencyEur(dailyRatePreview)}/d
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        O sábado e o domingo contam como dias cumpridos. A cada dia cumprido, o saldo diminui <strong>{formatCurrencyEur(dailyRatePreview)}</strong>.
                                    </p>
                                </div>

                                {/* Bloco 3: Controle de Cumprimento / Parada por Abandono */}
                                <div className="p-4 rounded-lg border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/15 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4" />
                                        3. Situação de Cumprimento / Parada por Abandono
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoticeStatus('in_progress');
                                                setNoticeStopDate('');
                                                setNoticeFulfilledDaysOverride('');
                                            }}
                                            className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                                                noticeStatus === 'in_progress'
                                                    ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div>⏳ Em Cumprimento</div>
                                            <div className="text-[10px] font-normal opacity-80 mt-0.5">Vai diminuindo dia a dia</div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoticeStatus('abandoned');
                                                const defaultStop = noticeStopDate || today;
                                                setNoticeStopDate(defaultStop);
                                                const autoF = Math.max(0, Math.min(15, getDaysDiff(noticeStartDate, defaultStop)));
                                                setNoticeFulfilledDaysOverride(String(autoF));
                                            }}
                                            className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                                                noticeStatus === 'abandoned'
                                                    ? 'border-rose-600 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div>🛑 Abandonou / Parou</div>
                                            <div className="text-[10px] font-normal opacity-80 mt-0.5">Trava o valor p/ descontar</div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoticeStatus('completed');
                                                setNoticeStopDate('');
                                                setNoticeFulfilledDaysOverride('15');
                                            }}
                                            className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                                                noticeStatus === 'completed'
                                                    ? 'border-emerald-600 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div>✅ Cumpriu 15 Dias</div>
                                            <div className="text-[10px] font-normal opacity-80 mt-0.5">Saldo zerado (€ 0,00)</div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                Data em que Encerrou / Abandonou (Parar Contagem)
                                            </Label>
                                            <Input
                                                type="date"
                                                value={noticeStopDate}
                                                onChange={(e) => {
                                                    const stopVal = e.target.value;
                                                    setNoticeStopDate(stopVal);
                                                    if (stopVal) {
                                                        setNoticeStatus('abandoned');
                                                        const autoF = Math.max(0, Math.min(15, getDaysDiff(noticeStartDate, stopVal)));
                                                        setNoticeFulfilledDaysOverride(String(autoF));
                                                    }
                                                }}
                                                className="bg-white dark:bg-black"
                                            />
                                            <p className="text-[11px] text-slate-500">
                                                Se o trabalhador saiu antes, informe a data para congelar o saldo restante.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold">Dias de Aviso Cumpridos (0 a 15)</Label>
                                                {noticeFulfilledDaysOverride !== '' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setNoticeFulfilledDaysOverride('')}
                                                        className="text-[10px] text-indigo-600 hover:underline"
                                                    >
                                                        Usar cálculo automático
                                                    </button>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={15}
                                                placeholder={`Automático (${previewFulfilledDays} dias)`}
                                                value={noticeFulfilledDaysOverride}
                                                onChange={(e) => setNoticeFulfilledDaysOverride(e.target.value)}
                                                className="bg-white dark:bg-black font-bold"
                                            />
                                            <p className="text-[11px] text-slate-500">
                                                Deixe em branco para reduzir automaticamente a cada dia ou digite (ex: 0 se abandonou no 1º dia).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs font-semibold">Descontar este aviso na folha?</Label>
                                            <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => setNoticeApplyDeduction(true)}
                                                    className={`px-3 py-1 text-xs font-bold ${
                                                        noticeApplyDeduction
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-white dark:bg-slate-900 text-slate-600'
                                                    }`}
                                                >
                                                    Sim, Descontar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNoticeApplyDeduction(false)}
                                                    className={`px-3 py-1 text-xs font-bold ${
                                                        !noticeApplyDeduction
                                                            ? 'bg-slate-700 text-white'
                                                            : 'bg-white dark:bg-slate-900 text-slate-600'
                                                    }`}
                                                >
                                                    Não (Isentar)
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 max-w-xs">
                                            <Input
                                                placeholder="Observações (ex: abandonou a obra dia 29)..."
                                                value={noticeNotes}
                                                onChange={(e) => setNoticeNotes(e.target.value)}
                                                className="h-8 text-xs bg-white dark:bg-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Card Resumo Final de Cálculo para a Folha */}
                                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                            Resumo do Cálculo para Fechamento de Folha
                                        </div>
                                        <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span>Dias Trab. no Mês: <strong className="text-white">{noticeMonthWorkedDays || 0} dias</strong></span>
                                            <span>•</span>
                                            <span>Aviso Cumprido: <strong className="text-emerald-400">{previewFulfilledDays}/15 dias (- {formatCurrencyEur(previewAbatido)})</strong></span>
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right shrink-0">
                                        <div className="text-[11px] uppercase tracking-wider text-rose-300 font-semibold">
                                            Valor a Descontar na Folha
                                        </div>
                                        <div className="text-2xl font-black text-rose-400 font-mono">
                                            {formatCurrencyEur(previewFinalDesconto)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setNoticeDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={savingNotice}
                                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5"
                                    >
                                        {savingNotice ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        {noticeDialogMode === 'create' ? 'Incluir no Aviso Prévio' : 'Salvar Alterações do Aviso'}
                                    </Button>
                                </div>
                            </form>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
