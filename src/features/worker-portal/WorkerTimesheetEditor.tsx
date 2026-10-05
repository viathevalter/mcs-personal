import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
    Save,
    Send,
    Download,
    UploadCloud,
    ArrowLeft,
    Clock,
    Sun,
    Moon,
    CheckCircle2,
    Share2,
    Copy,
    Calendar,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Building2,
    Plus,
    Minus,
    LayoutList,
    CalendarRange,
    MapPin,
    Check
} from 'lucide-react';
import { downloadTimesheetPdf, type TimesheetDayEntry, type TimesheetPdfData } from './services/timesheetPdfService';
import { getCompanyBranding } from './services/companyLogos';
import type { WorkerHour } from '../../shared/types/corePersonal';

interface WorkerTimesheetEditorProps {
    worker: any;
    period: WorkerHour;
    onBack: () => void;
    onSaved: (updatedPeriod?: WorkerHour) => void;
    onSwitchToUpload?: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
];

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const parseDrafts = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
};

const buildDaysFromPeriod = (currentPeriod: WorkerHour): TimesheetDayEntry[] => {
    const numDays = new Date(currentPeriod.period_year, currentPeriod.period_month, 0).getDate();
    const existing = parseDrafts(currentPeriod.apontamentos_diarios);
    const result: TimesheetDayEntry[] = [];

    for (let d = 1; d <= numDays; d++) {
        const found = existing.find((item) => Number(item.dia ?? item.day) === d);
        const dateObj = new Date(currentPeriod.period_year, currentPeriod.period_month - 1, d);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

        if (found) {
            const norm = Number(found.horasNormais ?? found.horas_normais ?? 0);
            const not = Number(found.horasNoturnas ?? found.horas_noturnas ?? 0);
            const tot = Number(found.totalHoras ?? found.total_horas ?? (norm + not));
            result.push({
                dia: d,
                entrada: found.entrada || found.inicio || (isWeekend ? '' : '08:00'),
                saida: found.saida || found.fim || (isWeekend ? '' : '17:00'),
                horasNormais: norm,
                horasNoturnas: not,
                totalHoras: tot,
                obra: found.obra || '',
                obs: found.obs || (isWeekend && tot === 0 ? 'Descanso' : '')
            });
        } else {
            result.push({
                dia: d,
                entrada: isWeekend ? '' : '08:00',
                saida: isWeekend ? '' : '17:00',
                horasNormais: 0,
                horasNoturnas: 0,
                totalHoras: 0,
                obra: '',
                obs: isWeekend ? 'Descanso' : ''
            });
        }
    }
    return result;
};

interface WeekSlice {
    index: number;
    label: string;
    shortLabel: string;
    startDay: number;
    endDay: number;
    days: TimesheetDayEntry[];
    totalNormais: number;
    totalNoturnas: number;
    totalGeral: number;
}

