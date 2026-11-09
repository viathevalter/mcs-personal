import React, { useEffect, useState, useRef, useMemo } from 'react';
import { renderAsync } from 'docx-preview';
import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { 
    listContracts, generateContract, deleteContract, updateContractNoticeMetadata, createManualNoticeEntry, consolidateNoticeDiscountToPayroll,
    signContractAsCompany, requestCompanyOtp, getCompanyContractSettings, updateCompanyContractSettings, type Contract,
    listDocumentRequests, createDocumentRequest, reopenDocumentRequest, updateDocumentRequest, deleteDocumentRequest, approveDocumentRequest, processDocumentOcr, HEXAGON_EMPRESA_ID, type DocumentRequest
} from '../api/contractsApi';
import { PdfCanvasViewer } from '../components/PdfCanvasViewer';
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
    FileText, Copy, ExternalLink, Plus, RefreshCw, CheckCircle, CheckCircle2,
    Mail, AlertCircle, Loader2, Eye, ShieldCheck, Camera,
    MessageSquare, Send, Search, X, Pencil, Trash2, Download, Building2,
    Calendar, MapPin, Clock, AlertTriangle, FolderPlus, ArrowUpDown, ArrowUp, ArrowDown, Package,
    UploadCloud, Upload, PenTool, Settings2, Save, Eraser, Type, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
        payrollDiscountId: c.metadata?.payroll_discount_id || null,
        payrollCompetence: c.metadata?.payroll_competence || null,
        payrollConsolidatedAmount: c.metadata?.payroll_consolidated_amount !== undefined && c.metadata?.payroll_consolidated_amount !== null
            ? Number(c.metadata.payroll_consolidated_amount)
            : null,
        payrollConsolidatedAt: c.metadata?.payroll_consolidated_at || null,
        payrollStopReason: c.metadata?.payroll_stop_reason || '',
    };
};

const formatCompetenceLabel = (ym?: string | null): string => {
    if (!ym) return '';
    const m = String(ym).match(/^(\d{4})-(\d{2})/);
    if (!m) return ym;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const idx = Number(m[2]) - 1;
    return `${months[idx] || m[2]}/${m[1]}`;
};