export function WorkerTimesheetEditor({
    worker,
    period,
    onBack,
    onSaved,
    onSwitchToUpload
}: WorkerTimesheetEditorProps) {
    const totalDaysInMonth = new Date(period.period_year, period.period_month, 0).getDate();

    // Mode: 'weekly' (Clockify style) vs 'table' (Full spreadsheet)
    const [viewMode, setViewMode] = useState<'weekly' | 'table'>('weekly');
    const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

    // Days state
    const [days, setDays] = useState<TimesheetDayEntry[]>(() => buildDaysFromPeriod(period));

    // Client Sites / Obras
    const [clientSites, setClientSites] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingSites, setLoadingSites] = useState(false);

    // Day Modal editor
    const [activeDayModal, setActiveDayModal] = useState<number | null>(null);

    // Saving and Signatures
    const [saving, setSaving] = useState(false);
    const [signatureModalOpen, setSignatureModalOpen] = useState(false);
    const [encarregadoNome, setEncarregadoNome] = useState(period.encarregado_nome || '');
    const [encarregadoTelefone, setEncarregadoTelefone] = useState(period.encarregado_telefone || '');
    const [encarregadoEmail, setEncarregadoEmail] = useState(period.encarregado_email || '');
    const [requestingSignature, setRequestingSignature] = useState(false);
    const [signatureResult, setSignatureResult] = useState<{
        token: string;
        otp: string;
        link: string;
    } | null>(null);

    // Company branding
    const companyName = worker.contratante || worker.empresa_nome || 'MCS Personal';
    const branding = getCompanyBranding(companyName);

    // Keep days synced if period is refreshed or updated
    useEffect(() => {
        setDays(buildDaysFromPeriod(period));
    }, [period.id, period.updated_at, period.apontamentos_diarios]);

    // Load Client Sites (Obras)
    useEffect(() => {
        const fetchSites = async () => {
            try {
                setLoadingSites(true);
                const { data, error } = await supabase.rpc('get_client_sites_portal', {
                    p_cliente_nombre: period.cliente_nombre || null,
                    p_empresa_id: period.empresa_id || null
                });
                if (!error && data?.sites) {
                    setClientSites(data.sites);
                }
            } catch (err) {
                console.warn('Erro ao carregar obras do cliente:', err);
            } finally {
                setLoadingSites(false);
            }
        };
        fetchSites();
    }, [period.cliente_nombre, period.empresa_id]);

    // Calculate Totals
    const totalNormais = days.reduce((sum, d) => sum + (Number(d.horasNormais) || 0), 0);
    const totalNoturnas = days.reduce((sum, d) => sum + (Number(d.horasNoturnas) || 0), 0);
    const totalGeral = totalNormais + totalNoturnas;

    const isLocked = period.status === 'assinado_encarregado' || period.status === 'validado';

    // Compute calendar weeks (Segunda a Domingo)
    const weeks: WeekSlice[] = useMemo(() => {
        const slices: WeekSlice[] = [];
        let currentSliceDays: TimesheetDayEntry[] = [];
        let wIdx = 0;

        for (let d = 1; d <= totalDaysInMonth; d++) {
            const dateObj = new Date(period.period_year, period.period_month - 1, d);
            const dayEntry = days.find((item) => item.dia === d) || {
                dia: d,
                entrada: '',
                saida: '',
                horasNormais: 0,
                horasNoturnas: 0,
                totalHoras: 0
            };
            currentSliceDays.push(dayEntry);

            // In Europe/Spain, Sunday is the end of the week (getDay() === 0)
            const isSunday = dateObj.getDay() === 0;
            const isLastDay = d === totalDaysInMonth;

            if (isSunday || isLastDay) {
                const startDay = currentSliceDays[0].dia;
                const endDay = currentSliceDays[currentSliceDays.length - 1].dia;
                const norm = currentSliceDays.reduce((acc, item) => acc + (Number(item.horasNormais) || 0), 0);
                const not = currentSliceDays.reduce((acc, item) => acc + (Number(item.horasNoturnas) || 0), 0);

                slices.push({
                    index: wIdx,
                    label: `Semana ${wIdx + 1} (${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')} de ${MONTH_NAMES[period.period_month - 1]})`,
                    shortLabel: `Sem. ${wIdx + 1} (${String(startDay).padStart(2, '0')}-${String(endDay).padStart(2, '0')})`,
                    startDay,
                    endDay,
                    days: [...currentSliceDays],
                    totalNormais: norm,
                    totalNoturnas: not,
                    totalGeral: norm + not
                });

                currentSliceDays = [];
                wIdx++;
            }
        }
        return slices;
    }, [days, period.period_year, period.period_month, totalDaysInMonth]);

    const activeWeek = weeks[currentWeekIndex] || weeks[0];

    const handleDayChange = (
        dia: number,
        field: keyof TimesheetDayEntry,
        value: string | number
    ) => {
        if (isLocked) return;

        setDays((prev) =>
            prev.map((d) => {
                if (d.dia !== dia) return d;

                const updated = { ...d, [field]: value };

                if (field === 'horasNormais' || field === 'horasNoturnas') {
                    const norm = field === 'horasNormais' ? Number(value) || 0 : Number(d.horasNormais) || 0;
                    const not = field === 'horasNoturnas' ? Number(value) || 0 : Number(d.horasNoturnas) || 0;
                    updated.totalHoras = norm + not;
                }

                return updated;
            })
        );
    };

    // Quick fill standard 8h for weekdays
    const handleQuickFillWeekdays = () => {
        if (isLocked) return;
        setDays((prev) =>
            prev.map((d) => {
                const dateObj = new Date(period.period_year, period.period_month - 1, d.dia);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                if (isWeekend) return d;

                return {
                    ...d,
                    entrada: d.entrada || '08:00',
                    saida: d.saida || '17:00',
                    horasNormais: 8,
                    horasNoturnas: 0,
                    totalHoras: 8,
                    obs: d.obs || ''
                };
            })
        );
        toast.info('Preenchido 8h normais nos dias úteis (Seg-Sex). Ajuste as exceções e horas noturnas.');
    };

    // Copy selected Obra to all days
    const handlePropagateObraToAllDays = (siteName: string) => {
        if (!siteName) return;
        setDays((prev) =>
            prev.map((d) => ({
                ...d,
                obra: siteName
            }))
        );
        toast.success(`Obra "${siteName}" replicada para todos os dias do mês!`);
    };

    // Save Draft
    const handleSaveDraft = async () => {
        try {
            setSaving(true);
            const passport = worker.pasaporte || worker.nie;

            const apontamentosFormatted = days.map((d) => ({
                dia: d.dia,
                day: d.dia,
                entrada: d.entrada || '',
                inicio: d.entrada || '',
                saida: d.saida || '',
                fim: d.saida || '',
                horasNormais: Number(d.horasNormais || 0),
                horas_normais: Number(d.horasNormais || 0),
                horasNoturnas: Number(d.horasNoturnas || 0),
                horas_noturnas: Number(d.horasNoturnas || 0),
                totalHoras: Number(d.totalHoras || (Number(d.horasNormais || 0) + Number(d.horasNoturnas || 0))),
                total_horas: Number(d.totalHoras || (Number(d.horasNormais || 0) + Number(d.horasNoturnas || 0))),
                obra: d.obra || '',
                obs: d.obs || ''
            }));

            const { data, error } = await supabase.rpc('save_worker_timesheet_draft', {
                p_worker_id: worker.id,
                p_pasaporte: passport,
                p_worker_hour_id: period.id,
                p_apontamentos: apontamentosFormatted,
                p_total_normais: totalNormais,
                p_total_noturnas: totalNoturnas
            });

            if (error) throw error;
            if (!data || !data.success) {
                toast.error(data?.error || 'Erro ao salvar rascunho da folha.');
                return;
            }

            const updatedPeriod: WorkerHour = {
                ...period,
                apontamentos_diarios: apontamentosFormatted,
                total_horas_normais: totalNormais,
                total_horas_noturnas: totalNoturnas,
                horas_totais: totalGeral,
                status: period.status === 'pendente' ? 'em_andamento' : period.status,
                updated_at: new Date().toISOString()
            };

            toast.success('Rascunho de horas salvo com sucesso!');
            onSaved(updatedPeriod);
        } catch (err: any) {
            console.error('Erro ao salvar rascunho:', err);
            toast.error(err.message || 'Erro ao salvar no servidor.');
        } finally {
            setSaving(false);
        }
    };

    // Request Signature
    const handleRequestSignature = async () => {
        if (!encarregadoNome.trim()) {
            toast.error('Informe o nome do encarregado ou supervisor.');
            return;
        }

        try {
            setRequestingSignature(true);
            const passport = worker.pasaporte || worker.nie;

            const apontamentosFormatted = days.map((d) => ({
                dia: d.dia,
                day: d.dia,
                entrada: d.entrada || '',
                inicio: d.entrada || '',
                saida: d.saida || '',
                fim: d.saida || '',
                horasNormais: Number(d.horasNormais || 0),
                horas_normais: Number(d.horasNormais || 0),
                horasNoturnas: Number(d.horasNoturnas || 0),
                horas_noturnas: Number(d.horasNoturnas || 0),
                totalHoras: Number(d.totalHoras || (Number(d.horasNormais || 0) + Number(d.horasNoturnas || 0))),
                total_horas: Number(d.totalHoras || (Number(d.horasNormais || 0) + Number(d.horasNoturnas || 0))),
                obra: d.obra || '',
                obs: d.obs || ''
            }));

            // First ensure draft is saved
            await supabase.rpc('save_worker_timesheet_draft', {
                p_worker_id: worker.id,
                p_pasaporte: passport,
                p_worker_hour_id: period.id,
                p_apontamentos: apontamentosFormatted,
                p_total_normais: totalNormais,
                p_total_noturnas: totalNoturnas
            });

            const { data, error } = await supabase.rpc('request_timesheet_signature', {
                p_worker_id: worker.id,
                p_pasaporte: passport,
                p_worker_hour_id: period.id,
                p_encarregado_nome: encarregadoNome.trim(),
                p_encarregado_email: encarregadoEmail.trim() || null,
                p_encarregado_telefone: encarregadoTelefone.trim() || null
            });

            if (error) throw error;
            if (!data || !data.success) {
                toast.error(data?.error || 'Erro ao gerar link de assinatura.');
                return;
            }

            const token = data.signature_token;
            const otp = data.otp_code;
            const fullLink = `${window.location.origin}/firmar-hoja/${token}`;

            setSignatureResult({
                token,
                otp,
                link: fullLink
            });

            toast.success('Link de assinatura e código OTP gerados!');
            onSaved();
        } catch (err: any) {
            console.error('Erro ao solicitar assinatura:', err);
            toast.error(err.message || 'Erro ao processar solicitação de assinatura.');
        } finally {
            setRequestingSignature(false);
        }
    };

    const handleCopyLink = () => {
        if (!signatureResult) return;
        const msg = `Olá ${encarregadoNome}, segue o link para validação da minha folha de horas (${MONTH_NAMES[period.period_month - 1]}/${period.period_year}): ${signatureResult.link} \nCódigo OTP: ${signatureResult.otp}`;
        navigator.clipboard.writeText(msg);
        toast.success('Link e código copiados para a área de transferência!');
    };

    const handleOpenWhatsApp = () => {
        if (!signatureResult) return;
        const cleanPhone = encarregadoTelefone.replace(/\D/g, '');
        const text = encodeURIComponent(
            `Olá ${encarregadoNome}, sou o trabalhador ${worker.nome}. Segue o link para conferência e assinatura eletrônica da minha folha de horas referente a ${MONTH_NAMES[period.period_month - 1]} de ${period.period_year}:\n\n🔗 ${signatureResult.link}\n\n🔑 Seu código OTP de confirmação é: ${signatureResult.otp}\n\nMuito obrigado!`
        );

        const waUrl = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${text}`
            : `https://wa.me/?text=${text}`;

        window.open(waUrl, '_blank');
    };

    const handleDownloadPdf = async () => {
        const compName = worker.contratante || worker.empresa_nome || 'MCS Personal';
        const brand = getCompanyBranding(compName);
        const firstObra = days.find((d) => d.obra)?.obra || '';
        const pdfData: TimesheetPdfData = {
            empresaNome: compName,
            empresaNif: worker.empresa_nif || brand?.nif,
            logoUrl: brand?.logoUrl,
            workerNome: worker.nome,
            workerDoc: worker.pasaporte || worker.nie || 'N/A',
            workerFuncion: worker.funcion,
            clienteNome: period.cliente_nombre,
            obraNome: firstObra,
            mes: period.period_month,
            ano: period.period_year,
            apontamentos: days,
            totalNormais,
            totalNoturnas,
            totalGeral,
            encarregadoNome: period.encarregado_nome,
            signedAt: period.signed_at,
            signedIp: period.signed_ip,
            signatureImageUrl: period.signature_image_url
        };

        await downloadTimesheetPdf(pdfData);
    };

    // Active day object for modal
    const editingDay = activeDayModal !== null ? days.find((d) => d.dia === activeDayModal) || null : null;
    const editingDateObj = activeDayModal !== null ? new Date(period.period_year, period.period_month - 1, activeDayModal) : null;
    const editingDayOfWeek = editingDateObj ? WEEKDAYS_FULL[editingDateObj.getDay()] : '';

    return (
        <div className="space-y-4 pb-16">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="self-start gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" /> Voltar aos Meses
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Mode Switcher */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('weekly')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                                viewMode === 'weekly'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <CalendarRange className="h-3.5 w-3.5" />
                            <span>Semanal</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            <span>Tabela Mensal</span>
                        </button>
                    </div>

                    {!isLocked && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleQuickFillWeekdays}
                            className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                        >
                            <Sparkles className="h-3.5 w-3.5" /> Preencher 8h Úteis
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPdf}
                        className="text-xs gap-1 text-slate-700 hover:text-slate-900"
                    >
                        <Download className="h-3.5 w-3.5" /> PDF Oficial
                    </Button>

                    {onSwitchToUpload && !isLocked && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSwitchToUpload}
                            className="text-xs gap-1 text-slate-500 hover:text-slate-800"
                        >
                            <UploadCloud className="h-3.5 w-3.5" /> Subir Papel
                        </Button>
                    )}
                </div>
            </div>

            {/* Enterprise & Client Info Card */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 via-white to-slate-50">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            {branding?.logoUrl ? (
                                <img
                                    src={branding.logoUrl}
                                    alt={companyName}
                                    className="h-10 w-auto max-w-[130px] object-contain rounded bg-white p-1 border border-slate-200 shadow-xs"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                    MCS
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                                        {branding?.name || companyName}
                                    </h2>
                                    {branding?.nif && (
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            {branding.nif}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cliente: <strong className="text-slate-800">{period.cliente_nombre || 'Geral'}</strong> • Período: <strong className="text-blue-700">{MONTH_NAMES[period.period_month - 1]} / {period.period_year}</strong>
                                </p>
                            </div>
                        </div>

                        <div>
                            {isLocked ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Assinado pelo Encarregado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                    <Clock className="h-3.5 w-3.5" /> Em Edição / Rascunho
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Live Month Totals Bar */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-2">
                            <span className="text-[11px] text-amber-700 font-semibold flex items-center justify-center gap-1">
                                <Sun className="h-3 w-3 text-amber-500" /> Diurnas
                            </span>
                            <span className="text-base sm:text-lg font-bold text-amber-950">{totalNormais.toFixed(1)} h</span>
                        </div>

                        <div className="bg-sky-50/60 border border-sky-200/80 rounded-lg p-2">
                            <span className="text-[11px] text-sky-700 font-semibold flex items-center justify-center gap-1">
                                <Moon className="h-3 w-3 text-sky-600" /> Noturnas
                            </span>
                            <span className="text-base sm:text-lg font-bold text-sky-950">{totalNoturnas.toFixed(1)} h</span>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2">
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-600" /> TOTAL MÊS
                            </span>
                            <span className="text-base sm:text-lg font-black text-emerald-950">{totalGeral.toFixed(1)} h</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ========================================================================= */}
            {/* VIEW 1: CLOCKIFY-STYLE WEEKLY NAVIGATOR & DAY CARDS (MOBILE OPTIMIZED)   */}
            {/* ========================================================================= */}
            {viewMode === 'weekly' && (
                <div className="space-y-3">
                    {/* Week Navigation Header */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentWeekIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentWeekIndex === 0}
                                    className="h-9 w-9 p-0 rounded-full"
                                    title="Semana Anterior"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>

                                <div className="text-center flex-1">
                                    <div className="text-xs uppercase font-extrabold tracking-wider text-blue-600">
                                        {activeWeek.label}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mt-0.5">
                                        <span>Total da Semana: <strong className="text-slate-900 font-bold">{activeWeek.totalGeral.toFixed(1)} h</strong></span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-amber-600 font-medium">☀️ {activeWeek.totalNormais.toFixed(1)}h</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-sky-600 font-medium">🌙 {activeWeek.totalNoturnas.toFixed(1)}h</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentWeekIndex((prev) => Math.min(weeks.length - 1, prev + 1))}
                                    disabled={currentWeekIndex === weeks.length - 1}
                                    className="h-9 w-9 p-0 rounded-full"
                                    title="Próxima Semana"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Week Quick Jump Pills */}
                            <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 overflow-x-auto pb-0.5">
                                {weeks.map((w, idx) => (
                                    <button
                                        key={w.index}
                                        type="button"
                                        onClick={() => setCurrentWeekIndex(idx)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                                            idx === currentWeekIndex
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>{w.shortLabel}</span>
                                        <span className={`text-[10px] px-1 rounded ${idx === currentWeekIndex ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                                            {w.totalGeral.toFixed(0)}h
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Day Cards for Current Week */}
                    <div className="space-y-2">
                        {activeWeek.days.map((dayItem) => {
                            const dateObj = new Date(period.period_year, period.period_month - 1, dayItem.dia);
                            const dayOfWeekIndex = dateObj.getDay();
                            const dayOfWeekFull = WEEKDAYS_FULL[dayOfWeekIndex];
                            const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
                            const hNorm = Number(dayItem.horasNormais || 0);
                            const hNot = Number(dayItem.horasNoturnas || 0);
                            const hTot = Number(dayItem.totalHoras || (hNorm + hNot));
                            const hasHours = hTot > 0;

                            return (
                                <div
                                    key={dayItem.dia}
                                    onClick={() => !isLocked && setActiveDayModal(dayItem.dia)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                        hasHours
                                            ? 'bg-white border-blue-200 shadow-xs hover:border-blue-300'
                                            : isWeekend
                                            ? 'bg-slate-50/80 border-slate-200/70 text-slate-500'
                                            : 'bg-white border-slate-200 hover:border-blue-200'
                                    } ${isLocked ? 'cursor-default' : 'active:scale-[0.99]'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Left: Date & Weekday */}
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0 border ${
                                                hasHours
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                    : isWeekend
                                                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                            }`}>
                                                <span className="text-base leading-none">{String(dayItem.dia).padStart(2, '0')}</span>
                                                <span className="text-[10px] uppercase font-semibold mt-0.5 tracking-tight">
                                                    {WEEKDAYS[dayOfWeekIndex]}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {dayOfWeekFull}
                                                    </span>
                                                    {isWeekend && !hasHours && (
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 font-medium">
                                                            Descanso
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details: Horários / Tipo de jornada */}
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                                    {hasHours ? (
                                                        <>
                                                            <span className="font-mono text-slate-700">
                                                                {dayItem.entrada || '08:00'} - {dayItem.saida || '17:00'}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            {hNorm > 0 && (
                                                                <span className="text-amber-700 font-medium inline-flex items-center gap-0.5">
                                                                    <Sun className="h-3 w-3 text-amber-500" /> {hNorm.toFixed(1)}h diurna
                                                                </span>
                                                            )}
                                                            {hNot > 0 && (
                                                                <span className="text-sky-700 font-medium inline-flex items-center gap-0.5">
                                                                    <Moon className="h-3 w-3 text-sky-500" /> {hNot.toFixed(1)}h noturna
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">
                                                            Nenhuma hora apontada
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Obra & Obs Badges */}
                                                {(dayItem.obra || dayItem.obs) && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {dayItem.obra && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                                <Building2 className="h-2.5 w-2.5 text-blue-600" />
                                                                {dayItem.obra}
                                                            </span>
                                                        )}
                                                        {dayItem.obs && (
                                                            <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                                                {dayItem.obs}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Hours Pill & Tap to Edit */}
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1.5 rounded-lg text-right font-mono ${
                                                hasHours
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : 'bg-slate-100 text-slate-400 font-medium'
                                            }`}>
                                                <span className="text-base">{hTot > 0 ? hTot.toFixed(1) : '0.0'}</span>
                                                <span className="text-[10px] ml-0.5">h</span>
                                            </div>

                                            {!isLocked && (
                                                <ChevronRight className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: FULL MONTHLY SPREADSHEET TABLE (DESKTOP POWER USER)              */}
            {/* ========================================================================= */}
            {viewMode === 'table' && (
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-slate-50/60 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <LayoutList className="h-4 w-4 text-blue-600" />
                                    Tabela Mensal Completa (31 Dias)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Digite os valores diretamente nas células ou clique no dia para abrir o editor rápido.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[11px] uppercase bg-slate-100 text-slate-700 sticky top-0 border-b z-10">
                                    <tr>
                                        <th className="py-2.5 px-3 w-16 text-center">Dia</th>
                                        <th className="py-2.5 px-2 w-28">Obra / Local</th>
                                        <th className="py-2.5 px-2 w-20">Entrada</th>
                                        <th className="py-2.5 px-2 w-20">Saída</th>
                                        <th className="py-2.5 px-2 w-20 text-center text-amber-700">☀️ Diurnas</th>
                                        <th className="py-2.5 px-2 w-20 text-center text-sky-700">🌙 Noturnas</th>
                                        <th className="py-2.5 px-2 w-16 text-center font-bold">Total</th>
                                        <th className="py-2.5 px-2">Observações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {days.map((item) => {
                                        const dateObj = new Date(period.period_year, period.period_month - 1, item.dia);
                                        const dayOfWeekIndex = dateObj.getDay();
                                        const dayOfWeek = WEEKDAYS[dayOfWeekIndex];
                                        const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

                                        return (
                                            <tr
                                                key={item.dia}
                                                className={`${
                                                    isWeekend ? 'bg-slate-50/70 text-slate-500' : 'hover:bg-blue-50/30'
                                                }`}
                                            >
                                                {/* Dia */}
                                                <td
                                                    className="py-1.5 px-3 text-center whitespace-nowrap cursor-pointer hover:bg-blue-100/50 rounded"
                                                    onClick={() => !isLocked && setActiveDayModal(item.dia)}
                                                    title="Clique para abrir editor do dia"
                                                >
                                                    <span className="font-bold text-slate-900">{String(item.dia).padStart(2, '0')}</span>{' '}
                                                    <span className={`text-[10px] ${isWeekend ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                                        ({dayOfWeek})
                                                    </span>
                                                </td>

                                                {/* Obra */}
                                                <td className="py-1 px-1.5">
                                                    <select
                                                        value={item.obra || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'obra', e.target.value)}
                                                        className="w-full h-7 text-xs px-1.5 rounded border border-slate-200 bg-white text-slate-800"
                                                    >
                                                        <option value="">(Selecione)</option>
                                                        {clientSites.map((site) => (
                                                            <option key={site.id} value={site.name}>
                                                                {site.name}
                                                            </option>
                                                        ))}
                                                        {item.obra && !clientSites.some((s) => s.name === item.obra) && (
                                                            <option value={item.obra}>{item.obra}</option>
                                                        )}
                                                    </select>
                                                </td>

                                                {/* Entrada */}
                                                <td className="py-1 px-1.5">
                                                    <Input
                                                        type="time"
                                                        value={item.entrada || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'entrada', e.target.value)}
                                                        className="h-7 text-xs px-1.5 font-mono bg-white"
                                                    />
                                                </td>

                                                {/* Saída */}
                                                <td className="py-1 px-1.5">
                                                    <Input
                                                        type="time"
                                                        value={item.saida || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'saida', e.target.value)}
                                                        className="h-7 text-xs px-1.5 font-mono bg-white"
                                                    />
                                                </td>

                                                {/* Diurnas */}
                                                <td className="py-1 px-1.5">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        max="24"
                                                        value={item.horasNormais || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'horasNormais', e.target.value)}
                                                        placeholder="0"
                                                        className="h-7 text-xs text-center font-bold font-mono bg-white"
                                                    />
                                                </td>

                                                {/* Noturnas */}
                                                <td className="py-1 px-1.5">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        max="24"
                                                        value={item.horasNoturnas || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'horasNoturnas', e.target.value)}
                                                        placeholder="0"
                                                        className="h-7 text-xs text-center font-bold font-mono text-sky-800 bg-sky-50/50 border-sky-200"
                                                    />
                                                </td>

                                                {/* Total */}
                                                <td className="py-1.5 px-2 text-center font-bold text-slate-800 font-mono">
                                                    {Number(item.totalHoras || (Number(item.horasNormais || 0) + Number(item.horasNoturnas || 0))).toFixed(1)}
                                                </td>

                                                {/* Obs */}
                                                <td className="py-1 px-1.5">
                                                    <Input
                                                        type="text"
                                                        value={item.obs || ''}
                                                        disabled={isLocked}
                                                        onChange={(e) => handleDayChange(item.dia, 'obs', e.target.value)}
                                                        placeholder={isWeekend ? 'Descanso' : ''}
                                                        className="h-7 text-xs px-2 bg-white"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bottom Actions Bar (Sticky on Mobile) */}
            {!isLocked && (
                <div className="sticky bottom-2 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-lg flex flex-col sm:flex-row gap-2 justify-between items-center">
                    <div className="text-xs text-slate-600 hidden sm:block">
                        Total do Mês: <strong className="text-emerald-700 font-bold">{totalGeral.toFixed(1)} Horas</strong> ({totalNormais.toFixed(1)}h diurnas + {totalNoturnas.toFixed(1)}h noturnas)
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="flex-1 sm:flex-none gap-1.5 text-xs h-10 border-slate-300 font-semibold"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Salvando...' : 'Salvar Rascunho'}
                        </Button>

                        <Button
                            onClick={() => {
                                setSignatureResult(null);
                                setSignatureModalOpen(true);
                            }}
                            className="flex-1 sm:flex-none gap-1.5 text-xs h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                        >
                            <Send className="h-4 w-4" /> Enviar p/ Encarregado
                        </Button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: QUICK DAY ENTRY (CLOCKIFY-STYLE MOBILE POPUP / STEPPER)          */}
            {/* ========================================================================= */}
            <Dialog open={activeDayModal !== null} onOpenChange={(open) => !open && setActiveDayModal(null)}>
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
                    {editingDay && (
                        <div>
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
                                            Apontamento de Jornada
                                        </span>
                                        <h3 className="text-base font-extrabold flex items-center gap-2">
                                            Dia {String(editingDay.dia).padStart(2, '0')} • {editingDayOfWeek}
                                        </h3>
                                        <span className="text-xs text-blue-100">
                                            {MONTH_NAMES[period.period_month - 1]} de {period.period_year}
                                        </span>
                                    </div>

                                    {/* Big Total Badge */}
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-center">
                                        <span className="text-[10px] uppercase font-semibold text-blue-100 block">Total</span>
                                        <span className="text-xl font-black text-white font-mono leading-none">
                                            {Number(editingDay.totalHoras || (Number(editingDay.horasNormais || 0) + Number(editingDay.horasNoturnas || 0))).toFixed(1)}h
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                                {/* Obra / Centro de Custo */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5 text-blue-600" /> Obra / Local de Trabalho
                                        </Label>
                                        {editingDay.obra && (
                                            <button
                                                type="button"
                                                onClick={() => handlePropagateObraToAllDays(editingDay.obra || '')}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                                            >
                                                Aplicar aos outros dias
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <select
                                            value={editingDay.obra || ''}
                                            onChange={(e) => handleDayChange(editingDay.dia, 'obra', e.target.value)}
                                            className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                                        >
                                            <option value="">Selecione uma obra cadastrada...</option>
                                            {clientSites.map((site) => (
                                                <option key={site.id} value={site.name}>
                                                    {site.name}
                                                </option>
                                            ))}
                                        </select>

                                        <Input
                                            placeholder="Ou digite o nome da obra..."
                                            value={editingDay.obra || ''}
                                            onChange={(e) => handleDayChange(editingDay.dia, 'obra', e.target.value)}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* 1-Tap Presets (Clockify Shortcut Pills) */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Atalhos Rápidos (1 Toque)
                                    </Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '08:00');
                                                handleDayChange(editingDay.dia, 'saida', '17:00');
                                                handleDayChange(editingDay.dia, 'horasNormais', 8);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 0);
                                                handleDayChange(editingDay.dia, 'obs', '');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-amber-200 text-amber-900 bg-amber-50/60 hover:bg-amber-100 justify-start px-2"
                                        >
                                            ☀️ 8h Diurna (8-17)
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '20:00');
                                                handleDayChange(editingDay.dia, 'saida', '06:00');
                                                handleDayChange(editingDay.dia, 'horasNormais', 0);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 10);
                                                handleDayChange(editingDay.dia, 'obs', '');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-sky-200 text-sky-900 bg-sky-50/60 hover:bg-sky-100 justify-start px-2"
                                        >
                                            🌙 10h Nocturna (20-6)
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '08:00');
                                                handleDayChange(editingDay.dia, 'saida', '18:00');
                                                handleDayChange(editingDay.dia, 'horasNormais', 9);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 0);
                                                handleDayChange(editingDay.dia, 'obs', '');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-amber-200 text-amber-900 bg-amber-50/60 hover:bg-amber-100 justify-start px-2"
                                        >
                                            ☀️ 9h Diurna (8-18)
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '19:00');
                                                handleDayChange(editingDay.dia, 'saida', '07:00');
                                                handleDayChange(editingDay.dia, 'horasNormais', 0);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 12);
                                                handleDayChange(editingDay.dia, 'obs', '');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-sky-200 text-sky-900 bg-sky-50/60 hover:bg-sky-100 justify-start px-2"
                                        >
                                            🌙 12h Nocturna (19-7)
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '');
                                                handleDayChange(editingDay.dia, 'saida', '');
                                                handleDayChange(editingDay.dia, 'horasNormais', 0);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 0);
                                                handleDayChange(editingDay.dia, 'obs', 'Descanso');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-slate-200 text-slate-700 bg-slate-100 hover:bg-slate-200 justify-start px-2"
                                        >
                                            🏖️ Folga / Descanso
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleDayChange(editingDay.dia, 'entrada', '');
                                                handleDayChange(editingDay.dia, 'saida', '');
                                                handleDayChange(editingDay.dia, 'horasNormais', 0);
                                                handleDayChange(editingDay.dia, 'horasNoturnas', 0);
                                                handleDayChange(editingDay.dia, 'obs', '');
                                            }}
                                            className="h-8 text-[11px] font-semibold border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100 justify-start px-2"
                                        >
                                            Limpar Dia
                                        </Button>
                                    </div>
                                </div>

                                {/* Entrada & Saída Time Inputs */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-700">Horário Entrada</Label>
                                        <Input
                                            type="time"
                                            value={editingDay.entrada || ''}
                                            onChange={(e) => handleDayChange(editingDay.dia, 'entrada', e.target.value)}
                                            className="h-10 text-sm font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-700">Horário Saída</Label>
                                        <Input
                                            type="time"
                                            value={editingDay.saida || ''}
                                            onChange={(e) => handleDayChange(editingDay.dia, 'saida', e.target.value)}
                                            className="h-10 text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Steppers: Diurnas & Noturnas */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {/* Horas Diurnas Stepper */}
                                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                                <Sun className="h-3.5 w-3.5 text-amber-500" /> Horas Diurnas
                                            </span>
                                            <span className="text-base font-extrabold text-amber-950 font-mono">
                                                {Number(editingDay.horasNormais || 0).toFixed(1)}h
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const cur = Number(editingDay.horasNormais || 0);
                                                    handleDayChange(editingDay.dia, 'horasNormais', Math.max(0, cur - 0.5));
                                                }}
                                                className="h-9 w-9 p-0 bg-white border-amber-300 text-amber-900 font-bold"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>

                                            <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                value={editingDay.horasNormais || ''}
                                                onChange={(e) => handleDayChange(editingDay.dia, 'horasNormais', e.target.value)}
                                                className="h-9 text-center font-bold font-mono text-sm bg-white"
                                            />

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const cur = Number(editingDay.horasNormais || 0);
                                                    handleDayChange(editingDay.dia, 'horasNormais', Math.min(24, cur + 0.5));
                                                }}
                                                className="h-9 w-9 p-0 bg-white border-amber-300 text-amber-900 font-bold"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Horas Noturnas Stepper */}
                                    <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-sky-900 flex items-center gap-1">
                                                <Moon className="h-3.5 w-3.5 text-sky-600" /> Horas Noturnas
                                            </span>
                                            <span className="text-base font-extrabold text-sky-950 font-mono">
                                                {Number(editingDay.horasNoturnas || 0).toFixed(1)}h
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const cur = Number(editingDay.horasNoturnas || 0);
                                                    handleDayChange(editingDay.dia, 'horasNoturnas', Math.max(0, cur - 0.5));
                                                }}
                                                className="h-9 w-9 p-0 bg-white border-sky-300 text-sky-900 font-bold"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>

                                            <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                value={editingDay.horasNoturnas || ''}
                                                onChange={(e) => handleDayChange(editingDay.dia, 'horasNoturnas', e.target.value)}
                                                className="h-9 text-center font-bold font-mono text-sm bg-white text-sky-950"
                                            />

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const cur = Number(editingDay.horasNoturnas || 0);
                                                    handleDayChange(editingDay.dia, 'horasNoturnas', Math.min(24, cur + 0.5));
                                                }}
                                                className="h-9 w-9 p-0 bg-white border-sky-300 text-sky-900 font-bold"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Observações */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Observações / Motivo</Label>
                                    <Input
                                        placeholder="Ex: Hora extra autorizada, chuva, treinamento..."
                                        value={editingDay.obs || ''}
                                        onChange={(e) => handleDayChange(editingDay.dia, 'obs', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer Navigation (Clockify Day Stepper) */}
                            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveDayModal((prev) => (prev !== null && prev > 1 ? prev - 1 : prev))}
                                    disabled={editingDay.dia === 1}
                                    className="gap-1 text-xs h-9"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Dia Anterior
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => setActiveDayModal(null)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 gap-1.5"
                                >
                                    <Check className="h-4 w-4" /> Pronto
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveDayModal((prev) => (prev !== null && prev < totalDaysInMonth ? prev + 1 : prev))}
                                    disabled={editingDay.dia === totalDaysInMonth}
                                    className="gap-1 text-xs h-9"
                                >
                                    Próximo Dia <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL 2: SOLICITAR ASSINATURA ELETRÔNICA DO ENCARREGADO (OTP & WHATSAPP)   */}
            {/* ========================================================================= */}
            <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Send className="h-5 w-5 text-blue-600" />
                            Assinatura do Encarregado da Obra
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Informe os dados do encarregado para gerar o link e o código OTP de validação da folha de horas.
                        </DialogDescription>
                    </DialogHeader>

                    {!signatureResult ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="modalSupName" className="text-xs font-semibold text-slate-700">
                                    Nome do Encarregado / Supervisor *
                                </Label>
                                <Input
                                    id="modalSupName"
                                    placeholder="Ex: Carlos Mendes"
                                    value={encarregadoNome}
                                    onChange={(e) => setEncarregadoNome(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="modalSupPhone" className="text-xs font-semibold text-slate-700">
                                    WhatsApp / Telemóvel do Encarregado (opcional)
                                </Label>
                                <Input
                                    id="modalSupPhone"
                                    placeholder="Ex: 34612345678 ou 351912345678"
                                    value={encarregadoTelefone}
                                    onChange={(e) => setEncarregadoTelefone(e.target.value)}
                                    className="text-xs"
                                />
                                <p className="text-[11px] text-slate-400">
                                    Permite enviar a folha diretamente pelo WhatsApp com 1 clique.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                                <p className="font-semibold text-slate-800">Resumo a ser assinado:</p>
                                <p>• Horas Diurnas: <strong>{totalNormais.toFixed(1)} h</strong></p>
                                <p>• Horas Noturnas: <strong>{totalNoturnas.toFixed(1)} h</strong></p>
                                <p>• Total Geral: <strong>{totalGeral.toFixed(1)} h</strong></p>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSignatureModalOpen(false)}
                                    className="text-xs"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleRequestSignature}
                                    disabled={requestingSignature || !encarregadoNome.trim()}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                    {requestingSignature ? 'Gerando Link...' : 'Gerar Link e Código OTP'}
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-emerald-900 text-xs space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                                    <span className="font-bold text-sm">Link de Assinatura Criado!</span>
                                </div>
                                <p>
                                    Envie o link e o código OTP abaixo ao encarregado. Ele poderá conferir os apontamentos e assinar diretamente no telemóvel dele.
                                </p>
                            </div>

                            {/* OTP Box */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                                <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider block">
                                    Código OTP de Validação
                                </span>
                                <span className="text-3xl font-mono font-extrabold text-blue-700 tracking-widest block mt-1">
                                    {signatureResult.otp}
                                </span>
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    (O encarregado deverá digitar este código na página de assinatura)
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-1">
                                <Button
                                    onClick={handleOpenWhatsApp}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 h-10"
                                >
                                    <Share2 className="h-4 w-4" /> Enviar pelo WhatsApp
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleCopyLink}
                                    className="w-full text-xs gap-2 h-10 border-slate-300"
                                >
                                    <Copy className="h-4 w-4" /> Copiar Link e Código
                                </Button>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSignatureModalOpen(false)}
                                    className="w-full text-xs text-slate-500"
                                >
                                    Fechar
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