const buildAutoPayrollDescription = (params: {
    competenceMonth: string;
    startNotice: string;
    endNotice: string;
    stopDate: string;
    fulfilledDays: number;
    totalDays: number;
    dailyRate: number;
    penaltyTotal: number;
    finalDiscount: number;
    stopReason: string;
    extraNotes?: string;
    monthWorkedDays?: string | number;
}): string => {
    const missingDays = Math.max(0, params.totalDays - params.fulfilledDays);
    const compParts = (params.competenceMonth || '').split('-');
    const compFormatted = compParts.length === 2 ? `${compParts[1]}/${compParts[0]}` : params.competenceMonth;
    const parts = [
        `PREAVISO NO CUMPLIDO (Último Salario - Comp. ${compFormatted})`,
        `Motivo: ${params.stopReason || 'Abandono / Incumplimiento del preaviso'}`,
        `Período a cumplir (${params.totalDays}d): ${formatIsoToBr(params.startNotice)} a ${formatIsoToBr(params.endNotice)}`,
        `Fecha en que cesó: ${params.stopDate ? formatIsoToBr(params.stopDate) : 'No informada'}`,
        `Regla: Cumplió ${params.fulfilledDays} de ${params.totalDays} días | Faltaron ${missingDays} días (${formatCurrencyEur(params.dailyRate)}/día)`,
        `Importe Descontado: ${formatCurrencyEur(params.finalDiscount)} (Base ${formatCurrencyEur(params.penaltyTotal)})`,
    ];
    if (params.monthWorkedDays !== undefined && String(params.monthWorkedDays).trim() !== '') {
        parts.push(`Días trab. en el mes: ${params.monthWorkedDays}d`);
    }
    if (params.extraNotes && params.extraNotes.trim() && params.extraNotes.trim().toLowerCase() !== (params.stopReason || '').trim().toLowerCase()) {
        parts.push(`Obs: ${params.extraNotes.trim()}`);
    }
    return parts.join(' | ');
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
    if (!dateStr) return { text: 'Por Definir', badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-400/30' };
    
    try {
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        targetDate.setHours(0,0,0,0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `Ya Inició (hace ${Math.abs(diffDays)}d)`, badgeClass: 'bg-slate-700 text-slate-200 border-slate-600' };
        } else if (diffDays === 0) {
            return { text: '🚨 ¡INICIA HOY!', badgeClass: 'bg-rose-600 text-white font-extrabold animate-pulse' };
        } else if (diffDays <= 3) {
            return { text: `🔴 URGENTE: Faltan ${diffDays}d`, badgeClass: 'bg-rose-500/25 text-rose-300 border-rose-400/40 font-bold' };
        } else if (diffDays <= 7) {
            return { text: `🟡 ATENCIÓN: Faltan ${diffDays}d`, badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/40 font-bold' };
        } else {
            return { text: `🟢 Faltan ${diffDays} días`, badgeClass: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40' };
        }
    } catch {
        return { text: 'Fecha Fijada', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' };
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
    const queryClient = useQueryClient();
    
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
        contractId?: string;
        signingLink: string;
        otpCode: string;
        companyOtpCode?: string;
        emailSent: boolean;
        contractType?: string;
        documentUrl?: string;
    } | null>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // States SEPE Hexagon (Contrato Indefinido Fijo-Discontinuo Cód. 300 / Indefinido Cód. 100)
    const [sepeForm, setSepeForm] = useState({
        sepe_codigo: '300',
        puesto: '',
        grupo_profesional: '5',
        funciones: '',
        centro_trabajo_calle: 'CALLE ARCHIVERO DIMAS PEREZ 2 TARANCON',
        centro_trabajo_cp: '16400',
        centro_trabajo_municipio: 'TARANCON',
        fecha_inicio: new Date().toISOString().split('T')[0],
        periodo_prueba: '2 MESES',
        retribucion_total: 'SEGUN CONVENIO',
        convenio_colectivo: 'METAL DE CUENCA',
        lugar_firma: 'TARANCON',
        dni: '',
        nie: '',
        pasaporte: '',
        nuss: '',
        codigo_postal: '16400',
        municipio_domicilio: 'TARANCON',
        nivel_formativo: 'FORMACION PROFESIONAL',
        clausulas_adicionales: ''
    });

    // Configurações SEPE da Hexagon (salvas em core_common.empresas.contract_settings)
    const [hexagonSettings, setHexagonSettings] = useState<any>({
        cif: 'B05688197',
        razon_social: 'HEXAGON MONTAJES INDUSTRIALES S.L.',
        domicilio_social: 'CALLE ARCHIVERO DIMAS PEREZ 2',
        pais_empresa: 'ESPAÑA',
        pais_cod_empresa: '724',
        municipio_empresa: 'TARANCON',
        municipio_cod_empresa: '',
        cp_empresa: '16400',
        representante_nombre: 'MARCOS DIVINO DE ALMEIDA JUNIOR',
        representante_nif: 'Z4103479P',
        representante_cargo: 'ADMINISTRADOR',
        representante_email: '',
        ccc_regimen: '0111',
        ccc_numero: '16106973470',
        cnae_cod: '',
        cnae_texto: 'INSTALACIONES DE MAQUINAS Y EQUIPOS INDUSTRIALES',
        centro_trabajo_calle: 'CALLE ARCHIVERO DIMAS PEREZ 2 TARANCON',
        centro_trabajo_municipio: 'TARANCON',
        municipio_ct_cod: '16203',
        centro_trabajo_cp: '16400',
        horas_semanales: '40',
        horario_jornada: '',
        periodo_prueba_default: '2 MESES',
        vacaciones: '30 DIAS NATURALES',
        convenio_colectivo: 'METAL DE CUENCA',
        retribucion_default: 'SEGUN CONVENIO',
        conceptos_salariales: 'SEGUN CONVENIO',
        sepe_municipio: 'SERVICIOS TELEMATICOS DEL SEPE',
        lugar_firma: 'TARANCON',
        sepe_codigo_default: '300',
        actividad_fijo_discontinuo: 'INSTALACIONES Y MONTAJES INDUSTRIALES EN OBRAS',
        cargos_mapeamento: {
            'ENCARGADO DE OBRA': {
                puesto: 'ENCARGADO DE OBRA',
                grupo_profesional: '3',
                funciones: 'ENCARGADO DE OBRA',
                periodo_prueba: '2 MESES'
            },
            'MONTADOR DE ESTRUCTURA METÁLICA (OBRA)': {
                puesto: 'MONTADOR DE ESTRUCTURA METALICA',
                grupo_profesional: '5',
                funciones: 'MONTADOR DE ESTRUCTURA METALICA',
                periodo_prueba: '2 MESES'
            },
            'AYUDANTE': {
                puesto: 'AYUDANTE',
                grupo_profesional: '7',
                funciones: 'AYUDANTE',
                periodo_prueba: '2 MESES'
            },
            'AUXILIAR ADMINISTRATIVO': {
                puesto: 'AUXILIAR ADMINISTRATIVO',
                grupo_profesional: '7',
                funciones: 'AUXILIAR ADMINISTRATIVO',
                periodo_prueba: '2 MESES'
            }
        }
    });
    const [savingHexagonSettings, setSavingHexagonSettings] = useState(false);
    const [newRoleKey, setNewRoleKey] = useState('');

    // Modal de Assinatura Eletrônica da Empresa (Representante Legal - Bilateral OTP)
    const [companySignDialogOpen, setCompanySignDialogOpen] = useState(false);
    const [companySigningContract, setCompanySigningContract] = useState<Contract | null>(null);
    const [companySignMode, setCompanySignMode] = useState<'draw' | 'type' | 'saved'>('draw');
    const [companyTypedSignature, setCompanyTypedSignature] = useState('');
    const [companySavedSigBase64, setCompanySavedSigBase64] = useState<string | null>(() => {
        try { return localStorage.getItem('hexagon_rep_signature'); } catch { return null; }
    });
    const [companySaveDefaultSig, setCompanySaveDefaultSig] = useState(true);
    const [companySignerName, setCompanySignerName] = useState('');
    const [companySignerDocument, setCompanySignerDocument] = useState('');
    const [companySignerCargo, setCompanySignerCargo] = useState('ADMINISTRADOR ÚNICO');
    const [companySignerEmail, setCompanySignerEmail] = useState('');
    const [companyOtpInput, setCompanyOtpInput] = useState('');
    const [requestingCompanyOtp, setRequestingCompanyOtp] = useState(false);
    const [submittingCompanySign, setSubmittingCompanySign] = useState(false);
    const companyCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawingCompanySig, setIsDrawingCompanySig] = useState(false);
    const [hasDrawnCompanySig, setHasDrawnCompanySig] = useState(false);

    // Dialog & Form states - Carta de Rescisión
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
    const [noticeCompetenceMonth, setNoticeCompetenceMonth] = useState<string>(() => todayIsoStr().substring(0, 7));
    const [noticeStopReason, setNoticeStopReason] = useState<string>('Abandono de trabalho / Não cumpriu aviso prévio');
    const [noticePayrollDescriptionCustom, setNoticePayrollDescriptionCustom] = useState<string>('');
    const [noticePayrollDescriptionEdited, setNoticePayrollDescriptionEdited] = useState<boolean>(false);
    const [consolidatingPayroll, setConsolidatingPayroll] = useState<boolean>(false);

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
    const [activeDocTab, setActiveDocTab] = useState<'identity' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie' | 'residence'>('identity');
    const [residenceSide, setResidenceSide] = useState<'front' | 'back'>('front');
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [selectedAttachDocType, setSelectedAttachDocType] = useState<string>('passaporte');
    const [savingAttachDoc, setSavingAttachDoc] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [rejectingDoc, setRejectingDoc] = useState(false);
    const docFileInputRef = useRef<HTMLInputElement>(null);

    const handleTabChange = (tab: 'identity' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie' | 'residence') => {
        setActiveDocTab(tab);
        if (tab === 'identity') setSelectedAttachDocType('passaporte');
        else if (tab === 'residence') setSelectedAttachDocType('residencia_europeia');
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
        tiene_residencia_ue: false,
        numero_residencia: '',
        pais_residencia: '',
        licencia_conducir: '',
        nacionalidade: '',
        fecha_nacimiento: '',
        nuss: '',
        codigo_postal: '',
        municipio_domicilio: '',
        nivel_formativo: '00'
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
            const activeAssignment = req.worker?.assignments?.find((a: any) => a.empresa_id === req.empresa_id && (a.status === 'active' || a.status === 'planned')) ||
                                     req.worker?.assignments?.find((a: any) => a.status === 'active' || a.status === 'planned');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = req.client?.trade_name || req.client?.legal_name ||
                               activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                               req.worker?.cliente || 'Sin Asignación';
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
            const activeAssignment = req.worker?.assignments?.find((a: any) => a.empresa_id === req.empresa_id && (a.status === 'active' || a.status === 'planned')) ||
                                     req.worker?.assignments?.find((a: any) => a.status === 'active' || a.status === 'planned');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = req.client?.trade_name || req.client?.legal_name ||
                               activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                               req.worker?.cliente || 'Sin Asignación';
            
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
                const activeAssA = a.worker?.assignments?.find((as: any) => as.empresa_id === a.empresa_id && (as.status === 'active' || as.status === 'planned')) ||
                                   a.worker?.assignments?.find((as: any) => as.status === 'active' || as.status === 'planned');
                const latestAssA = a.worker?.assignments?.[0];
                valA = a.client?.trade_name || a.client?.legal_name ||
                       activeAssA?.client?.trade_name || activeAssA?.client?.legal_name ||
                       latestAssA?.client?.trade_name || latestAssA?.client?.legal_name ||
                       a.worker?.cliente || 'Sem Alocação';

                const activeAssB = b.worker?.assignments?.find((as: any) => as.empresa_id === b.empresa_id && (as.status === 'active' || as.status === 'planned')) ||
                                   b.worker?.assignments?.find((as: any) => as.status === 'active' || as.status === 'planned');
                const latestAssB = b.worker?.assignments?.[0];
                valB = b.client?.trade_name || b.client?.legal_name ||
                       activeAssB?.client?.trade_name || activeAssB?.client?.legal_name ||
                       latestAssB?.client?.trade_name || latestAssB?.client?.legal_name ||
                       b.worker?.cliente || 'Sem Alocação';
            } else if (sortFieldRequests === 'planned_start_date') {
                const activeAssA = a.worker?.assignments?.find((as: any) => as.empresa_id === a.empresa_id && (as.status === 'active' || as.status === 'planned')) ||
                                   a.worker?.assignments?.find((as: any) => as.status === 'active' || as.status === 'planned');
                const latestAssA = a.worker?.assignments?.[0];
                valA = (a as any).extracted_data?.start_date ||
                       activeAssA?.planned_start_date || activeAssA?.start_date ||
                       latestAssA?.planned_start_date || latestAssA?.start_date || '9999-12-31';

                const activeAssB = b.worker?.assignments?.find((as: any) => as.empresa_id === b.empresa_id && (as.status === 'active' || as.status === 'planned')) ||
                                   b.worker?.assignments?.find((as: any) => as.status === 'active' || as.status === 'planned');
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
            const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || contract.worker?.cliente || 'Sin Asignación';
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

        let consolidatedCount = 0;
        let consolidatedTotal = 0;

        rescisaoContracts.forEach(c => {
            const info = computeNoticeDetails(c, today);
            if (info.computedStatus === 'in_progress') inProgress++;
            else if (info.computedStatus === 'abandoned') abandoned++;
            else completedOrWaived++;

            totalToDeduct += info.finalToDeduct;
            if (info.payrollDiscountId) {
                consolidatedCount++;
                consolidatedTotal += info.payrollConsolidatedAmount ?? info.finalToDeduct;
            }
        });

        return {
            total: rescisaoContracts.length,
            inProgress,
            abandoned,
            completedOrWaived,
            totalToDeduct: Number(totalToDeduct.toFixed(2)),
            consolidatedCount,
            consolidatedTotal: Number(consolidatedTotal.toFixed(2)),
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
        if (docType === 'contrato_fijo_discontinuo') {
            return `${contratante}/CONTRATO FIJO DISCONTINUO - ${upper}.pdf`;
        } else if (docType === 'contrato_nis') {
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

            let { data, error } = await supabase.storage
                .from('contract-templates')
                .download(filePath);

            if ((error || !data) && docType === 'contrato_fijo_discontinuo') {
                const fallbackResp = await fetch('/templates/CONTRATO_FIJO_DISCONTINUO_HEXAGON.pdf');
                if (fallbackResp.ok) {
                    data = await fallbackResp.blob();
                    error = null;
                }
            }

            if (error) throw error;
            if (!data) throw new Error("Arquivo vazio retornado");

            // Baixar no navegador
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop() || (docType === 'contrato_fijo_discontinuo' ? 'template.pdf' : 'template.docx');
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

        const isPdfTemplate = activeUploadDocType === 'contrato_fijo_discontinuo';
        if (isPdfTemplate && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error("Para o modelo SEPE Fijo-Discontinuo, envie um arquivo PDF (.pdf)");
            return;
        }
        if (!isPdfTemplate && !file.name.toLowerCase().endsWith('.docx')) {
            toast.error("Por favor, envie um arquivo no formato Word (.docx)");
            return;
        }

        try {
            setUploadingTemplate(activeUploadDocType);
            const filePath = getTemplatePath(selectedConfigContratante, activeUploadDocType);
            if (!filePath) throw new Error("Caminho inválido");

            const fileToUpload: Blob = file;

            const { error } = await supabase.storage
                .from('contract-templates')
                .upload(filePath, fileToUpload, {
                    upsert: true,
                    contentType: isPdfTemplate
                        ? 'application/pdf'
                        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
                    const targetEmpresaId = empresaId || selectedEmpresaId;
                    let reqQuery = supabase
                        .schema('core_personal')
                        .from('document_requests')
                        .select('*, worker:workers(id, nome, email, movil, cod_colab)')
                        .in('worker_id', workerIds)
                        .order('created_at', { ascending: false });

                    if (targetEmpresaId === HEXAGON_EMPRESA_ID) {
                        reqQuery = reqQuery.eq('empresa_id', HEXAGON_EMPRESA_ID);
                    }

                    const { data: requests } = await reqQuery;

                    const requestsMap = new Map<string, any>();
                    for (const r of (requests || [])) {
                        if (!requestsMap.has(r.worker_id)) {
                            requestsMap.set(r.worker_id, r);
                        } else if (targetEmpresaId && r.empresa_id === targetEmpresaId && requestsMap.get(r.worker_id)?.empresa_id !== targetEmpresaId) {
                            requestsMap.set(r.worker_id, r);
                        }
                    }

                    // For Hexagon, automatically ensure every worker in the solicitation has a Hexagon document_request
                    // pre-populated with any previously uploaded documents so they can re-submit/update for Hexagon
                    if (targetEmpresaId === HEXAGON_EMPRESA_ID) {
                        let createdAny = false;
                        for (const item of displayItems) {
                            if (item.worker?.id && !requestsMap.has(item.worker.id)) {
                                try {
                                    const createdReq = await createDocumentRequest(
                                        HEXAGON_EMPRESA_ID,
                                        item.worker.id,
                                        clientId,
                                        expectedStartDate ? expectedStartDate.substring(0, 10) : undefined
                                    );
                                    requestsMap.set(item.worker.id, { ...createdReq, worker: item.worker });
                                    createdAny = true;
                                } catch (e) {
                                    console.warn("Erro ao provisionar document_request da Hexagon:", e);
                                }
                            }
                        }
                        if (createdAny) {
                            loadDocRequests();
                        }
                    }

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
        
        // Se já existe uma solicitação de documentos, usa o token existente (e renova/reabre se expirado ou já finalizado na Hexagon)
        if (item.docRequest) {
            const isExpired = item.docRequest.expires_at && new Date(item.docRequest.expires_at) < new Date();
            const isHexagon = (taskMetadata?.empresaId || item.docRequest.empresa_id || selectedEmpresaId) === HEXAGON_EMPRESA_ID;
            if (isExpired || (isHexagon && item.docRequest.status !== 'pending_upload')) {
                try {
                    const reopened = await reopenDocumentRequest(item.docRequest.id);
                    setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: { ...item.docRequest, ...reopened } } : w));
                    loadDocRequests();
                } catch (e) {
                    console.warn("Aviso ao renovar link de envio:", e);
                }
            }
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

    const loadHexagonSettings = async () => {
        try {
            const settings = await getCompanyContractSettings(HEXAGON_EMPRESA_ID);
            if (settings && Object.keys(settings).length > 0) {
                setHexagonSettings((prev: any) => ({
                    ...prev,
                    ...settings,
                    cargos_mapeamento: {
                        ...(prev.cargos_mapeamento || {}),
                        ...(settings.cargos_mapeamento || {})
                    }
                }));
                if (settings.representante_signature_base64 && !companySavedSigBase64) {
                    setCompanySavedSigBase64(settings.representante_signature_base64);
                }
            }
        } catch (err) {
            console.warn("Aviso ao carregar configurações SEPE da Hexagon:", err);
        }
    };

    const handleSaveHexagonSettings = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            setSavingHexagonSettings(true);
            await updateCompanyContractSettings(HEXAGON_EMPRESA_ID, hexagonSettings);
            toast.success("¡Parámetros oficiales SEPE de Hexagon guardados con éxito!");
        } catch (err: any) {
            console.error("Erro ao salvar configurações SEPE da Hexagon:", err);
            toast.error(`Erro ao salvar configurações: ${err.message || err}`);
        } finally {
            setSavingHexagonSettings(false);
        }
    };

    const populateSepeFormForWorker = async (workerId: string, currentSettings?: any) => {
        const cfg = currentSettings || hexagonSettings;
        try {
            const [{ data: w }, { data: dr }, { data: wa }] = await Promise.all([
                supabase.schema('core_personal').from('workers').select('*').eq('id', workerId).maybeSingle(),
                supabase.schema('core_personal').from('document_requests').select('extracted_data').eq('worker_id', workerId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.schema('core_personal').from('worker_assignments').select('*, client:clients(trade_name, legal_name, address_line, city), site:client_sites(name, address_line, city, province, postal_code)').eq('worker_id', workerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);

            let colab: any = null;
            if (w?.cod_colab) {
                const { data: colabData } = await supabase
                    .schema('public')
                    .from('colaboradores')
                    .select('dni, nie, nuss, pasaporte')
                    .eq('cod_colab', w.cod_colab)
                    .maybeSingle();
                colab = colabData;
            }

            const ed = (dr as any)?.extracted_data || {};
            const rawFunc = String(w?.funcion || ed?.funcion || 'AYUDANTE').trim().toUpperCase();
            const cargosMap = cfg?.cargos_mapeamento || {};
            let roleCfg = cargosMap[rawFunc];
            if (!roleCfg) {
                const matchedKey = Object.keys(cargosMap).find(k => rawFunc.includes(k.toUpperCase()) || k.toUpperCase().includes(rawFunc));
                if (matchedKey) roleCfg = cargosMap[matchedKey];
            }

            const ctCalle = 'CALLE ARCHIVERO DIMAS PEREZ 2 TARANCON';
            const ctCp = cfg?.cp_empresa || '16400';
            const ctMun = cfg?.municipio_empresa || 'TARANCON';
            const startDate = ((wa as any)?.planned_start_date || (wa as any)?.start_date || ed?.start_date || new Date().toISOString()).substring(0, 10);

            setSepeForm(prev => ({
                ...prev,
                puesto: roleCfg?.puesto || rawFunc || 'OPERARIO',
                grupo_profesional: roleCfg?.grupo_profesional || '5',
                funciones: roleCfg?.funciones || roleCfg?.puesto || rawFunc || 'OPERARIO',
                centro_trabajo_calle: ctCalle,
                centro_trabajo_cp: ctCp,
                centro_trabajo_municipio: ctMun,
                fecha_inicio: startDate,
                periodo_prueba: roleCfg?.periodo_prueba || cfg?.periodo_prueba_default || '2 MESES',
                retribucion_total: cfg?.retribucion_default || 'SEGUN CONVENIO',
                convenio_colectivo: cfg?.convenio_colectivo || 'METAL DE CUENCA',
                lugar_firma: cfg?.lugar_firma || 'TARANCON',
                sepe_codigo: cfg?.sepe_codigo || '300',
                dni: w?.dni || colab?.dni || ed?.dni || '',
                nie: w?.nie || colab?.nie || ed?.nie || '',
                pasaporte: w?.pasaporte || colab?.pasaporte || ed?.pasaporte || '',
                nuss: w?.nuss || colab?.nuss || ed?.nuss || '',
                codigo_postal: w?.codigo_postal || ed?.codigo_postal || '16400',
                municipio_domicilio: w?.municipio_domicilio || ed?.municipio_domicilio || w?.location || ed?.ubicacion_actual || ctMun,
            }));
        } catch (err) {
            console.warn("Aviso ao pré-preencher dados SEPE do trabalhador:", err);
        }
    };

    useEffect(() => {
        loadClients(selectedEmpresaId);
        loadHexagonSettings();
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
            if (selectedEmpresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
                setRequestEmpresaId(selectedEmpresaId);
            }
            loadWorkers();
        }
    }, [requestDialogOpen, selectedEmpresaId]);

    useEffect(() => {
        if (generateDialogOpen) {
            const resolvedContratante = selectedContratante || resolveContratanteOption(activeEmpresaId || selectedEmpresaId);
            if (!selectedContratante) {
                setSelectedContratante(resolvedContratante);
            }
            if (!selectedContractType) {
                setSelectedContractType(resolvedContratante === 'HEXAGON' ? 'contrato_fijo_discontinuo' : 'contrato_termo_incerto');
            }
            if (workersList.length === 0) {
                loadWorkers();
            }
        }
    }, [generateDialogOpen, selectedEmpresaId, activeEmpresaId]);

    useEffect(() => {
        const isPdfPreview = generationSuccess?.documentUrl?.toLowerCase().endsWith('.pdf') || generationSuccess?.contractType === 'contrato_fijo_discontinuo';
        if (previewBlob && previewContainerRef.current && !isPdfPreview) {
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
    }, [previewBlob, generationSuccess]);

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
            toast.error("Por favor, seleccione el trabajador y la empresa contratante.");
            return;
        }
        if (!rescisaoRequestDate || !rescisaoStartDate || !rescisaoEndDate) {
            toast.error("Por favor, complete las fechas de la solicitud y del período de preaviso.");
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

            toast.success("¡Carta de Rescisión generada y lista para firma electrónica!");
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
            console.error("Erro ao gerar Carta de Rescisión:", err);
            toast.error(err.message || "Erro ao gerar Carta de Rescisión.");
        } finally {
            setGeneratingRescisao(false);
        }
    };

    // 4. Submeter geração de contrato
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkerId || !selectedContratante || !selectedContractType) {
            toast.error("Por favor, complete todos los campos.");
            return;
        }

        try {
            setGenerating(true);
            setPreviewBlob(null);
            const isSepeHexagon = selectedContractType === 'contrato_fijo_discontinuo';
            const res = await generateContract({
                worker_id: selectedWorkerId,
                assignment_id: selectedAssignmentId || undefined,
                contratante: selectedContratante,
                contract_type: selectedContractType,
                empresa_id: isSepeHexagon ? HEXAGON_EMPRESA_ID : (selectedEmpresaId || undefined),
                ...(isSepeHexagon ? {
                    sepe_overrides: sepeForm,
                    worker_updates: {
                        dni: sepeForm.dni,
                        nie: sepeForm.nie,
                        pasaporte: sepeForm.pasaporte,
                        nuss: sepeForm.nuss,
                        codigo_postal: sepeForm.codigo_postal,
                        municipio_domicilio: sepeForm.municipio_domicilio
                    }
                } : {})
            });

            setGenerationSuccess({
                contractId: res.contract_id,
                signingLink: res.signing_link,
                otpCode: res.otp_code,
                companyOtpCode: res.company_otp_code,
                emailSent: res.email_sent,
                contractType: selectedContractType,
                documentUrl: res.document_url
            });
            
            toast.success(
                selectedContractType === 'contrato_alta'
                    ? "¡Contrato de alta emitido!"
                    : selectedContractType === 'contrato_fijo_discontinuo'
                    ? "¡Contrato Oficial SEPE emitido y listo para firma bilateral!"
                    : "¡Contrato emitido y listo para firma!"
            );
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

    // 4.1 Modal de Assinatura Eletrônica da Empresa (Representante Legal — Bilateral OTP)
    const handleOpenCompanySignModal = (contract: Contract) => {
        setCompanySigningContract(contract);
        const repName = contract.metadata?.representante_nombre || hexagonSettings?.representante_nombre || 'MARCOS DIVINO DE ALMEIDA JUNIOR';
        const repDoc = contract.metadata?.representante_nif || hexagonSettings?.representante_nif || 'Z4103479P';
        const repCargo = contract.metadata?.representante_cargo || hexagonSettings?.representante_cargo || 'ADMINISTRADOR';
        const repEmail = hexagonSettings?.representante_email || '';
        const otpDefault = contract.metadata?.company_otp_code || '';

        setCompanySignerName(repName);
        setCompanySignerDocument(repDoc);
        setCompanySignerCargo(repCargo);
        setCompanySignerEmail(repEmail);
        setCompanyTypedSignature(repName);
        setCompanyOtpInput(otpDefault);

        const savedSig = (() => {
            try { return localStorage.getItem('hexagon_rep_signature'); } catch { return null; }
        })() || hexagonSettings?.representante_signature_base64 || null;
        setCompanySavedSigBase64(savedSig);
        setCompanySignMode(savedSig ? 'saved' : 'draw');
        setHasDrawnCompanySig(false);
        setCompanySignDialogOpen(true);
    };

    const startDrawingCompany = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = companyCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawingCompanySig(true);
        setHasDrawnCompanySig(true);
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
        const clientY = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(clientX * scaleX, clientY * scaleY);
    };

    const drawCompany = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawingCompanySig) return;
        const canvas = companyCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
        const clientY = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

        ctx.lineTo(clientX * scaleX, clientY * scaleY);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const stopDrawingCompany = () => {
        setIsDrawingCompanySig(false);
    };

    const clearCompanyCanvas = () => {
        const canvas = companyCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasDrawnCompanySig(false);
        }
    };

    const generateTypedSignaturePng = (nameText: string): string => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 480;
        offCanvas.height = 160;
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'italic bold 34px Georgia, "Times New Roman", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nameText.trim(), offCanvas.width / 2, offCanvas.height / 2 - 10, 440);
            ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
            ctx.fillStyle = '#334155';
            ctx.fillText(`FIRMA DIGITAL EMPRESA — ${companySignerDocument || 'Z4103479P'}`, offCanvas.width / 2, offCanvas.height / 2 + 28);
        }
        return offCanvas.toDataURL('image/png');
    };

    const handleRequestNewCompanyOtp = async () => {
        if (!companySigningContract) return;
        try {
            setRequestingCompanyOtp(true);
            const res = await requestCompanyOtp(companySigningContract.id, companySignerEmail || undefined);
            if (res.company_otp_code) {
                setCompanyOtpInput(res.company_otp_code);
                toast.success(
                    res.email_sent
                        ? `Novo código OTP (${res.company_otp_code}) gerado e enviado para ${companySignerEmail}!`
                        : `Novo código OTP da empresa gerado: ${res.company_otp_code}`
                );
            }
        } catch (err: any) {
            toast.error(`Erro ao gerar código OTP da empresa: ${err.message || err}`);
        } finally {
            setRequestingCompanyOtp(false);
        }
    };

    const handleSubmitCompanySign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companySigningContract) return;
        if (!companySignerName.trim()) {
            toast.error("Informe el nombre del Representante Legal de la Empresa.");
            return;
        }
        if (!companyOtpInput || companyOtpInput.trim().length < 6) {
            toast.error("Informe el código OTP de 6 dígitos de la Empresa.");
            return;
        }

        let signatureBase64 = '';
        if (companySignMode === 'saved') {
            if (!companySavedSigBase64) {
                toast.error("No se encontró ninguna firma guardada. Dibuje o escriba su firma.");
                return;
            }
            signatureBase64 = companySavedSigBase64;
        } else if (companySignMode === 'type') {
            if (!companyTypedSignature.trim()) {
                toast.error("Escriba el nombre para generar la firma digital.");
                return;
            }
            signatureBase64 = generateTypedSignaturePng(companyTypedSignature);
        } else {
            if (!hasDrawnCompanySig || !companyCanvasRef.current) {
                toast.error("Dibuje la firma del representante en el recuadro antes de confirmar.");
                return;
            }
            signatureBase64 = companyCanvasRef.current.toDataURL('image/png');
        }

        try {
            setSubmittingCompanySign(true);
            const res = await signContractAsCompany({
                contract_id: companySigningContract.id,
                otp_code: companyOtpInput.trim(),
                signature_base64: signatureBase64,
                signer_name: companySignerName.trim(),
                signer_document: companySignerDocument.trim(),
                signer_cargo: companySignerCargo.trim(),
            });

            if (companySaveDefaultSig && signatureBase64) {
                try {
                    localStorage.setItem('hexagon_rep_signature', signatureBase64);
                    setCompanySavedSigBase64(signatureBase64);
                } catch {}
                if (companySigningContract.empresa_id === HEXAGON_EMPRESA_ID || companySigningContract.contratante === 'HEXAGON') {
                    const updatedCfg = {
                        ...hexagonSettings,
                        representante_nombre: companySignerName.trim(),
                        representante_nif: companySignerDocument.trim(),
                        representante_cargo: companySignerCargo.trim(),
                        representante_email: companySignerEmail.trim(),
                        representante_signature_base64: signatureBase64
                    };
                    setHexagonSettings(updatedCfg);
                    updateCompanyContractSettings(HEXAGON_EMPRESA_ID, updatedCfg).catch(() => {});
                }
            }

            toast.success("¡Firma Electrónica de la Empresa (Representante Legal) aplicada con éxito en el PDF y en el Certificado eIDAS!");
            setCompanySignDialogOpen(false);
            loadContracts();

            // Se estávamos na tela de pós-geração deste mesmo contrato, recarrega o preview do PDF assinado!
            if (generationSuccess && generationSuccess.contractId === companySigningContract.id && res.signed_document_url) {
                try {
                    setLoadingPreview(true);
                    const { data: signedData } = await supabase.storage
                        .from('worker-contracts')
                        .createSignedUrl(`${res.signed_document_url}?t=${Date.now()}`, 300);
                    if (signedData?.signedUrl) {
                        const fileRes = await fetch(signedData.signedUrl);
                        if (fileRes.ok) {
                            const blob = await fileRes.blob();
                            setPreviewBlob(blob);
                        }
                    }
                } catch (e) {
                    console.warn("Erro ao atualizar preview pós-assinatura:", e);
                } finally {
                    setLoadingPreview(false);
                }
            }
        } catch (err: any) {
            console.error("Erro ao assinar contrato pela empresa:", err);
            toast.error(err.message || "Falha ao registrar assinatura da empresa.");
        } finally {
            setSubmittingCompanySign(false);
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
                ? (contract.status === 'signed' ? 'Carta de Rescisión Assinada' : 'Carta de Rescisión')
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

        const activeAssignment = req.worker?.assignments?.find((a: any) => a.empresa_id === req.empresa_id && (a.status === 'active' || a.status === 'planned')) ||
                                 req.worker?.assignments?.find((a: any) => a.status === 'active' || a.status === 'planned');
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

        const hasResidence = data.tiene_residencia_ue !== undefined
            ? Boolean(data.tiene_residencia_ue)
            : (req.tiene_residencia_ue !== undefined && req.tiene_residencia_ue !== null
                ? Boolean(req.tiene_residencia_ue)
                : Boolean(req.residence_url || data.residence_url || data.numero_residencia || data.nie || req.worker?.nie));

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
            nie: data.nie || data.numero_residencia || req.worker?.nie || '',
            dni: data.dni || req.worker?.dni || '',
            pasaporte: data.pasaporte || req.worker?.pasaporte || '',
            tiene_residencia_ue: hasResidence,
            numero_residencia: data.numero_residencia || data.nie || req.worker?.nie || '',
            pais_residencia: data.pais_residencia || '',
            licencia_conducir: data.licencia_conducir || req.worker?.licencia_conducir || '',
            nacionalidade: data.nacionalidade || req.worker?.nacionalidade || '',
            fecha_nacimiento: normalizedBirthDate,
            nuss: data.nuss || (req.worker as any)?.nuss || req.worker?.niss || data.niss || '',
            codigo_postal: data.codigo_postal || (req.worker as any)?.codigo_postal || '',
            municipio_domicilio: data.municipio_domicilio || (req.worker as any)?.municipio_domicilio || req.worker?.location || data.ubicacion_actual || '',
            nivel_formativo: data.nivel_formativo || (req.worker as any)?.nivel_formativo || '00'
        });
        setActiveDocTab('identity');
        setResidenceSide('front');
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
        else if (activeDocTab === 'residence') {
            path = residenceSide === 'back'
                ? ((selectedRequest.extracted_data as any)?.residence_back_url || '')
                : (selectedRequest.residence_url || (selectedRequest.extracted_data?.residence_url) || '');
        }
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
                residencia_europeia: activeDocTab === 'residence' ? (residenceSide === 'back' ? 'Residência Europeia (Verso)' : 'Residência Europeia (Frente)') : 'Residência Europeia',
                nie: 'Residência Europeia',
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
            const filePrefix = activeDocTab === 'residence' && residenceSide === 'back' ? 'residence_back' : activeDocTab;
            const targetFilePath = `${tokenFolder}/${filePrefix}_${Date.now()}.${cleanExt}`;

            toast.info(`Fazendo upload do arquivo para ${filePrefix.toUpperCase()}...`);

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
            else if (activeDocTab === 'residence' && residenceSide === 'front') updateColumn = 'residence_url';
            else if (activeDocTab === 'nif') updateColumn = 'nif_url';
            else if (activeDocTab === 'niss') updateColumn = 'niss_url';
            else if (activeDocTab === 'license') updateColumn = 'license_url';
            else if (activeDocTab === 'iban') updateColumn = 'iban_url';
            else if (activeDocTab === 'selfie') updateColumn = 'selfie_url';

            const updatePayload: any = {
                ...(updateColumn ? { [updateColumn]: targetFilePath } : {}),
                updated_at: new Date().toISOString()
            };

            if (activeDocTab === 'iban' || activeDocTab === 'residence') {
                const extKey = activeDocTab === 'iban'
                    ? 'iban_url'
                    : (residenceSide === 'back' ? 'residence_back_url' : 'residence_url');
                updatePayload.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    [extKey]: targetFilePath
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
                ...(updateColumn ? { [updateColumn]: targetFilePath } : {}),
                ...(activeDocTab === 'iban' || activeDocTab === 'residence' ? {
                    extracted_data: {
                        ...(selectedRequest.extracted_data || {}),
                        [activeDocTab === 'iban' ? 'iban_url' : (residenceSide === 'back' ? 'residence_back_url' : 'residence_url')]: targetFilePath
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

            toast.success(`Arquivo de ${filePrefix.toUpperCase()} anexado com sucesso!`);

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

    // 6.7. Rechazar / Eliminar documento da aba atual
    const handleRejectCurrentDoc = async () => {
        if (!selectedRequest) return;

        let path = '';
        let updateColumn = '';
        let tabLabel = '';

        if (activeDocTab === 'identity') { path = selectedRequest.passport_url || ''; updateColumn = 'passport_url'; tabLabel = 'Identificação'; }
        else if (activeDocTab === 'residence') {
            if (residenceSide === 'back') {
                path = (selectedRequest.extracted_data as any)?.residence_back_url || '';
                updateColumn = '';
                tabLabel = 'Residência Europeia (Verso)';
            } else {
                path = selectedRequest.residence_url || (selectedRequest.extracted_data?.residence_url) || '';
                updateColumn = 'residence_url';
                tabLabel = 'Residência Europeia (Frente)';
            }
        }
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
                ...(updateColumn ? { [updateColumn]: null } : {})
            };
            if (activeDocTab === 'iban' || activeDocTab === 'residence') {
                const extKey = activeDocTab === 'iban'
                    ? 'iban_url'
                    : (residenceSide === 'back' ? 'residence_back_url' : 'residence_url');
                reqUpdatePayload.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    [extKey]: null
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
                ...(updateColumn ? { [updateColumn]: null } : {})
            };
            if (activeDocTab === 'iban' || activeDocTab === 'residence') {
                const extKey = activeDocTab === 'iban'
                    ? 'iban_url'
                    : (residenceSide === 'back' ? 'residence_back_url' : 'residence_url');
                updatedReq.extracted_data = {
                    ...(selectedRequest.extracted_data || {}),
                    [extKey]: null
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
        else if (activeDocTab === 'residence') {
            path = residenceSide === 'back'
                ? ((selectedRequest.extracted_data as any)?.residence_back_url || '')
                : (selectedRequest.residence_url || (selectedRequest.extracted_data?.residence_url) || '');
        }
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
    }, [selectedRequest, activeDocTab, residenceSide]);

    // Funções para download individual e em lote dos documentos enviados pelo trabalhador
    const handleDownloadCurrentDoc = async () => {
        if (!selectedRequest) return;
        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'residence') {
            path = residenceSide === 'back'
                ? ((selectedRequest.extracted_data as any)?.residence_back_url || '')
                : (selectedRequest.residence_url || (selectedRequest.extracted_data?.residence_url) || '');
        }
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
            const downloadSuffix = activeDocTab === 'residence' ? `residence_${residenceSide}` : activeDocTab;
            a.download = `${workerName}_${downloadSuffix}.${ext}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Download do documento (${downloadSuffix.toUpperCase()}) iniciado!`);
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
            { label: 'Residencia_Europeia_Frente', path: selectedRequest.residence_url || selectedRequest.extracted_data?.residence_url },
            { label: 'Residencia_Europeia_Verso', path: (selectedRequest.extracted_data as any)?.residence_back_url },
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
                nuss: verifyFormData.nuss || undefined,
                codigo_postal: verifyFormData.codigo_postal || undefined,
                municipio_domicilio: verifyFormData.municipio_domicilio || undefined,
                nivel_formativo: verifyFormData.nivel_formativo || undefined,
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
            toast.success("¡Documentación validada y registro actualizado con éxito!");
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
        setSelectedContractType(defaultContratante === 'HEXAGON' ? 'contrato_fijo_discontinuo' : 'contrato_termo_incerto');
        
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
        
        // 3. Pré-definir modelo de contrato padrão (SEPE Fijo-Discontinuo quando Hexagon)
        const defaultType = contratanteName === 'HEXAGON' ? 'contrato_fijo_discontinuo' : 'contrato_termo_incerto';
        setSelectedContractType(defaultType);
        if (contratanteName === 'HEXAGON') {
            populateSepeFormForWorker(workerId);
        }

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
        toast.success("¡Enlace copiado al portapapeles!");
    };

    const handleCopyInviteLink = (link: string, workerName?: string) => {
        const greeting = workerName ? `Hola ${workerName}` : 'Hola';
        const msg = `${greeting} 
A continuación se compartirá un link, donde proporcionarás la documentación e información requerida para poder continuar con el proceso de gestión de contrato.
 
*LINK: ${link}
 
Muchas gracias.`;
        navigator.clipboard.writeText(msg);
        toast.success("¡Mensaje estándar con el enlace copiado!");
    };

    const handleCopyContractSignLink = (link: string, workerName?: string, otpCode?: string) => {
        const nameText = workerName ? `Sr. ${workerName}` : 'Sr.';
        const codeText = otpCode ? `*${otpCode}*` : '';
        const msg = `Hola ${nameText}
Adjunto encontrará un link para firmar el contrato, por favor revise el mismo y al final le mostrará opción "IR PARA FIRMAR CONTRATO", firme el contrato y se le solicitará este código único ${codeText} digítelo para confirmar y finalizar el proceso.
*LINK* ${link}
Muchas gracias.`;
        navigator.clipboard.writeText(msg);
        toast.success("¡Mensaje estándar del contrato copiado!");
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
        toast.success("¡Mensaje de firma de la Carta de Rescisión copiado!");
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
        setNoticeCompetenceMonth(today.substring(0, 7));
        setNoticeStopReason('Abandono de trabalho / Não cumpriu aviso prévio');
        setNoticePayrollDescriptionCustom('');
        setNoticePayrollDescriptionEdited(false);
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

        const defaultStopIso = info.stopDate || today;
        const defaultComp = info.payrollCompetence || (info.stopDate || info.startNotice || today).substring(0, 7);
        setNoticeCompetenceMonth(defaultComp);
        setNoticeStopReason(
            info.payrollStopReason ||
            (info.notes ? info.notes : 'Abandono de trabalho / Não cumpriu aviso prévio')
        );
        setNoticePayrollDescriptionCustom('');
        setNoticePayrollDescriptionEdited(false);

        if (prefillStopToday) {
            setNoticeStatus('abandoned');
            setNoticeStopDate(defaultStopIso);
            const autoFulfilled = Math.max(0, Math.min(info.totalNoticeDays, getDaysDiff(info.startNotice, defaultStopIso)));
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

    const buildCurrentNoticeMetadataPayload = (): {
        metadataPayload: NonNullable<Contract['metadata']>;
        penaltyTotalVal: number;
        previewFulfilledDays: number;
        previewFinalDesconto: number;
        effectiveStopDate: string;
    } => {
        const today = todayIsoStr();
        const parsedPenalty = Number(String(noticePenaltyTotal).replace(',', '.'));
        const penaltyTotalVal = Number.isFinite(parsedPenalty) && parsedPenalty >= 0 ? parsedPenalty : 460;
        const dailyRatePreview = penaltyTotalVal / 15;
        const parsedWorkedDays = noticeMonthWorkedDays.trim() !== '' ? Number(noticeMonthWorkedDays) : null;
        const parsedOverride = noticeFulfilledDaysOverride.trim() !== '' ? Number(noticeFulfilledDaysOverride) : null;
        const effectiveStopDate = noticeStatus === 'abandoned' ? (noticeStopDate || today) : (noticeStopDate || '');

        let previewFulfilledDays = 0;
        if (parsedOverride !== null && Number.isFinite(parsedOverride)) {
            previewFulfilledDays = Math.max(0, Math.min(15, parsedOverride));
        } else if (noticeStatus === 'completed') {
            previewFulfilledDays = 15;
        } else if (noticeStatus === 'abandoned' && !effectiveStopDate) {
            previewFulfilledDays = 0;
        } else {
            const ref = effectiveStopDate || today;
            previewFulfilledDays = Math.max(0, Math.min(15, getDaysDiff(noticeStartDate, ref)));
        }

        const previewAbatido = Math.min(penaltyTotalVal, previewFulfilledDays * dailyRatePreview);
        const previewRestante = Math.max(0, Number((penaltyTotalVal - previewAbatido).toFixed(2)));
        const previewFinalDesconto = noticeApplyDeduction ? previewRestante : 0;

        const metadataPayload: NonNullable<Contract['metadata']> = {
            request_date: noticeRequestDate || noticeStartDate,
            notice_start_date: noticeStartDate,
            notice_end_date: noticeEndDate,
            effective_date: noticeStartDate,
            notice_days: 15,
            penalty_total: penaltyTotalVal,
            apply_deduction: noticeApplyDeduction,
            notice_status: noticeStatus,
            stop_date: effectiveStopDate || null,
            work_start_date: noticeWorkStartDate || null,
            month_worked_days: parsedWorkedDays !== null && Number.isFinite(parsedWorkedDays) ? parsedWorkedDays : null,
            fulfilled_days_override: parsedOverride !== null && Number.isFinite(parsedOverride) ? parsedOverride : null,
            notice_notes: noticeNotes.trim() || null,
        };

        return {
            metadataPayload,
            penaltyTotalVal,
            previewFulfilledDays,
            previewFinalDesconto,
            effectiveStopDate,
        };
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

        const { metadataPayload } = buildCurrentNoticeMetadataPayload();

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

    const handleConsolidateAndLaunchPayroll = async () => {
        if (noticeDialogMode === 'create' && !noticeWorkerId) {
            toast.error('Selecione o trabalhador antes de consolidar o desconto na folha.');
            return;
        }
        if (!noticeCompetenceMonth || !/^\d{4}-\d{2}$/.test(noticeCompetenceMonth)) {
            toast.error('Selecione o mês de competência (último salário) para lançar o desconto.');
            return;
        }

        const today = todayIsoStr();
        const finalStopDate = noticeStopDate || today;
        const { metadataPayload, penaltyTotalVal, previewFulfilledDays } = buildCurrentNoticeMetadataPayload();
        const dailyRate = penaltyTotalVal / 15;
        const fulfilledDaysToUse = noticeStatus === 'completed' ? 15 : previewFulfilledDays;
        const discountAmount = Math.max(0, Number((penaltyTotalVal - Math.min(penaltyTotalVal, fulfilledDaysToUse * dailyRate)).toFixed(2)));

        if (discountAmount <= 0) {
            toast.error('O saldo a descontar é € 0,00. Verifique os dias cumpridos ou o valor base antes de lançar na folha.');
            return;
        }

        const autoDesc = buildAutoPayrollDescription({
            competenceMonth: noticeCompetenceMonth,
            startNotice: noticeStartDate,
            endNotice: noticeEndDate,
            stopDate: finalStopDate,
            fulfilledDays: fulfilledDaysToUse,
            totalDays: 15,
            dailyRate,
            penaltyTotal: penaltyTotalVal,
            finalDiscount: discountAmount,
            stopReason: noticeStopReason || noticeNotes || 'Abandono de trabalho / Não cumpriu aviso prévio',
            extraNotes: noticeNotes,
            monthWorkedDays: noticeMonthWorkedDays,
        });

        const finalDescription = noticePayrollDescriptionEdited && noticePayrollDescriptionCustom.trim()
            ? noticePayrollDescriptionCustom.trim()
            : autoDesc;

        try {
            setConsolidatingPayroll(true);
            const targetEmpresaId = resolveEmpresaIdFromContratante(
                noticeContratante,
                editingNoticeContract?.empresa_id || selectedEmpresaId || activeEmpresaId
            );

            let contractIdToConsolidate = editingNoticeContract?.id;
            let workerIdToConsolidate = editingNoticeContract?.worker_id || noticeWorkerId!;

            const updatedMetadataForConsolidation: NonNullable<Contract['metadata']> = {
                ...metadataPayload,
                notice_status: 'abandoned',
                stop_date: finalStopDate,
                fulfilled_days_override: fulfilledDaysToUse,
                apply_deduction: true,
                notice_notes: (noticeNotes || noticeStopReason || '').trim() || null,
            };

            if (!contractIdToConsolidate && noticeDialogMode === 'create' && noticeWorkerId) {
                const createdContract = await createManualNoticeEntry({
                    empresa_id: targetEmpresaId,
                    worker_id: noticeWorkerId,
                    contratante: noticeContratante,
                    assignment_id: noticeAssignmentId,
                    signed_manually: noticeSignedManually,
                    metadata: updatedMetadataForConsolidation,
                });
                contractIdToConsolidate = createdContract.id;
            }

            if (!contractIdToConsolidate) {
                throw new Error('Contrato de aviso prévio não identificado.');
            }

            await consolidateNoticeDiscountToPayroll({
                contractId: contractIdToConsolidate,
                workerId: workerIdToConsolidate,
                empresaId: targetEmpresaId,
                competenceMonth: noticeCompetenceMonth,
                amount: discountAmount,
                stopDate: finalStopDate,
                stopReason: noticeStopReason || 'Abandono de trabalho / Não cumpriu aviso prévio',
                description: finalDescription,
                metadataUpdates: updatedMetadataForConsolidation,
                existingDiscountId: editingNoticeContract?.metadata?.payroll_discount_id || null,
            });

            toast.success(
                `Desconto de ${formatCurrencyEur(discountAmount)} consolidado e lançado na folha (${formatCompetenceLabel(noticeCompetenceMonth)}) de ${noticeWorkerName || 'trabalhador'}!`
            );
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            setRescisaoSubView('aviso_previo');
            setNoticeDialogOpen(false);
            loadContracts();
        } catch (err: any) {
            console.error('Erro ao consolidar desconto na folha:', err);
            toast.error(`Erro ao consolidar desconto na folha: ${err.message || err}`);
        } finally {
            setConsolidatingPayroll(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-115px)] overflow-hidden space-y-6 p-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            Panel de Documentos y Contratos
                        </h1>
                        <p className="text-muted-foreground">
                            Gestione y emita contratos de trabajo con firma electrónica y captura inteligente de documentos.
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
                                    <DialogTitle>Solicitar Documentos por Enlace</DialogTitle>
                                    <DialogDescription>
                                        Genere un portal exclusivo y temporal para que el trabajador tome fotos y envíe sus documentos desde su teléfono móvil.
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
                                                    <SelectValue placeholder="Seleccione la empresa contratante..." />
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
                                                Cliente (Asignación / Destino)
                                            </Label>
                                            <Combobox
                                                options={[
                                                    { value: 'none', label: 'Sin Cliente Especificado' },
                                                    ...clientsList.map(cli => ({ value: cli.id, label: cli.name }))
                                                ]}
                                                value={requestClientId || 'none'}
                                                onChange={(val) => setRequestClientId(val || 'none')}
                                                placeholder="Busque el cliente por nombre o código..."
                                                emptyText="No se encontró ningún cliente activo."
                                                className="h-10 text-sm bg-white dark:bg-black border-slate-200 dark:border-slate-800 w-full"
                                                popoverClassName="w-[450px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Fecha de Inicio Prevista (Trabajo)</Label>
                                            <Input 
                                                type="date"
                                                value={requestStartDate}
                                                onChange={(e) => setRequestStartDate(e.target.value)}
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Seleccionar Trabajador</Label>
                                            <Combobox
                                                options={requestWorkersList.length > 0 ? requestWorkersList : workersList}
                                                value={requestWorkerId || ''}
                                                onChange={(val) => setRequestWorkerId(val || null)}
                                                placeholder="Busque el trabajador registrado..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={creatingRequest || !requestWorkerId || !requestEmpresaId} className="bg-indigo-600 hover:bg-indigo-500">
                                                {creatingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Crear Enlace
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-4 pt-2">
                                        <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                <CheckCircle className="h-5 w-5" />
                                                <span>¡Enlace de Registro Creado!</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Copie el siguiente enlace seguro y envíelo al trabajador para iniciar el formulario y la captura de fotos:</p>
                                            
                                            <div className="flex gap-2">
                                                <Input readOnly value={requestSuccessLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                <Button size="icon" variant="outline" onClick={() => {
                                                     const workerObj = requestWorkersList.find(w => w.value === requestWorkerId) || workersList.find(w => w.value === requestWorkerId);
                                                     handleCopyInviteLink(requestSuccessLink, workerObj?.label);
                                                 }} title="Copiar mensaje con el enlace">
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
                                    <DialogTitle>Editar Solicitud de Documentos</DialogTitle>
                                    <DialogDescription>
                                        Modifique la Empresa Contratante, el Cliente de destino y la Fecha de Inicio del trabajo para <strong>{editingRequest?.worker?.nome}</strong>.
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
                                                <SelectValue placeholder="Seleccione la empresa contratante..." />
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
                                            Cliente (Asignación / Destino)
                                        </Label>
                                        <Combobox
                                            options={[
                                                { value: 'none', label: 'Sin Cliente Especificado' },
                                                ...clientsList.map(cli => ({ value: cli.id, label: cli.name }))
                                            ]}
                                            value={editClientId || 'none'}
                                            onChange={(val) => setEditClientId(val || 'none')}
                                            placeholder="Busque el cliente por nombre o código..."
                                            emptyText="No se encontró ningún cliente activo."
                                            className="h-10 text-sm bg-white dark:bg-black border-slate-200 dark:border-slate-800 w-full"
                                            popoverClassName="w-[450px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Fecha de Inicio Prevista (Trabajo)</Label>
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
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Botão Generar Contrato */}
                        <Dialog open={generateDialogOpen} onOpenChange={(open) => {
                            setGenerateDialogOpen(open);
                            if (!open) {
                                setSelectedWorkerId(null);
                                setSelectedAssignmentId(null);
                                setGenerationSuccess(null);
                                setPreviewBlob(null);
                            } else {
                                const resolvedContratante = selectedContratante || resolveContratanteOption(activeEmpresaId || selectedEmpresaId);
                                if (!selectedContratante) {
                                    setSelectedContratante(resolvedContratante);
                                }
                                if (!selectedContractType) {
                                    setSelectedContractType(resolvedContratante === 'HEXAGON' ? 'contrato_fijo_discontinuo' : 'contrato_termo_incerto');
                                }
                            }
                        }}>
                            <Button 
                                onClick={handleOpenGenerateDialog}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Generar Contrato
                            </Button>
                            <DialogContent className={`${generationSuccess ? 'sm:max-w-7xl max-w-7xl w-[95vw] h-[88vh]' : selectedContractType === 'contrato_fijo_discontinuo' ? 'sm:max-w-4xl max-w-4xl w-[92vw] max-h-[92vh]' : 'sm:max-w-2xl max-w-2xl w-[90vw]'} flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300`}>
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Generar Nuevo Contrato</DialogTitle>
                                    <DialogDescription>
                                        Seleccione el trabajador y el modelo de contrato. El sistema generará el archivo automáticamente con validez eIDAS (incluyendo el modelo oficial SEPE en PDF para Hexagon).
                                    </DialogDescription>
                                </DialogHeader>

                                {!generationSuccess ? (
                                    <form onSubmit={handleGenerate} className="space-y-4 pt-2 overflow-y-auto pr-1">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div className="flex flex-col justify-end space-y-1.5 md:col-span-1">
                                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 block truncate">Seleccionar Trabajador</Label>
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

                                                                let resolvedCont = selectedContratante;
                                                                if (wa) {
                                                                    setSelectedAssignmentId(wa.id);
                                                                    if (wa.empresa_id) {
                                                                        resolvedCont = resolveContratanteOption(wa.empresa_id);
                                                                        setSelectedContratante(resolvedCont);
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
                                                                        resolvedCont = resolveContratanteOption(dr.empresa_id);
                                                                        setSelectedContratante(resolvedCont);
                                                                    }
                                                                }

                                                                if (resolvedCont === 'HEXAGON') {
                                                                    setSelectedContractType('contrato_fijo_discontinuo');
                                                                    populateSepeFormForWorker(val);
                                                                } else if (selectedContractType === 'contrato_fijo_discontinuo') {
                                                                    populateSepeFormForWorker(val);
                                                                }
                                                            } catch (err) {
                                                                console.error("Erro ao auto-selecionar contratante do trabalhador:", err);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Escriba el nombre del trabajador..."
                                                />
                                            </div>

                                            <div className="flex flex-col justify-end space-y-1.5">
                                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 block truncate">Empresa Contratante</Label>
                                                <Select
                                                    value={selectedContratante || undefined}
                                                    onValueChange={(val) => {
                                                        setSelectedContratante(val);
                                                        if (val === 'HEXAGON') {
                                                            setSelectedContractType('contrato_fijo_discontinuo');
                                                            if (selectedWorkerId) populateSepeFormForWorker(selectedWorkerId);
                                                        } else if (selectedContractType === 'contrato_fijo_discontinuo') {
                                                            setSelectedContractType('contrato_termo_incerto');
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                        <SelectValue placeholder="Seleccione la empresa contratante..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[9999]">
                                                        <SelectItem value="STOCCO">Stocco</SelectItem>
                                                        <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                                        <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                                        <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                                        <SelectItem value="TRIANGULO">Triangulo</SelectItem>
                                                        <SelectItem value="HEXAGON">Hexagon (España - SEPE)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex flex-col justify-end space-y-1.5">
                                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 block truncate">Modelo de Contrato</Label>
                                                <Select
                                                    value={selectedContractType || undefined}
                                                    onValueChange={(val) => {
                                                        setSelectedContractType(val);
                                                        if (val === 'contrato_fijo_discontinuo' && selectedWorkerId) {
                                                            populateSepeFormForWorker(selectedWorkerId);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                        <SelectValue placeholder="Seleccione el tipo de contrato..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[9999]">
                                                        <SelectItem value="contrato_fijo_discontinuo">🇪🇸 Contrato Oficial SEPE (Fijo-Discontinuo / Indefinido - PDF)</SelectItem>
                                                        <SelectItem value="contrato_termo_incerto">🇵🇹 Contrato a Termo Incerto (Pasaporte)</SelectItem>
                                                        <SelectItem value="contrato_nis">🇵🇹 Contrato NIS (NIF)</SelectItem>
                                                        <SelectItem value="contrato_alta">📋 Contrato de Alta (Contabilidad - Sin Firma)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {selectedContractType === 'contrato_fijo_discontinuo' && (
                                            <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200 dark:border-indigo-800/80 pb-3">
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                                            🇪🇸 Datos Oficiales SEPE — Modelo Oficial Gestoría Hexagon (Código {sepeForm.sepe_codigo || '300'})
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Rellenado automáticamente con los datos oficiales de la Gestoría (Tarancón / Convenio Metal de Cuenca / CCC 0111-16106973470). Ajústelo si es necesario antes de emitir el PDF.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <select
                                                            value={sepeForm.sepe_codigo || '300'}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, sepe_codigo: e.target.value }))}
                                                            className="h-8 rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                                                            title="Modalidad SEPE en la Página 5/6"
                                                        >
                                                            <option value="300">Cód. 300 — Fijo-Discontinuo</option>
                                                            <option value="100">Cód. 100 — Indefinido Tiempo Completo</option>
                                                            <option value="200">Cód. 200 — Indefinido Tiempo Parcial</option>
                                                        </select>
                                                        <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 shrink-0 border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-slate-900/80">
                                                            7 Páginas Oficiales + eIDAS
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="NIE (España - Ficha del Trabajador)">
                                                            NIE (España - Ficha del Trabajador)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.nie}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, nie: e.target.value.toUpperCase() }))}
                                                            placeholder="Ej: Z1234567X"
                                                            className="h-10 text-xs font-mono bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="DNI / Pasaporte (Identificación)">
                                                            DNI / Pasaporte (Si no tiene NIE)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.dni || sepeForm.pasaporte}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, dni: e.target.value.toUpperCase() }))}
                                                            placeholder="Ej: AZ527939"
                                                            className="h-10 text-xs font-mono bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block truncate" title="Nº Afiliación Seg. Social (NUSS - 12 dígitos)">
                                                            Nº Afiliación Seg. Social (NUSS - 12 dígitos)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.nuss}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, nuss: e.target.value }))}
                                                            placeholder="Ej: 451031986646"
                                                            className="h-10 text-xs font-mono bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="Municipio Domicilio del Trabajador">
                                                            Municipio Domicilio del Trabajador
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.municipio_domicilio}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, municipio_domicilio: e.target.value }))}
                                                            placeholder="Ej: TARANCON"
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="Código Postal (CP Domicilio)">
                                                            Código Postal (CP Domicilio)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.codigo_postal}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, codigo_postal: e.target.value }))}
                                                            placeholder="Ej: 16400"
                                                            className="h-10 text-xs font-mono bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                            Puesto de Trabajo (Primera Cláusula)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.puesto}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, puesto: e.target.value }))}
                                                            placeholder="Ex: OFICIAL MONTADOR DE ESTRUCTURAS METÁLICAS"
                                                            className="h-10 text-xs bg-white dark:bg-slate-900 font-semibold"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                            Grupo Profesional
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.grupo_profesional}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, grupo_profesional: e.target.value }))}
                                                            placeholder="Ex: GRUPO 5 / OFICIALES DE PRIMERA Y SEGUNDA"
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-end space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                        Funciones que va a desarrollar
                                                    </Label>
                                                    <Input
                                                        value={sepeForm.funciones}
                                                        onChange={(e) => setSepeForm(p => ({ ...p, funciones: e.target.value }))}
                                                        placeholder="Ex: Montaje, ensamblaje y fijación de estructuras metálicas en obra"
                                                        className="h-10 text-xs bg-white dark:bg-slate-900"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                            Centro de Trabajo (Obra / Calle)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.centro_trabajo_calle}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, centro_trabajo_calle: e.target.value }))}
                                                            placeholder="Ex: Obra Camp Nou, Av. d'Arístides Maillol"
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                            Municipio del Centro de Trabajo
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.centro_trabajo_municipio}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, centro_trabajo_municipio: e.target.value }))}
                                                            placeholder="Ex: BARCELONA"
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                            CP del Centro de Trabajo
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.centro_trabajo_cp}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, centro_trabajo_cp: e.target.value }))}
                                                            placeholder="Ex: 08028"
                                                            className="h-10 text-xs font-mono bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="Fecha de Inicio (Cuarta Cláusula)">
                                                            Fecha de Inicio (Cuarta Cláusula)
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={sepeForm.fecha_inicio}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, fecha_inicio: e.target.value }))}
                                                            className="h-10 text-xs bg-white dark:bg-slate-900 font-semibold"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="Período de Prueba">
                                                            Período de Prueba
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.periodo_prueba}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, periodo_prueba: e.target.value }))}
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-end space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate" title="Retribución Total (Quinta Cláusula)">
                                                            Retribución Total (Quinta Cláusula)
                                                        </Label>
                                                        <Input
                                                            value={sepeForm.retribucion_total}
                                                            onChange={(e) => setSepeForm(p => ({ ...p, retribucion_total: e.target.value }))}
                                                            className="h-10 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={generating} className="bg-indigo-600 hover:bg-indigo-500">
                                                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                {selectedContractType === 'contrato_fijo_discontinuo' ? 'Emitir Contrato SEPE (.PDF)' : 'Generar Contrato'}
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
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando vista previa...</span>
                                                </div>
                                            )}
                                            {!loadingPreview && !previewBlob && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                                    <AlertCircle className="h-10 w-10 text-slate-400 mb-2" />
                                                    <span className="text-sm text-center font-medium text-slate-500">Vista previa no disponible.</span>
                                                </div>
                                            )}
                                            <style>{`
                                                .docx-wrapper img {
                                                    max-width: none !important;
                                                    display: inline-block !important;
                                                }
                                            `}</style>
                                            {(generationSuccess.documentUrl?.toLowerCase().endsWith('.pdf') || generationSuccess.contractType === 'contrato_fijo_discontinuo') && previewBlob ? (
                                                <PdfCanvasViewer pdfBlob={previewBlob} scale={1.35} />
                                            ) : (
                                                <div ref={previewContainerRef} className="docx-wrapper" />
                                            )}
                                        </div>

                                        {/* Painel Direito: Ações e Status */}
                                        <div className="w-full md:w-[390px] shrink-0 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto">
                                            <div className="space-y-4">
                                                <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                        <CheckCircle className="h-5 w-5" />
                                                        <span>¡Contrato Generado con Éxito!</span>
                                                    </div>
                                                    {generationSuccess.contractType === 'contrato_alta' ? (
                                                        <p className="text-xs text-slate-500 leading-relaxed">
                                                            Este contrato fue clasificado como <strong>Alta (Contabilidad)</strong>. No requiere firma electrónica ni código OTP. El archivo fue enviado directamente al historial de contratos.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-1.5 bg-white/80 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                                                                    <span>OTP Trabajador:</span>
                                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded">{generationSuccess.otpCode}</span>
                                                                </p>
                                                                {generationSuccess.companyOtpCode && (
                                                                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                                                                        <span>OTP Empresa (Representante):</span>
                                                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 px-2 py-0.5 rounded">{generationSuccess.companyOtpCode}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-muted-foreground">Enlace de Firma del Trabajador</Label>
                                                                <div className="flex gap-2">
                                                                    <Input readOnly value={generationSuccess.signingLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                                    <Button size="icon" variant="outline" onClick={() => handleCopyContractSignLink(generationSuccess.signingLink, workersList.find(w => w.value === selectedWorkerId)?.label.split(' (')[0], generationSuccess.otpCode)} title="Copiar mensaje estándar con enlace y código OTP">
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Botão de Assinatura Eletrônica da Empresa (Bilateral OTP) */}
                                                    {generationSuccess.contractType !== 'contrato_alta' && generationSuccess.contractId && (
                                                        <div className="pt-1">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-sm"
                                                                onClick={() => {
                                                                    const found = contracts.find(c => c.id === generationSuccess.contractId);
                                                                    handleOpenCompanySignModal(found || ({
                                                                        id: generationSuccess.contractId!,
                                                                        empresa_id: selectedContratante === 'HEXAGON' ? HEXAGON_EMPRESA_ID : (selectedEmpresaId || ''),
                                                                        worker_id: selectedWorkerId || '',
                                                                        contratante: selectedContratante,
                                                                        contract_type: generationSuccess.contractType || selectedContractType,
                                                                        document_url: generationSuccess.documentUrl || '',
                                                                        status: 'pending_signature',
                                                                        metadata: {
                                                                            company_otp_code: generationSuccess.companyOtpCode,
                                                                            representante_nombre: hexagonSettings?.representante_nombre,
                                                                            representante_nif: hexagonSettings?.representante_nif,
                                                                            representante_cargo: hexagonSettings?.representante_cargo,
                                                                        }
                                                                    } as Contract));
                                                                }}
                                                            >
                                                                <PenTool className="h-4 w-4" />
                                                                Firmar Ahora por la Empresa (OTP)
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {generationSuccess.documentUrl && (
                                                        <div className="pt-1">
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
                                                                Descargar Archivo Generado ({generationSuccess.documentUrl.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx'})
                                                            </Button>
                                                        </div>
                                                    )}

                                                    <div className="text-xs flex items-center gap-2 text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 leading-normal">
                                                        {generationSuccess.contractType === 'contrato_alta' ? (
                                                            <span>Listo para envío a contabilidad.</span>
                                                        ) : generationSuccess.emailSent ? (
                                                            <>
                                                                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                <span>Correo electrónico enviado con éxito al trabajador.</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                                                <span>Sin envío automático de correo (Resend no configurado o trabajador sin correo). Copie el enlace de arriba.</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                                                <Button onClick={() => setGenerateDialogOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                                    Cerrar Panel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Botão & Modal Generar Carta de Rescisión */}
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
                                Carta de Rescisión
                            </Button>
                            <DialogContent className={`${rescisaoSuccess ? 'max-w-7xl sm:max-w-7xl w-[96vw] h-[88vh]' : 'max-w-5xl sm:max-w-5xl w-[95vw] max-h-[92vh]'} flex flex-col bg-white dark:bg-slate-900 p-6 overflow-hidden transition-all duration-300`}>
                                <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-rose-600 dark:text-rose-400">
                                        <FileText className="h-6 w-6" />
                                        Emitir Carta de Rescisión (Solicitud de Rescisión)
                                    </DialogTitle>
                                    <DialogDescription className="text-sm">
                                        Seleccione el trabajador para cargar automáticamente sus documentos (Pasaporte, NIF y NISS), verifique el período de preaviso de 15 días naturales y genere el enlace para firma electrónica.
                                    </DialogDescription>
                                </DialogHeader>

                                {!rescisaoSuccess ? (
                                    <form onSubmit={handleGenerateRescisao} className="space-y-5 pt-3 overflow-y-auto pr-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold">Seleccionar Trabajador</Label>
                                                <Combobox
                                                    options={workersList}
                                                    value={rescisaoWorkerId || ''}
                                                    onChange={(val) => handleSelectRescisaoWorker(val || null)}
                                                    placeholder="Escriba el nombre o código del trabajador..."
                                                    className="h-11 text-sm font-medium"
                                                    popoverClassName="w-[420px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold">Empresa Contratante (Modelo Word)</Label>
                                                <Select value={rescisaoContratante} onValueChange={setRescisaoContratante}>
                                                    <SelectTrigger className="h-11 text-sm font-medium bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                                        <SelectValue placeholder="Seleccione la empresa..." />
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
                                                        Datos del Trabajador y Documentos (Impresos en el Encabezado de la Carta)
                                                    </span>
                                                    {loadingRescisaoWorker && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando datos...
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500">Puede completar o editar cualquier campo a continuación</span>
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
                                                        <span className="text-slate-400 block text-[11px]">Cliente / Obra Actual</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {rescisaoWorkerDetails.cliente || 'Sin cliente vinculado'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Función / Cargo</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {rescisaoWorkerDetails.funcion || '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Contacto (WhatsApp / Correo)</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block" title={`${rescisaoWorkerPhone} ${rescisaoWorkerEmail}`}>
                                                            {rescisaoWorkerPhone || rescisaoWorkerEmail || 'Sin teléfono'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                                                        NISS (Seguridad Social)
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
                                                    <span className="text-slate-500 font-medium">Línea impresa en la Carta:</span>
                                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        {[
                                                            rescisaoPasaporte ? `PASAPORTE: ${rescisaoPasaporte}` : null,
                                                            rescisaoNif ? `NIF: ${rescisaoNif}` : null,
                                                            rescisaoNiss ? `NISS: ${rescisaoNiss}` : null,
                                                        ].filter(Boolean).join('   ') || 'Ningún documento informado'}
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
                                                        Fechas de la Solicitud y Preaviso (15 Días Naturales)
                                                    </span>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Al cambiar la fecha de inicio, la fecha final se calcula automáticamente (+15 días), pero puede editarlas libremente (incluso retroactivo).
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900">
                                                        Plazo: {getDaysDiff(rescisaoStartDate, rescisaoEndDate)} días naturales
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRescisaoEndDate(addDaysToIso(rescisaoStartDate, 15))}
                                                        className="text-xs px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold transition-colors"
                                                        title="Recalcular +15 días a partir de la fecha de inicio"
                                                    >
                                                        Restablecer +15d
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        Fecha de la Solicitud / Carta
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
                                                        Inicio del Preaviso
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
                                                        Fin del Preaviso (+15d)
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
                                                Generar Carta de Rescisión
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
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando vista previa de la Carta de Rescisión...</span>
                                                </div>
                                            )}
                                            {!loadingRescisaoPreview && !rescisaoPreviewBlob && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                                    <AlertCircle className="h-10 w-10 text-slate-400 mb-2" />
                                                    <span className="text-sm text-center font-medium text-slate-500">Vista previa no disponible.</span>
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
                                                        <span>¡Carta de Rescisión Emitida!</span>
                                                    </div>

                                                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                                                        <div><span className="text-slate-400">Trabajador:</span> <strong>{rescisaoWorkerName || workersList.find(w => w.value === rescisaoWorkerId)?.label.split(' (')[0]}</strong></div>
                                                        <div><span className="text-slate-400">Empresa:</span> <strong>{rescisaoContratante}</strong></div>
                                                        <div><span className="text-slate-400">Preaviso:</span> <strong className="text-rose-600 dark:text-rose-400">{formatIsoToBr(rescisaoStartDate)} → {formatIsoToBr(rescisaoEndDate)}</strong></div>
                                                    </div>

                                                    <p className="text-xs text-slate-500">
                                                        Código OTP de Firma: <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-slate-800 px-2 py-0.5 rounded">{rescisaoSuccess.otpCode}</span>
                                                    </p>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Enlace de Firma Electrónica</Label>
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
                                                                title="Copiar mensaje con enlace y código OTP"
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
                                                            Enviar para Firma vía WhatsApp
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
                                                                Descargar Archivo Word (.docx)
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
                                                    Emitir Otra
                                                </Button>
                                                <Button
                                                    onClick={() => setRescisaoDialogOpen(false)}
                                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                                                >
                                                    Finalizar
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
                        <TabsTrigger value="tasks">Tareas Operativas</TabsTrigger>
                        <TabsTrigger value="requests">Solicitudes de Documentos</TabsTrigger>
                        <TabsTrigger value="contracts">Contratos y Firmas</TabsTrigger>
                        <TabsTrigger value="rescisoes" className="flex items-center gap-1.5">
                            <span>Cartas de Rescisión</span>
                            {rescisaoStats.pending > 0 && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                                    {rescisaoStats.pending}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="templates">Configuración de Modelos</TabsTrigger>
                    </TabsList>
                    
                    {/* Conteúdo 1: Tarefas do Kanban */}
                    <TabsContent value="tasks" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4">
                        <DepartmentTaskBoard 
                            title="Cola de Tareas de Documentación" 
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
                                    placeholder="Buscar por trabajador, empresa o cliente..."
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
                                            <SelectItem value="all">Todas las Empresas</SelectItem>
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
                                            <SelectItem value="all">Todos los Clientes</SelectItem>
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
                                            <SelectItem value="all">Todos los Pedidos / Reemplazos</SelectItem>
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
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los Estados</SelectItem>
                                            <SelectItem value="pending_upload">Esperando Envío</SelectItem>
                                            <SelectItem value="submitted">Recibido - Revisar</SelectItem>
                                            <SelectItem value="verified">Registro Validado</SelectItem>
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
                                        Limpiar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Enlaces y Envíos de Documentación</h3>
                                <Button size="sm" variant="ghost" onClick={loadDocRequests}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingDocRequests ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Cargando solicitudes...</span>
                                    </div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Camera className="h-10 w-10 text-slate-400" />
                                        <span>No se encontró ninguna solicitud de documentos.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                                                    onClick={() => handleRequestSort('worker')}
                                                >
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Trabajador</span>
                                                        {sortFieldRequests === 'worker' ? (
                                                            sortDirectionRequests === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                                                    onClick={() => handleRequestSort('empresa')}
                                                >
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Empresa</span>
                                                        {sortFieldRequests === 'empresa' ? (
                                                            sortDirectionRequests === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                                                    onClick={() => handleRequestSort('client')}
                                                >
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Cliente / Pedido</span>
                                                        {sortFieldRequests === 'client' ? (
                                                            sortDirectionRequests === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                                                    onClick={() => handleRequestSort('planned_start_date')}
                                                >
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Inicio Previsto</span>
                                                        {sortFieldRequests === 'planned_start_date' ? (
                                                            sortDirectionRequests === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Estado</TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                                                    onClick={() => handleRequestSort('created_at')}
                                                >
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Creado el</span>
                                                        {sortFieldRequests === 'created_at' ? (
                                                            sortDirectionRequests === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Expira el</TableHead>
                                                <TableHead className="text-right whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRequests.map((req) => {
                                                const inviteLink = `${window.location.origin}/enviar-documentos/${req.token}`;
                                                const isExpired = new Date(req.expires_at) < new Date();
                                                
                                                const activeAssignment = req.worker?.assignments?.find((a: any) => a.empresa_id === req.empresa_id && (a.status === 'active' || a.status === 'planned')) ||
                                                                         req.worker?.assignments?.find((a: any) => a.status === 'active' || a.status === 'planned');
                                                const latestAssignment = req.worker?.assignments?.[0];
                                                const clientName = req.client?.trade_name || req.client?.legal_name ||
                                                                   activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                                                                   latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name ||
                                                                   req.worker?.cliente || 'Sin Asignación';
                                                
                                                const rawWorkerCode = (req.worker as any)?.cod_colab || '';
                                                const workerCode = rawWorkerCode ? (String(rawWorkerCode).startsWith('E') ? String(rawWorkerCode) : `E${rawWorkerCode}`) : '';

                                                const rawClientCode = (req.client as any)?.codigo || (activeAssignment?.client as any)?.codigo || (latestAssignment?.client as any)?.codigo || '';
                                                const clientCode = rawClientCode ? (String(rawClientCode).startsWith('C') ? String(rawClientCode) : `C${rawClientCode}`) : '';

                                                const empresaName = req.empresa?.name || 'Stocco';
                                                
                                                const plannedStartDate = (req as any).extracted_data?.start_date ||
                                                                          activeAssignment?.planned_start_date || activeAssignment?.start_date ||
                                                                          latestAssignment?.planned_start_date || latestAssignment?.start_date;

                                                const formatDisplayDate = (dateStr?: string | null) => {
                                                    if (!dateStr) return 'No informada';
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
                                                        <TableCell className="py-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap leading-snug">
                                                                {req.worker?.nome}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {workerCode && (
                                                                    <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                                                        {workerCode}
                                                                    </span>
                                                                )}
                                                                <span className="truncate max-w-[220px]" title={req.worker?.email || req.worker?.movil || 'Sin contacto'}>
                                                                    {req.worker?.email || req.worker?.movil || 'Sin contacto'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {empresaName}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap leading-snug" title={clientName}>
                                                                {clientName}
                                                            </div>
                                                            {(clientCode || req.pedido_codigo) && (
                                                                <div className="mt-1 flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                                                                    {clientCode && (
                                                                        <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-1.5 py-0.2 rounded">
                                                                            {clientCode}
                                                                        </span>
                                                                    )}
                                                                    {req.pedido_codigo && (
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className={`font-mono text-[11px] px-1.5 py-0 gap-1 whitespace-nowrap ${
                                                                                req.solicitud_tipo === 'replacement' || req.pedido_codigo?.startsWith('R-')
                                                                                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                                                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                                            }`}
                                                                        >
                                                                            <Package className="w-3 h-3 shrink-0" />
                                                                            {req.pedido_codigo}
                                                                            {req.solicitud_tipo === 'replacement' && !req.pedido_codigo?.startsWith('R-') && (
                                                                                <span className="text-[10px] opacity-80">(Reemplazo)</span>
                                                                            )}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {formatDisplayDate(plannedStartDate)}
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            <Badge className={`whitespace-nowrap ${
                                                                req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/25' :
                                                                req.status === 'submitted' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 border-indigo-500/25' :
                                                                isExpired ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15 border-red-500/25' :
                                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border-amber-500/25'
                                                            }`}>
                                                                {req.status === 'verified' ? 'Registro Validado' :
                                                                 req.status === 'submitted' ? 'Recibido - Revisar' :
                                                                 isExpired ? 'Expirado' : 'Esperando Envío'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                                                            {new Date(req.created_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                                                            {new Date(req.expires_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleOpenEditRequest(req)}
                                                                title="Editar Empresa y Cliente"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleDeleteRequest(req.id, req.worker?.nome)}
                                                                title="Eliminar Solicitud"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>

                                                            {(req.status === 'pending_upload' && (req.passport_url || req.selfie_url || req.iban_url || req.residence_url || req.nif_url || req.niss_url || req.license_url)) && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline"
                                                                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold text-xs gap-1"
                                                                    onClick={() => handleOpenVerify(req)}
                                                                    title="Ver Documentos Anteriores / Actuales"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" /> Ver Docs
                                                                </Button>
                                                            )}

                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={async () => {
                                                                    if (isExpired) {
                                                                        try {
                                                                            await reopenDocumentRequest(req.id);
                                                                            loadDocRequests();
                                                                        } catch (e) {
                                                                            console.warn("Erro ao renovar link:", e);
                                                                        }
                                                                    }
                                                                    handleCopyInviteLink(inviteLink, req.worker?.nome);
                                                                }}
                                                                title="Copiar Enlace de Envío"
                                                            >
                                                                <Copy className="h-4 w-4 mr-1 text-slate-500" /> Copiar Enlace
                                                            </Button>

                                                            {(req.status === 'verified' || req.status === 'submitted' || isExpired) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 text-xs gap-1"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await reopenDocumentRequest(req.id);
                                                                            loadDocRequests();
                                                                            handleCopyInviteLink(inviteLink, req.worker?.nome);
                                                                            toast.success(`Solicitação de ${req.worker?.nome || 'trabalhador'} reaberta para novo envio e link copiado!`);
                                                                        } catch (err) {
                                                                            toast.error("Erro ao reabrir solicitação.");
                                                                        }
                                                                    }}
                                                                    title="Reabrir solicitud para permitir nuevo envío de documentos y copiar enlace"
                                                                >
                                                                    <RefreshCw className="h-3.5 w-3.5" /> Nuevo Envío
                                                                </Button>
                                                            )}

                                                            {req.status === 'submitted' && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-indigo-600 hover:bg-indigo-500"
                                                                    onClick={() => handleOpenVerify(req)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" /> Revisar
                                                                </Button>
                                                            )}
                                                            {req.status === 'verified' && (
                                                                <div className="inline-flex items-center gap-2">
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold text-xs gap-1"
                                                                        onClick={() => handleOpenVerify(req)}
                                                                        title="Ver y Descargar Documentos del Trabajador"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5" /> Ver / Descargar Docs
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                                        onClick={() => handleTriggerGenerate(req.worker_id, req.empresa_id, req.worker)}
                                                                    >
                                                                        <Plus className="h-3 w-3" /> Generar Contrato
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
                                    placeholder="Buscar por trabajador, empresa o cliente..."
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
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los Estados</SelectItem>
                                            <SelectItem value="pending_signature">Pendiente de Firma</SelectItem>
                                            <SelectItem value="signed">Firmado</SelectItem>
                                            <SelectItem value="no_signature">No Requiere Firma</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[200px]">
                                    <Select value={pedidoFilterContracts} onValueChange={setPedidoFilterContracts}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Pedido / Reemplazo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los Pedidos / Reemplazos</SelectItem>
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
                                            <SelectItem value="created_at_desc">📅 Fecha (Más Reciente)</SelectItem>
                                            <SelectItem value="created_at_asc">📅 Fecha (Más Antiguo)</SelectItem>
                                            <SelectItem value="worker_asc">🔤 Trabajador (A-Z / Ascendente)</SelectItem>
                                            <SelectItem value="worker_desc">🔤 Trabajador (Z-A / Descendente)</SelectItem>
                                            <SelectItem value="empresa_asc">🏢 Empresa (A-Z / Ascendente)</SelectItem>
                                            <SelectItem value="empresa_desc">🏢 Empresa (Z-A / Descendente)</SelectItem>
                                            <SelectItem value="client_asc">🏬 Cliente (A-Z / Ascendente)</SelectItem>
                                            <SelectItem value="client_desc">🏬 Cliente (Z-A / Descendente)</SelectItem>
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
                                        Limpiar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Contratos Generados</h3>
                                <Button size="sm" variant="ghost" onClick={loadContracts}><RefreshCw className="h-4 w-4" /></Button>
                            </div>

                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingContracts ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Buscando contratos generados...</span>
                                    </div>
                                ) : filteredContracts.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <span>No se encontró ningún contrato.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('worker')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Trabajador</span>
                                                        {sortFieldContracts === 'worker' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('empresa')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Empresa</span>
                                                        {sortFieldContracts === 'empresa' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('client')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Cliente / Pedido</span>
                                                        {sortFieldContracts === 'client' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('type')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Tipo</span>
                                                        {sortFieldContracts === 'type' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Código OTP</TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('status')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Estado</span>
                                                        {sortFieldContracts === 'status' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>

                                                <TableHead className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap" onClick={() => handleContractSort('created_at')}>
                                                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                        <span>Fecha de Emisión</span>
                                                        {sortFieldContracts === 'created_at' ? (
                                                            sortDirectionContracts === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="text-right whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredContracts.map((contract) => {
                                                const signLink = `${window.location.origin}/assinar/${contract.signature_token}`;
                                                const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || contract.worker?.cliente || 'Sin Asignación';
                                                
                                                return (
                                                    <TableRow key={contract.id}>
                                                        <TableCell className="py-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap leading-snug">
                                                                {contract.worker?.nome}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {contract.worker?.email || 'Correo no registrado'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {contract.contratante}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap leading-snug">{clientName}</div>
                                                            {contract.pedido_codigo && (
                                                                <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`font-mono text-[11px] px-1.5 py-0 gap-1 whitespace-nowrap ${
                                                                            contract.solicitud_tipo === 'replacement' || contract.pedido_codigo?.startsWith('R-')
                                                                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                                        }`}
                                                                    >
                                                                        <Package className="w-3 h-3 shrink-0" />
                                                                        {contract.pedido_codigo}
                                                                        {contract.solicitud_tipo === 'replacement' && !contract.pedido_codigo?.startsWith('R-') && (
                                                                            <span className="text-[10px] opacity-80">(Reemplazo)</span>
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            <Badge variant="outline" className="capitalize whitespace-nowrap">
                                                                {contract.contract_type === 'contrato_fijo_discontinuo'
                                                                    ? '🇪🇸 SEPE Fijo-Discontinuo (.PDF)'
                                                                    : contract.contract_type.replace(/_/g, ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-indigo-600 dark:text-indigo-400 font-bold" title="OTP del Trabajador">
                                                                    Trab: {contract.otp_code || '-'}
                                                                </span>
                                                                {contract.metadata?.company_otp_code && (
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="OTP del Representante de la Empresa">
                                                                        Emp: {contract.metadata.company_otp_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <Badge className={
                                                                    contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 w-fit' :
                                                                    contract.status === 'pending_signature' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 w-fit' :
                                                                    contract.status === 'no_signature' ? 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/20 w-fit' :
                                                                    'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 w-fit'
                                                                }>
                                                                    {contract.status === 'signed' ? 'Trabajador: Firmado ✓' :
                                                                     contract.status === 'pending_signature' ? 'Trabajador: Pendiente' :
                                                                     contract.status === 'no_signature' ? 'No Requiere Firma' :
                                                                     contract.status}
                                                                </Badge>
                                                                {contract.status !== 'no_signature' && (contract.contract_type === 'contrato_fijo_discontinuo' || contract.metadata?.company_signed !== undefined || contract.contratante === 'HEXAGON') && (
                                                                    <Badge variant="outline" className={
                                                                        contract.metadata?.company_signed
                                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] w-fit'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[10px] w-fit'
                                                                    }>
                                                                        {contract.metadata?.company_signed ? 'Empresa: Firmada ✓' : 'Empresa: Pendiente'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {contract.created_at ? new Date(contract.created_at).toLocaleDateString('pt-PT') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                            {contract.status !== 'no_signature' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant={contract.metadata?.company_signed ? "outline" : "default"}
                                                                    onClick={() => handleOpenCompanySignModal(contract)}
                                                                    title={contract.metadata?.company_signed ? "Volver a firmar o actualizar firma del Representante de la Empresa" : "Firmar electrónicamente como Representante de la Empresa (OTP)"}
                                                                    className={contract.metadata?.company_signed
                                                                        ? "h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                                                                        : "h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                                                                    }
                                                                >
                                                                    <PenTool className="h-3.5 w-3.5" />
                                                                    {contract.metadata?.company_signed ? 'Empresa ✓' : 'Firmar Empresa'}
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDownloadContract(contract)}
                                                                title="Ver / Descargar Contrato"
                                                            >
                                                                <FileText className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleAttachContractToWorkerProfile(contract)}
                                                                title="Archivar Contrato en la Ficha del Trabajador"
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
                                                                        title="Copiar mensaje estándar del contrato con enlace y código OTP"
                                                                    >
                                                                        <Copy className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>
                                                                    
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => window.open(signLink, '_blank')}
                                                                        title="Abrir Pantalla de Firma"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteContractItem(contract.id)}
                                                                title="Eliminar Contrato"
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

                    {/* Conteúdo 3.5: Control de Cartas de Rescisión & Gestão do Aviso Prévio */}
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
                                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">No Firmadas (Pendientes)</span>
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
                                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Firmadas por el Trabajador</span>
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
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total en Control de Preaviso</span>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{noticeStats.total}</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">Base estándar: € 460,00 (€ 30,67/día)</div>
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
                                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cumpliendo Preaviso (Activos)</span>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{noticeStats.inProgress}</div>
                                        <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">Reduce € 30,67/día (Sáb/Dom incl.)</div>
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
                                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Abandonaron / Cesaron</span>
                                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{noticeStats.abandoned}</div>
                                        <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">Conteo detenido p/ descuento</div>
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
                                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                            <span>Consolidados en Nómina: <strong className="text-emerald-600 dark:text-emerald-400">{noticeStats.consolidatedCount} ({formatCurrencyEur(noticeStats.consolidatedTotal)})</strong></span>
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
                                    placeholder="Buscar trabajador, pasaporte, NIF o empresa..."
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
                                                <SelectValue placeholder="Estado de la Firma" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los Estados</SelectItem>
                                                <SelectItem value="pending_signature">⏳ Pendiente de Firma</SelectItem>
                                                <SelectItem value="signed">✅ Firmado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="w-[215px]">
                                        <Select value={noticeStatusFilter} onValueChange={(v: any) => setNoticeStatusFilter(v)}>
                                            <SelectTrigger className="bg-white dark:bg-black">
                                                <SelectValue placeholder="Situación del Preaviso" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las Situaciones</SelectItem>
                                                <SelectItem value="in_progress">⏳ En Cumplimiento</SelectItem>
                                                <SelectItem value="abandoned">🛑 Abandonó / Cesó</SelectItem>
                                                <SelectItem value="completed">✅ Preaviso Cumplido</SelectItem>
                                                <SelectItem value="waived">⚪ Exento (No Descontar)</SelectItem>
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
                                            <SelectItem value="all">Todas las Empresas</SelectItem>
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
                                    Incluir en Preaviso
                                </Button>

                                <Button
                                    onClick={() => handleOpenRescisaoDialog()}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nueva Carta de Rescisión
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
                                            Control de Cartas de Rescisión
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
                                            Preaviso y Descuentos
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
                                            • 15 días naturales (Sáb/Dom cuentan como cumplidos) • Base estándar: <strong>€ 460,00</strong> (€ 30,67/día)
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
                                            Incluir Trabajador (Manual)
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
                                        <span>Cargando registros...</span>
                                    </div>
                                ) : filteredRescisoes.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <span>No se encontró ningún trabajador para los filtros seleccionados.</span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleOpenCreateManualNotice}
                                                className="border-amber-500/50 text-amber-700 dark:text-amber-300 font-semibold gap-1.5"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Incluir Trabajador en Preaviso
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenRescisaoDialog()}
                                                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Emitir Carta de Rescisión
                                            </Button>
                                        </div>
                                    </div>
                                ) : rescisaoSubView === 'assinaturas' ? (
                                    /* SUB-VISÃO 1: CONTROLE DE ASSINATURAS (GALERIA MELHORADA COM INÍCIO DE TRABALHO E DIAS NO MÊS) */
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Trabajador</TableHead>
                                                <TableHead>Empresa / Cliente</TableHead>
                                                <TableHead>Inicio Trabajo y Días en el Mes</TableHead>
                                                <TableHead>Solicitud y Preaviso (15d)</TableHead>
                                                <TableHead>Resumen Preaviso</TableHead>
                                                <TableHead>Código OTP</TableHead>
                                                <TableHead>Estado de Firma</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
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
                                                                    <span>Inicio: <strong>{info.workStartDate ? formatIsoToBr(info.workStartDate) : 'Informar'}</strong></span>
                                                                    <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="mt-1">
                                                                    <Badge variant="outline" className={`text-[10px] font-semibold ${
                                                                        info.monthWorkedDays > 0
                                                                            ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                                                            : 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                                                    }`}>
                                                                        {info.monthWorkedDays} {info.monthWorkedDays === 1 ? 'día trab. en el mes' : 'días trab. en el mes'}
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
                                                                        {info.applyDeduction ? `Descontar: ${formatCurrencyEur(info.finalToDeduct)}` : 'Exento (€ 0,00)'}
                                                                    </span>
                                                                    <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    {info.fulfilledDays}/{info.totalNoticeDays}d cumplidos
                                                                    {info.stopDate ? ` • Cesó ${formatIsoToBr(info.stopDate)}` : ''}
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
                                                                        {info.isManualEntry && !c.document_url ? '📝 Firmado (Manual)' : '✅ Firmado'}
                                                                    </Badge>
                                                                    {c.signed_at && (
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {new Date(c.signed_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                                                                    ⏳ No Firmado (Pendiente)
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleOpenEditNotice(c)}
                                                                title="Gestionar Aviso Prévio & Desconto em Folha"
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
                                                                        title="Visualizar / Baixar Carta de Rescisión (.docx)"
                                                                    >
                                                                        <FileText className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleAttachContractToWorkerProfile(c)}
                                                                        title="Arquivar Carta de Rescisión no Cadastro do Trabalhador"
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
                                                                        title="Copiar mensaje con enlace y código OTP"
                                                                    >
                                                                        <Copy className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => window.open(signLink, '_blank')}
                                                                        title="Abrir Pantalla de Firma"
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
                                                <TableHead>Trabajador</TableHead>
                                                <TableHead>Empresa / Cliente</TableHead>
                                                <TableHead>Inicio Trabajo y Días en el Mes</TableHead>
                                                <TableHead>Período Preaviso (15d)</TableHead>
                                                <TableHead>Cumplimiento (Sáb/Dom incl.)</TableHead>
                                                <TableHead>Importe Base / Diario</TableHead>
                                                <TableHead>Saldo a Descontar (Nómina)</TableHead>
                                                <TableHead className="text-right">Gestión / Acciones</TableHead>
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
                                                                        {info.monthWorkedDays} {info.monthWorkedDays === 1 ? 'día trab. en el mes' : 'días trab. en el mes'}
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
                                                                        🛑 Cesó el: {formatIsoToBr(info.stopDate)}
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
                                                                            🛑 Abandonó / Cesó
                                                                        </Badge>
                                                                    ) : info.computedStatus === 'completed' ? (
                                                                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                                            ✅ Preaviso Cumplido
                                                                        </Badge>
                                                                    ) : info.computedStatus === 'waived' ? (
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                                                                            ⚪ Exento de Descuento
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                                                                            ⏳ En Cumplimiento ({info.remainingDays}d rest.)
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
                                                                {info.payrollDiscountId ? (
                                                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-500 text-[10px] px-2 py-0.5 font-bold gap-1">
                                                                        ✅ Lanzado en Nómina ({formatCompetenceLabel(info.payrollCompetence)})
                                                                    </Badge>
                                                                ) : (
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
                                                                        {info.applyDeduction ? '💰 Descontar en Nómina' : '⚪ No Descontar (Exento)'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                            {info.finalToDeduct > 0 && info.applyDeduction && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleOpenEditNotice(c, true)}
                                                                    className={`h-8 text-xs font-bold gap-1 px-2.5 ${
                                                                        info.payrollDiscountId
                                                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                                                                    }`}
                                                                    title="Consolidar parada do aviso prévio e lançar o desconto na folha de pagamento (último salário)"
                                                                >
                                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                                    {info.payrollDiscountId ? 'Nómina Consolidada' : 'Consolidar en Nómina'}
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
                                                                Gestionar
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
                    <TabsContent value="templates" className="flex-1 overflow-y-auto min-h-0 pt-4 space-y-6">
                        <div className="rounded-md border bg-card p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                        Modelos de Contratos y Documentos
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Seleccione la empresa contratante para gestionar y personalizar los modelos de archivo (.docx y .pdf SEPE) y los parámetros oficiales de cumplimentación.
                                    </p>
                                </div>
                                <div className="w-full md:w-[320px]">
                                    <Label className="text-xs text-slate-500 font-semibold mb-1 block">Empresa Contratante</Label>
                                    <Select value={selectedConfigContratante} onValueChange={setSelectedConfigContratante}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccione la empresa contratante..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STOCCO">Stocco</SelectItem>
                                            <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                            <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                            <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                            <SelectItem value="TRIANGULO">Triangulo</SelectItem>
                                            <SelectItem value="HEXAGON">Hexagon (España - SEPE)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                                {[
                                    ...(selectedConfigContratante === 'HEXAGON' ? [{
                                        type: 'contrato_fijo_discontinuo',
                                        name: '🇪🇸 Contrato Indefinido Fijo-Discontinuo (SEPE Cód. 300 - Oficial)',
                                        desc: 'Modelo oficial en PDF editable del Ministerio de Trabajo / SEPE de España (7 páginas oficiales + Certificado Bilateral eIDAS).',
                                        fileName: `CONTRATO FIJO DISCONTINUO - HEXAGON.pdf`,
                                        ext: '.pdf'
                                    }] : []),
                                    {
                                        type: 'contrato_termo_incerto',
                                        name: 'Contrato a Termo Incerto (Passaporte)',
                                        desc: 'Modelo padrão para admissão de trabalhadores temporários identificados por número de Passaporte.',
                                        fileName: `CONTRATO TERMO INCERTO - ${selectedConfigContratante.toUpperCase()}.docx`,
                                        ext: '.docx'
                                    },
                                    {
                                        type: 'contrato_nis',
                                        name: 'Contrato NIS (NIF)',
                                        desc: 'Modelo padrão para admissão de trabalhadores com identificação NISS/NIF registrada.',
                                        fileName: `CONTRATO NIS - ${selectedConfigContratante.toUpperCase()}.docx`,
                                        ext: '.docx'
                                    },
                                    {
                                        type: 'contrato_alta',
                                        name: 'Contrato de Alta (Sem Assinatura)',
                                        desc: 'Modelo enviado diretamente à contabilidade/administrativo. Não exige assinatura eletrônica do trabalhador.',
                                        fileName: `CONTRATO DE ALTA - ${selectedConfigContratante.toUpperCase()}.docx`,
                                        ext: '.docx'
                                    },
                                    {
                                        type: 'rescisao',
                                        name: 'Carta de Rescisión (Solicitud de Rescisión)',
                                        desc: 'Modelo oficial em espanhol com cálculo de 15 dias de aviso prévio. Variáveis dinâmicas suportadas no Word: {{nome}}, {{linha_documentos}}, {{data_carta_extenso_es}}, {{data_efeito}}, {{data_inicio_aviso}}, {{data_fim_aviso}} e [ASSINATURA].',
                                        fileName: `COMUNICADO RESCISAO ${selectedConfigContratante.toUpperCase()}.docx`,
                                        ext: '.docx'
                                    }
                                ].map((doc) => (
                                    <div key={doc.type} className="flex flex-col justify-between border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/50 dark:bg-slate-900/20 hover:shadow-sm transition-all">
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</h4>
                                                <Badge variant="outline" className="text-[10px] font-mono border-indigo-100 bg-indigo-50/30 text-indigo-600 dark:border-slate-800 dark:text-indigo-400">
                                                    {doc.ext}
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
                                                        Descargando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                                                        Descargar Modelo
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
                                                        Subiendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                                        Subir Nuevo
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Painel de Configuração Oficial SEPE para Hexagon (Espanha) */}
                        {selectedConfigContratante === 'HEXAGON' && (
                            <form onSubmit={handleSaveHexagonSettings} className="rounded-md border border-indigo-200 dark:border-indigo-800/80 bg-card p-6 space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                            <Settings2 className="h-5 w-5" />
                                            🇪🇸 Parámetros Oficiales SEPE — Hexagon Montajes Industriales, S.L.
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Configure los datos fijos de la empresa, representante legal (para firma electrónica OTP), cuenta de cotización de la Seguridad Social y la asignación automática de cargos para el Contrato Oficial SEPE.
                                        </p>
                                    </div>
                                    <Button type="submit" disabled={savingHexagonSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2">
                                        {savingHexagonSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Guardar Parámetros SEPE
                                    </Button>
                                </div>

                                {/* 1. Representante Legal & Assinatura Digital da Empresa */}
                                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        1. Representante Legal de la Empresa (Cuadro "Datos de la Empresa" + Firma Bilateral OTP)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">D./Dña. (Nombre del Representante)</Label>
                                            <Input
                                                value={hexagonSettings.representante_nombre || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, representante_nombre: e.target.value }))}
                                                placeholder="Ex: JUAN PÉREZ GARCÍA"
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">NIF / NIE del Representante</Label>
                                            <Input
                                                value={hexagonSettings.representante_nif || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, representante_nif: e.target.value }))}
                                                placeholder="Ex: 12345678Z"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">En Concepto (Cargo)</Label>
                                            <Input
                                                value={hexagonSettings.representante_cargo || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, representante_cargo: e.target.value }))}
                                                placeholder="Ex: ADMINISTRADOR ÚNICO"
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Correo p/ Recibir OTP de Firma</Label>
                                            <Input
                                                type="email"
                                                value={hexagonSettings.representante_email || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, representante_email: e.target.value }))}
                                                placeholder="administracion@hexagon.es"
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Dados da Empresa & Conta de Cotização (Seguridad Social) */}
                                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        2. Datos de la Empresa, Cuenta de Cotización (CCC) y Actividad Económica (CNAE)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">CIF / NIF de la Empresa</Label>
                                            <Input
                                                value={hexagonSettings.cif || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, cif: e.target.value }))}
                                                placeholder="B19394493"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs font-semibold">Nombre o Razón Social</Label>
                                            <Input
                                                value={hexagonSettings.razon_social || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, razon_social: e.target.value }))}
                                                placeholder="HEXAGON MONTAJES INDUSTRIALES, S.L."
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Domicilio Social (Calle y Nº)</Label>
                                            <Input
                                                value={hexagonSettings.domicilio_social || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, domicilio_social: e.target.value }))}
                                                placeholder="Ex: Calle..."
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-1 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Municipio Sede</Label>
                                            <Input
                                                value={hexagonSettings.municipio_empresa || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, municipio_empresa: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Cód. INE Municipio</Label>
                                            <Input
                                                value={hexagonSettings.municipio_cod_empresa || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, municipio_cod_empresa: e.target.value }))}
                                                placeholder="08019"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Código Postal</Label>
                                            <Input
                                                value={hexagonSettings.cp_empresa || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, cp_empresa: e.target.value }))}
                                                placeholder="08028"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Régimen Seg. Social</Label>
                                            <Input
                                                value={hexagonSettings.ccc_regimen || '0111'}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, ccc_regimen: e.target.value }))}
                                                placeholder="0111"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs font-semibold">Cuenta de Cotización CCC (11 dígitos: Prov+Num+DC)</Label>
                                            <Input
                                                value={hexagonSettings.ccc_numero || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, ccc_numero: e.target.value }))}
                                                placeholder="Ex: 08123456789"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Cód. CNAE</Label>
                                            <Input
                                                value={hexagonSettings.cnae_cod || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, cnae_cod: e.target.value }))}
                                                placeholder="43"
                                                className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs font-semibold">Actividad Económica (Texto CNAE)</Label>
                                            <Input
                                                value={hexagonSettings.cnae_texto || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, cnae_texto: e.target.value }))}
                                                placeholder="CONSTRUCCIÓN / MONTAJES INDUSTRIALES"
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">SEPE / Lugar de Firma</Label>
                                            <Input
                                                value={hexagonSettings.lugar_firma || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, lugar_firma: e.target.value, sepe_municipio: e.target.value.toUpperCase() }))}
                                                placeholder="Barcelona"
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Condições Padrão do Contrato (Jornada, Salário, Férias, Convenio) */}
                                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        3. Condiciones Laborales Estándar (Cláusulas 1ª a 9ª y Fijo-Discontinuo)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs font-semibold">Convenio Colectivo Aplicable (Cláusula 8ª / Pág. 6)</Label>
                                            <Input
                                                value={hexagonSettings.convenio_colectivo || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, convenio_colectivo: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Vacaciones Anuales (Cláusula 7ª)</Label>
                                            <Input
                                                value={hexagonSettings.vacaciones || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, vacaciones: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Retribución Total Estándar (Cláusula 5ª)</Label>
                                            <Input
                                                value={hexagonSettings.retribucion_default || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, retribucion_default: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Conceptos Salariales</Label>
                                            <Input
                                                value={hexagonSettings.conceptos_salariales || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, conceptos_salariales: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Horário / Distribución Jornada (40h/sem)</Label>
                                            <Input
                                                value={hexagonSettings.horario_jornada || ''}
                                                onChange={(e) => setHexagonSettings((p: any) => ({ ...p, horario_jornada: e.target.value }))}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Actividad Cíclica / Intermitente Fijo-Discontinuo (Página 6 - Cláusula Específica Cód. 300)</Label>
                                        <Input
                                            value={hexagonSettings.actividad_fijo_discontinuo || ''}
                                            onChange={(e) => setHexagonSettings((p: any) => ({ ...p, actividad_fijo_discontinuo: e.target.value }))}
                                            className="h-9 text-xs bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* 4. Mapeamento de Cargos/Funções -> Puesto, Grupo Profesional e Funciones */}
                                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                4. Asignación Automática de Cargos (Primera Cláusula SEPE)
                                            </h4>
                                            <p className="text-[11px] text-slate-500">
                                                Cuando el trabajador tiene uno de estos cargos en la Solicitud/Obra, el sistema rellena automáticamente el Puesto, Grupo Profesional y Funciones en el PDF.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={newRoleKey}
                                                onChange={(e) => setNewRoleKey(e.target.value)}
                                                placeholder="Nuevo cargo (ej: SOLDADOR)"
                                                className="h-8 text-xs w-48 bg-white dark:bg-slate-900"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs font-semibold"
                                                onClick={() => {
                                                    const key = newRoleKey.trim().toUpperCase();
                                                    if (!key) return;
                                                    setHexagonSettings((prev: any) => ({
                                                        ...prev,
                                                        cargos_mapeamento: {
                                                            ...(prev.cargos_mapeamento || {}),
                                                            [key]: {
                                                                puesto: key,
                                                                grupo_profesional: 'SEGÚN CONVENIO COLECTIVO',
                                                                funciones: `Trabajos propios de la categoría de ${key} en obra`,
                                                                periodo_prueba: 'Según Convenio Colectivo'
                                                            }
                                                        }
                                                    }));
                                                    setNewRoleKey('');
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Cargo
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {Object.entries(hexagonSettings.cargos_mapeamento || {}).map(([roleName, cfg]: [string, any]) => (
                                            <div key={roleName} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Badge className="bg-indigo-600 text-white font-mono text-xs">{roleName}</Badge>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-xs text-rose-500 hover:text-rose-700 px-2"
                                                        onClick={() => {
                                                            setHexagonSettings((prev: any) => {
                                                                const nextMap = { ...(prev.cargos_mapeamento || {}) };
                                                                delete nextMap[roleName];
                                                                return { ...prev, cargos_mapeamento: nextMap };
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px]">Puesto de Trabajo (Impreso en el PDF)</Label>
                                                        <Input
                                                            value={cfg?.puesto || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setHexagonSettings((prev: any) => ({
                                                                    ...prev,
                                                                    cargos_mapeamento: {
                                                                        ...(prev.cargos_mapeamento || {}),
                                                                        [roleName]: { ...cfg, puesto: val }
                                                                    }
                                                                }));
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px]">Grupo Profesional</Label>
                                                        <Input
                                                            value={cfg?.grupo_profesional || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setHexagonSettings((prev: any) => ({
                                                                    ...prev,
                                                                    cargos_mapeamento: {
                                                                        ...(prev.cargos_mapeamento || {}),
                                                                        [roleName]: { ...cfg, grupo_profesional: val }
                                                                    }
                                                                }));
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px]">Funciones</Label>
                                                        <Input
                                                            value={cfg?.funciones || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setHexagonSettings((prev: any) => ({
                                                                    ...prev,
                                                                    cargos_mapeamento: {
                                                                        ...(prev.cargos_mapeamento || {}),
                                                                        [roleName]: { ...cfg, funciones: val }
                                                                    }
                                                                }));
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={savingHexagonSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2">
                                        {savingHexagonSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Guardar Parámetros SEPE de Hexagon
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Input de Arquivo oculto para upload de templates */}
                        <input
                            type="file"
                            ref={configFileInputRef}
                            onChange={handleUploadConfigTemplate}
                            accept=".docx,.pdf"
                            className="hidden"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal Lado a Lado de Verificação (Revisão OCR) */}
            <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
                <DialogContent className="sm:max-w-[95vw] max-w-[95vw] xl:max-w-[1440px] h-[90vh] flex flex-col bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    Revisión y Visualización de Documentos del Trabajador
                                </DialogTitle>
                                <DialogDescription>
                                    Visualice y descargue los documentos originales (Identificación, Residencia Europea, NIF, NISS, Permiso de Conducir, IBAN, Selfie) enviados por el trabajador.
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
                                        <Download className="h-4 w-4" /> Descargar Doc Actual
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
                                        onClick={handleDownloadAllDocs}
                                    >
                                        <Download className="h-4 w-4" /> Descargar Todos los Adjuntos
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
                                <div className="flex border-b dark:border-slate-800 text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('identity')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'identity' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Identificación {selectedRequest.passport_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('residence')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'residence' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Residencia {(selectedRequest.residence_url || selectedRequest.extracted_data?.residence_url || (selectedRequest.extracted_data as any)?.residence_back_url) ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('nif')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'nif' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NIF {selectedRequest.nif_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('niss')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'niss' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NISS {selectedRequest.niss_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('license')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'license' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Carta {selectedRequest.license_url ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('iban')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'iban' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        IBAN {(selectedRequest.iban_url || selectedRequest.extracted_data?.iban_url) ? '●' : ''}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleTabChange('selfie')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all whitespace-nowrap ${activeDocTab === 'selfie' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Selfie {selectedRequest.selfie_url ? '●' : ''}
                                    </button>
                                </div>

                                {/* Sub-seletor Frente / Verso quando estiver na aba Residência */}
                                {activeDocTab === 'residence' && (
                                    <div className="px-2.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-slate-400">Lado del Documento de Residencia:</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setResidenceSide('front')}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                                    residenceSide === 'front'
                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                }`}
                                            >
                                                1. Frente (Anverso) {(selectedRequest.residence_url || selectedRequest.extracted_data?.residence_url) ? '●' : ''}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setResidenceSide('back')}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                                    residenceSide === 'back'
                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                }`}
                                            >
                                                2. Verso (Reverso) {(selectedRequest.extracted_data as any)?.residence_back_url ? '●' : ''}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Barra de Ação Rápida: Classificar & Adjuntar a la Ficha do Trabalhador */}
                                <div className="p-2.5 bg-indigo-950/40 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-[240px] flex-1">
                                        <span className="text-[11px] font-semibold text-indigo-300 shrink-0">Tipo en la Ficha:</span>
                                        <select
                                            value={selectedAttachDocType}
                                            onChange={(e) => setSelectedAttachDocType(e.target.value)}
                                            className="h-8 text-xs bg-slate-900 border border-slate-700 text-white rounded px-2 w-full min-w-[160px] flex-1 focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="foto">Foto do Trabalhador</option>
                                            <option value="passaporte">Passaporte</option>
                                            <option value="residencia_europeia">Residência Europeia</option>
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
                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
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
                                                Rechazar / Eliminar
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
                                            {activeDocUrl ? 'Reemplazar Archivo' : 'Subir Archivo'}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!activeDocUrl || savingAttachDoc}
                                            onClick={handleSaveDocToWorkerProfile}
                                            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1 shrink-0 px-3"
                                        >
                                            {savingAttachDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                            Adjuntar a la Ficha
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
                                            <span className="text-sm font-medium">Subiendo y procesando archivo...</span>
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
                                                <p className="text-sm font-semibold text-slate-200">
                                                    Nenhum arquivo enviado para {activeDocTab === 'residence' ? `RESIDÊNCIA EUROPEIA (${residenceSide === 'back' ? 'VERSO' : 'FRENTE'})` : activeDocTab.toUpperCase()}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">Haga clic aquí para subir el archivo (Foto/PDF) enviado por el trabajador por WhatsApp o correo</p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="mt-2 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                                            >
                                                <Upload className="h-3.5 w-3.5 mr-1" /> Seleccionar Archivo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Painel Direito: Formulário com Dados do OCR */}
                            <form onSubmit={handleApproveVerify} className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 p-4 justify-between overflow-y-auto">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 text-sm">Datos del Trabajador Revisados</h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs">Nombre Completo</Label>
                                            <Input required value={verifyFormData.nome} onChange={(e) => setVerifyFormData({ ...verifyFormData, nome: e.target.value })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Banco / Entidad</Label>
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
                                                <Label className="text-xs">Pasaporte</Label>
                                                <Input value={verifyFormData.pasaporte} onChange={(e) => setVerifyFormData({ ...verifyFormData, pasaporte: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Bloco Interativo de Validação de Residência Europeia */}
                                        <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                                                        ¿Posee Residencia Legal en la Unión Europea?
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Respuesta informada por el trabajador (haga clic para ajustar)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVerifyFormData(prev => ({ ...prev, tiene_residencia_ue: true }))}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                                                            verifyFormData.tiene_residencia_ue
                                                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-700'
                                                        }`}
                                                    >
                                                        SÍ (Tiene Residencia)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVerifyFormData(prev => ({ ...prev, tiene_residencia_ue: false }))}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                                                            !verifyFormData.tiene_residencia_ue
                                                                ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                                                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-700'
                                                        }`}
                                                    >
                                                        NO (Solo Pasaporte)
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {(selectedRequest.residence_url || selectedRequest.extracted_data?.residence_url) ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Frente adjunto
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Sin Frente
                                                        </span>
                                                    )}
                                                    {(selectedRequest.extracted_data as any)?.residence_back_url ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Reverso adjunto
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Sin Reverso
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            handleTabChange('residence');
                                                            setResidenceSide('front');
                                                        }}
                                                        className="h-7 text-xs px-2.5 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                                    >
                                                        Ver Frente
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            handleTabChange('residence');
                                                            setResidenceSide('back');
                                                        }}
                                                        className="h-7 text-xs px-2.5 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                                    >
                                                        Ver Reverso
                                                    </Button>
                                                </div>
                                            </div>

                                            {verifyFormData.tiene_residencia_ue && (
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div>
                                                        <Label className="text-xs">Nº Residencia / NIE / Título</Label>
                                                        <Input
                                                            value={verifyFormData.numero_residencia || verifyFormData.nie}
                                                            onChange={(e) => {
                                                                const val = e.target.value.toUpperCase();
                                                                setVerifyFormData(prev => ({
                                                                    ...prev,
                                                                    numero_residencia: val,
                                                                    nie: val
                                                                }));
                                                            }}
                                                            placeholder="Ex: Y1234567X / PT..."
                                                            className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">País de Residencia UE</Label>
                                                        <Input
                                                            value={verifyFormData.pais_residencia}
                                                            onChange={(e) => setVerifyFormData(prev => ({ ...prev, pais_residencia: e.target.value }))}
                                                            placeholder="Ex: España, Portugal..."
                                                            className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="text-xs">Permiso de Conducir</Label>
                                            <Input value={verifyFormData.licencia_conducir} onChange={(e) => setVerifyFormData({ ...verifyFormData, licencia_conducir: e.target.value })} />
                                        </div>

                                         <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">Nacionalidad</Label>
                                                <Input value={verifyFormData.nacionalidade} onChange={(e) => setVerifyFormData({ ...verifyFormData, nacionalidade: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Fecha de Nacimiento (AAAA-MM-DD)</Label>
                                                <Input type="date" value={verifyFormData.fecha_nacimiento} onChange={(e) => setVerifyFormData({ ...verifyFormData, fecha_nacimiento: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Dados Espanhóis / Seguridad Social (Hexagon - SEPE) */}
                                        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                                                🇪🇸 Datos para Contrato España (SEPE / Seguridad Social — Hexagon)
                                            </span>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-[11px]">Nº Afiliación Seg. Social (NUSS)</Label>
                                                    <Input
                                                        value={verifyFormData.nuss}
                                                        onChange={(e) => setVerifyFormData({ ...verifyFormData, nuss: e.target.value })}
                                                        placeholder="12 dígitos"
                                                        className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px]">Municipio Domicilio (España)</Label>
                                                    <Input
                                                        value={verifyFormData.municipio_domicilio}
                                                        onChange={(e) => setVerifyFormData({ ...verifyFormData, municipio_domicilio: e.target.value })}
                                                        placeholder="Ex: Barcelona"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px]">Código Postal (CP)</Label>
                                                    <Input
                                                        value={verifyFormData.codigo_postal}
                                                        onChange={(e) => setVerifyFormData({ ...verifyFormData, codigo_postal: e.target.value })}
                                                        placeholder="Ex: 08028"
                                                        className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto y Direcciones</h5>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Correo Electrónico (E-mail)</Label>
                                                    <Input type="email" value={verifyFormData.email} onChange={(e) => setVerifyFormData({ ...verifyFormData, email: e.target.value })} placeholder="email@exemplo.com" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Teléfono Móvil</Label>
                                                    <Input type="tel" value={verifyFormData.movil} onChange={(e) => setVerifyFormData({ ...verifyFormData, movil: e.target.value })} placeholder="+34 600... / +55..." />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Ubicación / Ciudad y País</Label>
                                                    <Input value={verifyFormData.ubicacion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, ubicacion_actual: e.target.value })} placeholder="Ex: Madrid, España" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Dirección Actual (Domicilio)</Label>
                                                    <Input value={verifyFormData.direccion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, direccion_actual: e.target.value })} placeholder="Ex: Calle Mayor 12, 3ºB" />
                                                </div>
                                            </div>

                                            {/* Campo para Endereço Oficial do Contrato em Portugal */}
                                            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                                                <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Dirección para Contrato (Portugal)
                                                </Label>
                                                <Input 
                                                    value={verifyFormData.morada_contrato} 
                                                    onChange={(e) => setVerifyFormData({ ...verifyFormData, morada_contrato: e.target.value })} 
                                                    placeholder="Ex: Rua Garrett 25, 2º Dto, 1200-203 Lisboa, Portugal" 
                                                    className="bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-sm font-medium"
                                                />
                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                                                    * Si se rellena, esta dirección se utilizará en contratos de Portugal en lugar de la dirección de origen.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto de Emergencia / Familiar</h5>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs">Nombre del Familiar</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_nombre} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_nombre: e.target.value })} placeholder="Nome completo" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Parentesco</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_parentesco} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_parentesco: e.target.value })} placeholder="Ex: Esposa" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Teléfono</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_telefono} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_telefono: e.target.value })} placeholder="+34 600..." />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Tallas de Uniforme / EPI</h5>
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
                                    <Button type="button" variant="outline" className="px-4" onClick={() => setVerifyDialogOpen(false)}>Cerrar</Button>
                                    <Button type="submit" disabled={verifying} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                        {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {selectedRequest?.status === 'verified' ? 'Guardar Cambios no Cadastro' : 'Aprovar & Salvar no Cadastro'}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        disabled={verifying} 
                                        onClick={() => handleApproveVerify(undefined, true)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5"
                                    >
                                        {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4" />}
                                        Salvar & Generar Contrato ⚡
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
                            Trabajadores de la Solicitud {selectedTaskForWorkers?.solicitud?.codigo}
                        </DialogTitle>
                        <DialogDescription>
                            Gestione el envío de documentos, contacto por WhatsApp y emisión de contratos para los trabajadores vinculados a este pedido.
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
                                            Inicio Previsto
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
                                        {taskMetadata.expectedStartDate ? formatHeaderDate(taskMetadata.expectedStartDate) : 'Por Definir'}
                                    </div>
                                    {taskMetadata.expectedEndDate ? (
                                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                            Hasta: <span className="font-semibold text-white">{formatHeaderDate(taskMetadata.expectedEndDate)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-slate-400">Duración indeterminada</div>
                                    )}
                                </div>

                                {/* 2. CLIENTE & CONTRATANTE */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1 mb-1">
                                            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                                            Cliente y Grupo
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
                                            Lugar / Obra
                                        </span>
                                        <div className="text-sm font-bold text-white truncate" title={taskMetadata.siteName}>
                                            {taskMetadata.siteName}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-1 truncate" title={taskMetadata.siteAddressFormatted || 'Sem endereço específico'}>
                                        {taskMetadata.siteAddressFormatted ? (
                                            <span className="text-slate-200">{taskMetadata.siteAddressFormatted}</span>
                                        ) : (
                                            <span className="italic text-slate-400">Dirección del cliente</span>
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
                                        <span className="text-slate-400">Creado el:</span>
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
                                <span>Cargando trabajadores...</span>
                            </div>
                        ) : taskWorkers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 h-full">
                                <AlertCircle className="h-10 w-10 text-slate-400" />
                                <span>No se encontró ningún trabajador vinculado a este pedido.</span>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                    <TableRow>
                                        <TableHead>Trabajador</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Estado Documentos</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
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
                                                                    Por Definir (Reemplazo)
                                                                </span>
                                                            </div>
                                                            {item.replaced_worker && (
                                                                <div className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">
                                                                    Reemplazando a: {item.replaced_worker.nome} (Cód: {item.replaced_worker.cod_colab || 'N/A'})
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
                                                                    Reemplazando a: {item.replaced_worker.nome}
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
                                                            Esperando Contratación
                                                        </Badge>
                                                    ) : !item.docRequest ? (
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200">
                                                            Sin Enlace de Envío
                                                        </Badge>
                                                    ) : docStatus === 'verified' ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                                            Registro Validado
                                                        </Badge>
                                                    ) : docStatus === 'submitted' ? (
                                                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
                                                            Recibido - Revisar
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                                            Esperando Envío
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                    {/* Analisar / Ver Docs Button */}
                                                    {item.docRequest && item.worker && (
                                                        docStatus === 'submitted' ||
                                                        docStatus === 'verified' ||
                                                        item.docRequest.passport_url ||
                                                        item.docRequest.selfie_url ||
                                                        item.docRequest.iban_url ||
                                                        item.docRequest.residence_url ||
                                                        item.docRequest.nif_url ||
                                                        item.docRequest.niss_url ||
                                                        item.docRequest.license_url
                                                    ) && (
                                                        <Button
                                                            size="sm"
                                                            variant={docStatus === 'submitted' ? 'default' : 'outline'}
                                                            className={docStatus === 'submitted' 
                                                                ? "bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                                : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-medium text-xs gap-1.5"
                                                            }
                                                            onClick={() => handleOpenVerify(item.docRequest)}
                                                            title="Visualizar ou analisar documentos do trabalhador"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            {docStatus === 'submitted' ? 'Revisar' : 'Ver Docs'}
                                                        </Button>
                                                    )}

                                                    {/* Reabrir para Nuevo Envío Button */}
                                                    {item.docRequest && (docStatus === 'verified' || docStatus === 'submitted') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 text-xs gap-1"
                                                            onClick={async () => {
                                                                try {
                                                                    const reopened = await reopenDocumentRequest(item.docRequest.id);
                                                                    setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: { ...item.docRequest, ...reopened } } : w));
                                                                    loadDocRequests();
                                                                    handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${item.docRequest.token}`, item.worker?.nome);
                                                                    toast.success(`Solicitação reaberta para novo envio de ${item.worker?.nome || 'trabalhador'}!`);
                                                                } catch (err) {
                                                                    toast.error("Erro ao reabrir solicitação.");
                                                                }
                                                            }}
                                                            title="Solicitar novo envio de documentos (reabre o link)"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            Nuevo Envío
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
                                                             onClick={async () => {
                                                                 const isExpired = item.docRequest.expires_at && new Date(item.docRequest.expires_at) < new Date();
                                                                 const isHexagon = (taskMetadata?.empresaId || item.docRequest.empresa_id || selectedEmpresaId) === HEXAGON_EMPRESA_ID;
                                                                 if (isExpired || (isHexagon && item.docRequest.status !== 'pending_upload')) {
                                                                     try {
                                                                         const reopened = await reopenDocumentRequest(item.docRequest.id);
                                                                         setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: { ...item.docRequest, ...reopened } } : w));
                                                                         loadDocRequests();
                                                                     } catch (e) {
                                                                         console.warn("Aviso ao renovar link:", e);
                                                                     }
                                                                 }
                                                                 handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${item.docRequest.token}`, item.worker?.nome);
                                                             }}
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
                                                             Crear Enlace
                                                         </Button>
                                                     )}

                                                    {/* Generar Contrato Button */}
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
                        <Button variant="outline" onClick={() => setWorkersDialogOpen(false)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Modal de Gestão, Inclusão e Consolidação de Desconto do Aviso Prévio na Folha */}
            <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
                <DialogContent className="sm:max-w-[95vw] max-w-[1320px] w-[95vw] p-5 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    {noticeDialogMode === 'create'
                                        ? 'Incluir Trabajador en el Control de Preaviso y Descuento'
                                        : `Gestionar Preaviso y Consolidar Descuento en Nómina — ${noticeWorkerName}`}
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Controle los 15 días de preaviso, registre la fecha de cese/abandono y consolide el descuento directamente en la nómina (último salario).
                                </DialogDescription>
                            </div>
                            {noticeDialogMode === 'edit' && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                                        {noticeContratante}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 bg-slate-50 dark:bg-slate-800">
                                        Aviso: {formatIsoToBr(noticeStartDate)} → {formatIsoToBr(noticeEndDate)}
                                    </Badge>
                                    {editingNoticeContract?.metadata?.payroll_discount_id && (
                                        <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                                            ✅ Consolidado en Nómina ({formatCompetenceLabel(editingNoticeContract.metadata.payroll_competence)})
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
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

                        const previewMissingDays = Math.max(0, 15 - previewFulfilledDays);
                        const previewAbatido = Math.min(safePenalty, previewFulfilledDays * dailyRatePreview);
                        const previewRestante = Math.max(0, Number((safePenalty - previewAbatido).toFixed(2)));
                        const previewFinalDesconto = noticeApplyDeduction ? previewRestante : 0;

                        const autoGeneratedObs = buildAutoPayrollDescription({
                            competenceMonth: noticeCompetenceMonth,
                            startNotice: noticeStartDate,
                            endNotice: noticeEndDate,
                            stopDate: noticeStopDate || today,
                            fulfilledDays: previewFulfilledDays,
                            totalDays: 15,
                            dailyRate: dailyRatePreview,
                            penaltyTotal: safePenalty,
                            finalDiscount: previewRestante,
                            stopReason: noticeStopReason || noticeNotes || 'Abandono de trabalho / Não cumpriu aviso prévio',
                            extraNotes: noticeNotes,
                            monthWorkedDays: noticeMonthWorkedDays,
                        });

                        const displayedPayrollObs = noticePayrollDescriptionEdited
                            ? noticePayrollDescriptionCustom
                            : autoGeneratedObs;

                        // Sugestões rápidas de mês de competência (mês do início do aviso e mês da parada/fim)
                        const startMonth = (noticeStartDate || today).substring(0, 7);
                        const stopOrEndMonth = (noticeStopDate || noticeEndDate || today).substring(0, 7);
                        const suggestedMonths = Array.from(new Set([startMonth, stopOrEndMonth, today.substring(0, 7)])).filter(Boolean);

                        return (
                            <form onSubmit={handleSaveNoticeModal} className="space-y-3 pt-1">
                                {noticeDialogMode === 'create' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Trabajador *</Label>
                                            <Combobox
                                                options={workersList}
                                                value={noticeWorkerId}
                                                onChange={(val) => handleSelectManualNoticeWorker(val)}
                                                placeholder="Buscar por nombre, pasaporte, NIF o código..."
                                                emptyText="Ningún trabajador encontrado."
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Empresa Contratante *</Label>
                                            <Select value={noticeContratante} onValueChange={setNoticeContratante}>
                                                <SelectTrigger className="bg-white dark:bg-black h-9">
                                                    <SelectValue placeholder="Seleccione la empresa..." />
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
                                )}

                                {/* Layout Lado a Lado em 2 Colunas para caber em Tela Inteira sem Barra de Rolagem */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                    {/* COLUNA ESQUERDA (7 cols): Dados de Admissão, Período de 15 Dias e Situação de Parada */}
                                    <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                                        {/* Bloco 1 & 2 Integrados: Admissão, Dias no Mês, Período do Aviso (15d) e Valor Base */}
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    1. Admisión, Días Trabajados en el Mes y Período de Preaviso (15 Días)
                                                </h4>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setNoticeMonthWorkedDays('0')}
                                                    className="h-6 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2"
                                                >
                                                    Poner Días a Cero (Abandono sin Saldo)
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold block truncate" title="Fecha de Inicio de Trabajo (Admisión)">
                                                        Inicio Trabajo (Admisión)
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={noticeWorkStartDate}
                                                        onChange={(e) => {
                                                            const ws = e.target.value;
                                                            setNoticeWorkStartDate(ws);
                                                            const autoDays = computeDefaultMonthWorkedDays(ws || null, noticeStartDate, noticeStopDate || null, today);
                                                            setNoticeMonthWorkedDays(String(autoDays));
                                                        }}
                                                        className="h-9 text-xs bg-white dark:bg-black"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold block truncate" title="Días Trabajados en el Mes de Rescisión">
                                                        Días Trab. Mes
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={31}
                                                        value={noticeMonthWorkedDays}
                                                        onChange={(e) => setNoticeMonthWorkedDays(e.target.value)}
                                                        className="h-9 text-xs bg-white dark:bg-black font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold block truncate">Inicio Preaviso</Label>
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
                                                        className="h-9 text-xs bg-white dark:bg-black"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold block truncate">Fin Preaviso (15 días)</Label>
                                                    <Input
                                                        type="date"
                                                        value={noticeEndDate}
                                                        onChange={(e) => setNoticeEndDate(e.target.value)}
                                                        className="h-9 text-xs bg-white dark:bg-black"
                                                    />
                                                </div>

                                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                                    <Label className="text-[11px] font-semibold block truncate">Valor Base (€)</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={noticePenaltyTotal}
                                                            onChange={(e) => setNoticePenaltyTotal(e.target.value)}
                                                            className="h-9 text-xs bg-white dark:bg-black font-bold pr-14"
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                                                            {formatCurrencyEur(dailyRatePreview)}/d
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500">
                                                Regla: 15 días naturales (sábado y domingo cuentan como cumplidos). Valor diario: <strong>{formatCurrencyEur(dailyRatePreview)}/dia</strong>.
                                            </p>
                                        </div>

                                        {/* Bloco 3: Situação de Cumprimento / Parada por Abandono */}
                                        <div className="p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/15 space-y-3 flex-1 flex flex-col justify-between">
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        2. Situación de Cumplimiento y Cese del Preaviso
                                                    </h4>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">¿Descontar en Nómina?</span>
                                                        <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNoticeApplyDeduction(true)}
                                                                className={`px-2.5 py-0.5 text-[11px] font-bold ${
                                                                    noticeApplyDeduction
                                                                        ? 'bg-rose-600 text-white'
                                                                        : 'bg-white dark:bg-slate-900 text-slate-600'
                                                                }`}
                                                            >
                                                                Sí, Descontar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNoticeApplyDeduction(false)}
                                                                className={`px-2.5 py-0.5 text-[11px] font-bold ${
                                                                    !noticeApplyDeduction
                                                                        ? 'bg-slate-700 text-white'
                                                                        : 'bg-white dark:bg-slate-900 text-slate-600'
                                                                }`}
                                                            >
                                                                No (Eximir)
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNoticeStatus('in_progress');
                                                            setNoticeStopDate('');
                                                            setNoticeFulfilledDaysOverride('');
                                                        }}
                                                        className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                            noticeStatus === 'in_progress'
                                                                ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <div>⏳ En Cumplimiento</div>
                                                        <div className="text-[10px] font-normal opacity-80">Reduce día a día</div>
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
                                                        className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                            noticeStatus === 'abandoned'
                                                                ? 'border-rose-600 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold shadow-sm'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <div>🛑 Abandonó / Cesó</div>
                                                        <div className="text-[10px] font-normal opacity-80">Fija importe p/ nómina</div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNoticeStatus('completed');
                                                            setNoticeStopDate('');
                                                            setNoticeFulfilledDaysOverride('15');
                                                        }}
                                                        className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                            noticeStatus === 'completed'
                                                                ? 'border-emerald-600 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <div>✅ Cumplió 15 Días</div>
                                                        <div className="text-[10px] font-normal opacity-80">Sin descuento (€ 0,00)</div>
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold">Fecha en que Cesó / Abandonó</Label>
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
                                                            className="h-9 text-xs bg-white dark:bg-black"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[11px] font-semibold">Días Cumplidos (0 a 15)</Label>
                                                            {noticeFulfilledDaysOverride !== '' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNoticeFulfilledDaysOverride('')}
                                                                    className="text-[10px] text-indigo-600 hover:underline"
                                                                >
                                                                    Auto
                                                                </button>
                                                            )}
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={15}
                                                            placeholder={`Automático (${previewFulfilledDays}d)`}
                                                            value={noticeFulfilledDaysOverride}
                                                            onChange={(e) => setNoticeFulfilledDaysOverride(e.target.value)}
                                                            className="h-9 text-xs bg-white dark:bg-black font-bold"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold">Motivo de Salida / Cese</Label>
                                                        <Select
                                                            value={noticeStopReason}
                                                            onValueChange={(val) => setNoticeStopReason(val)}
                                                        >
                                                            <SelectTrigger className="h-9 text-xs bg-white dark:bg-black">
                                                                <SelectValue placeholder="Motivo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Abandono de trabalho / Não cumpriu aviso prévio">Abandono de trabajo / No cumplió preaviso</SelectItem>
                                                                <SelectItem value="Cumprimento parcial do aviso prévio">Cumplimiento parcial del preaviso</SelectItem>
                                                                <SelectItem value="Saída imediata sem cumprir aviso prévio">Salida inmediata sin cumplir preaviso</SelectItem>
                                                                <SelectItem value="Pedido de demissão com desconto em folha">Baja voluntaria con descuento</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 pt-1">
                                                    <Label className="text-[11px] font-semibold">Observación Adicional del Preaviso</Label>
                                                    <Input
                                                        placeholder="Ej: abandonó el trabajo el día 27/10 sin avisar al encargado..."
                                                        value={noticeNotes}
                                                        onChange={(e) => setNoticeNotes(e.target.value)}
                                                        className="h-8 text-xs bg-white dark:bg-black"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLUNA DIREITA (5 cols): Consolidação do Desconto na Folha de Pagamento (Último Salario) */}
                                    <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border-2 border-indigo-500/30 dark:border-indigo-500/40 bg-slate-900 text-white p-4 space-y-3">
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                        💸 3. Consolidar Descuento en Nómina (Último Salario)
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Envía este importe directamente a la <strong>Gestión de Descuentos / Nómina</strong> del trabajador.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Seleção da Competência (Mês do Último Salario) */}
                                            <div className="space-y-1.5 bg-white/5 p-2.5 rounded-lg border border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-bold text-amber-300">
                                                        Competencia de Nómina (Mes del Último Salario) *
                                                    </Label>
                                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-semibold">
                                                        Último Salario
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="month"
                                                        value={noticeCompetenceMonth}
                                                        onChange={(e) => setNoticeCompetenceMonth(e.target.value)}
                                                        className="h-9 text-xs bg-slate-950 border-slate-700 text-white font-bold w-[160px]"
                                                    />
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {suggestedMonths.map((m) => (
                                                            <button
                                                                key={m}
                                                                type="button"
                                                                onClick={() => setNoticeCompetenceMonth(m)}
                                                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-all ${
                                                                    noticeCompetenceMonth === m
                                                                        ? 'bg-indigo-600 text-white border-indigo-400'
                                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                {formatCompetenceLabel(m)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quadro Resumo da Regra (Para cumprir vs Cumprido vs Faltou) */}
                                            <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                                                <div>
                                                    <div className="text-[10px] uppercase text-slate-400">Cumplió</div>
                                                    <div className="text-sm font-bold text-emerald-400">{previewFulfilledDays} de 15 días</div>
                                                    <div className="text-[10px] text-slate-400">- {formatCurrencyEur(previewAbatido)}</div>
                                                </div>
                                                <div className="border-x border-slate-800">
                                                    <div className="text-[10px] uppercase text-slate-400">Faltó Cumplir</div>
                                                    <div className="text-sm font-bold text-rose-400">{previewMissingDays} días</div>
                                                    <div className="text-[10px] text-slate-400">{formatCurrencyEur(dailyRatePreview)}/dia</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase text-rose-300 font-bold">Descuento Final</div>
                                                    <div className="text-base font-black text-rose-400 font-mono">{formatCurrencyEur(previewFinalDesconto)}</div>
                                                    <div className="text-[10px] text-slate-400">{noticeMonthWorkedDays || 0}d trab. mes</div>
                                                </div>
                                            </div>

                                            {/* Observações detalhadas que vão para o Desconto na Folha */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-bold text-slate-300">
                                                        Observaciones en Nómina (Fecha de cese, motivo, días cumplidos y faltantes)
                                                    </Label>
                                                    {noticePayrollDescriptionEdited && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNoticePayrollDescriptionEdited(false);
                                                                setNoticePayrollDescriptionCustom('');
                                                            }}
                                                            className="text-[10px] text-indigo-400 hover:underline"
                                                        >
                                                            Restaurar texto predeterminado
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={displayedPayrollObs}
                                                    onChange={(e) => {
                                                        setNoticePayrollDescriptionEdited(true);
                                                        setNoticePayrollDescriptionCustom(e.target.value);
                                                    }}
                                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <Button
                                                type="button"
                                                disabled={consolidatingPayroll || savingNotice || previewRestante <= 0}
                                                onClick={handleConsolidateAndLaunchPayroll}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold h-10 text-xs gap-2 shadow-lg"
                                            >
                                                {consolidatingPayroll ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="h-4 w-4" />
                                                )}
                                                {editingNoticeContract?.metadata?.payroll_discount_id
                                                    ? `Actualizar Descuento en Nómina (${formatCompetenceLabel(noticeCompetenceMonth)} — ${formatCurrencyEur(previewRestante)})`
                                                    : `Consolidar y Lanzar Descuento en Nómina (${formatCompetenceLabel(noticeCompetenceMonth)} — ${formatCurrencyEur(previewRestante)})`}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Rodapé Compacto */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <span className="text-[11px] text-slate-500">
                                        💡 Puede guardar solo el control de seguimiento o consolidar el descuento directamente en la nómina.
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setNoticeDialogOpen(false)}>
                                            Cerrar
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={savingNotice || consolidatingPayroll}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5"
                                        >
                                            {savingNotice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                            {noticeDialogMode === 'create' ? 'Incluir Solo en el Control' : 'Guardar Cambios del Preaviso'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Modal de Assinatura Eletrônica da Empresa (Representante Legal — Bilateral OTP + eIDAS) */}
            <Dialog open={companySignDialogOpen} onOpenChange={setCompanySignDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-w-2xl w-[92vw] bg-white dark:bg-slate-900">
                    <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                            <PenTool className="h-5 w-5" />
                            Firma Electrónica de la Empresa (Representante Legal — OTP Bilateral)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            La firma del representante legal se estampará en el cuadro <strong>"El/la representante de la empresa"</strong> (Página 20), en el margen izquierdo de todas las páginas y en el <strong>Certificado de Firma Electrónica Bilateral (eIDAS / UE Nº 910/2014)</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {companySigningContract && (
                        <form onSubmit={handleSubmitCompanySign} className="space-y-4 pt-2">
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-slate-500 block">Trabajador / Contrato</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {companySigningContract.worker?.nome || 'Trabalhador'} — {companySigningContract.contratante}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={companySigningContract.status === 'signed' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}>
                                        {companySigningContract.status === 'signed' ? 'Trabajador: Firmado ✓' : 'Trabajador: Pendiente'}
                                    </Badge>
                                    <Badge variant="outline" className={companySigningContract.metadata?.company_signed ? 'border-emerald-500 text-emerald-600' : 'border-slate-400 text-slate-600'}>
                                        {companySigningContract.metadata?.company_signed ? 'Empresa: Firmada ✓' : 'Empresa: Pendiente'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Nombre del Representante Legal *</Label>
                                    <Input
                                        required
                                        value={companySignerName}
                                        onChange={(e) => {
                                            setCompanySignerName(e.target.value);
                                            if (companySignMode === 'type') setCompanyTypedSignature(e.target.value);
                                        }}
                                        placeholder="Ex: JUAN PÉREZ GARCÍA"
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">NIF / NIE / CIF</Label>
                                    <Input
                                        value={companySignerDocument}
                                        onChange={(e) => setCompanySignerDocument(e.target.value)}
                                        placeholder="Ex: B19394493"
                                        className="h-9 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Cargo / En Concepto</Label>
                                    <Input
                                        value={companySignerCargo}
                                        onChange={(e) => setCompanySignerCargo(e.target.value)}
                                        placeholder="ADMINISTRADOR ÚNICO"
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Seletor de Modo de Rubrica (Desenhar / Digitar / Usar Salva) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold">Rúbrica / Firma del Representante</Label>
                                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800">
                                        {companySavedSigBase64 && (
                                            <button
                                                type="button"
                                                onClick={() => setCompanySignMode('saved')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                                    companySignMode === 'saved'
                                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                Firma Guardada
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setCompanySignMode('draw')}
                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                                                companySignMode === 'draw'
                                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <PenTool className="h-3 w-3" /> Dibujar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompanySignMode('type');
                                                if (!companyTypedSignature) setCompanyTypedSignature(companySignerName);
                                            }}
                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                                                companySignMode === 'type'
                                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <Type className="h-3 w-3" /> Escribir Firma
                                        </button>
                                    </div>
                                </div>

                                {companySignMode === 'saved' && companySavedSigBase64 ? (
                                    <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl p-4 bg-white flex flex-col items-center justify-center gap-2">
                                        <img src={companySavedSigBase64} alt="Rubrica Salva" className="max-h-28 object-contain" />
                                        <span className="text-[11px] text-emerald-700 font-medium">Firma oficial del representante lista para usar</span>
                                    </div>
                                ) : companySignMode === 'type' ? (
                                    <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
                                        <Input
                                            value={companyTypedSignature}
                                            onChange={(e) => setCompanyTypedSignature(e.target.value)}
                                            placeholder="Escriba el nombre para generar la firma caligráfica..."
                                            className="bg-white dark:bg-slate-900 text-sm"
                                        />
                                        <div className="h-24 bg-white rounded-lg border flex flex-col items-center justify-center p-2">
                                            <span className="text-2xl italic font-serif font-bold text-slate-900">
                                                {companyTypedSignature || companySignerName || 'Firma Representante'}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500 mt-1">
                                                FIRMA DIGITAL EMPRESA — {companySignerDocument || 'Z4103479P'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white relative">
                                            <canvas
                                                ref={companyCanvasRef}
                                                width={520}
                                                height={150}
                                                onMouseDown={startDrawingCompany}
                                                onMouseMove={drawCompany}
                                                onMouseUp={stopDrawingCompany}
                                                onMouseLeave={stopDrawingCompany}
                                                onTouchStart={startDrawingCompany}
                                                onTouchMove={drawCompany}
                                                onTouchEnd={stopDrawingCompany}
                                                className="w-full h-[140px] cursor-crosshair touch-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={clearCompanyCanvas}
                                                className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                                            >
                                                <Eraser className="h-3 w-3" /> Limpiar
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Dibuje la firma del representante en el recuadro de arriba usando el ratón o la pantalla táctil.
                                        </p>
                                    </div>
                                )}

                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={companySaveDefaultSig}
                                        onChange={(e) => setCompanySaveDefaultSig(e.target.checked)}
                                        className="rounded border-slate-300"
                                    />
                                    Guardar esta firma y datos como predeterminados del Representante de Hexagon para los próximos contratos
                                </label>
                            </div>

                            {/* Validação OTP da Empresa */}
                            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                        <KeyRound className="h-4 w-4 text-indigo-600" />
                                        Código OTP de Validación de la Empresa (6 dígitos)
                                    </Label>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            type="email"
                                            value={companySignerEmail}
                                            onChange={(e) => setCompanySignerEmail(e.target.value)}
                                            placeholder="Correo p/ recibir OTP (opcional)"
                                            className="h-7 text-xs w-48 bg-white dark:bg-slate-900"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={requestingCompanyOtp}
                                            onClick={handleRequestNewCompanyOtp}
                                            className="h-7 text-xs font-semibold border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                                        >
                                            {requestingCompanyOtp ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                            Generar / Enviar OTP
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Input
                                        required
                                        maxLength={6}
                                        value={companyOtpInput}
                                        onChange={(e) => setCompanyOtpInput(e.target.value)}
                                        placeholder="000000"
                                        className="h-10 font-mono text-base font-black tracking-widest text-center w-40 bg-white dark:bg-slate-900 border-indigo-300"
                                    />
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                                        El código OTP de la empresa se genera automáticamente al emitir el contrato y queda registrado en la auditoría eIDAS junto con la IP y el sello de tiempo UTC.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <Button type="button" variant="outline" onClick={() => setCompanySignDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingCompanySign}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
                                >
                                    {submittingCompanySign ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Confirmar y Firmar Contrato por la Empresa
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
