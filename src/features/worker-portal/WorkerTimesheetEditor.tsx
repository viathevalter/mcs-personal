import React, { useState, useEffect } from 'react';
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
    AlertCircle,
    Calendar,
    Sparkles,
    Check
} from 'lucide-react';
import { downloadTimesheetPdf, type TimesheetDayEntry, type TimesheetPdfData } from './services/timesheetPdfService';
import type { WorkerHour } from '../../shared/types/corePersonal';

interface WorkerTimesheetEditorProps {
    worker: any;
    period: WorkerHour;
    onBack: () => void;
    onSaved: (updatedPeriod?: WorkerHour) => void;
    onSwitchToUpload?: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
                obs: isWeekend ? 'Descanso' : ''
            });
        }
    }
    return result;
};

export function WorkerTimesheetEditor({
    worker,
    period,
    onBack,
    onSaved,
    onSwitchToUpload
}: WorkerTimesheetEditorProps) {
    const totalDaysInMonth = new Date(period.period_year, period.period_month, 0).getDate();

    // Initialize daily records from existing draft or create empty days
    const [days, setDays] = useState<TimesheetDayEntry[]>(() => buildDaysFromPeriod(period));

    // Keep days synced if period is refreshed or updated
    useEffect(() => {
        setDays(buildDaysFromPeriod(period));
    }, [period.id, period.updated_at, period.apontamentos_diarios]);

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

    // Calculate Totals
    const totalNormais = days.reduce((sum, d) => sum + (Number(d.horasNormais) || 0), 0);
    const totalNoturnas = days.reduce((sum, d) => sum + (Number(d.horasNoturnas) || 0), 0);
    const totalGeral = totalNormais + totalNoturnas;

    const isLocked = period.status === 'assinado_encarregado' || period.status === 'validado';

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

                // Auto calculate day total when normais or noturnas change
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

                // Fill standard 8 hours
                return {
                    ...d,
                    entrada: d.entrada || '08:00',
                    saida: d.saida || '17:00',
                    horasNormais: 8,
                    horasNoturnas: 0,
                    totalHoras: 8,
                    obs: ''
                };
            })
        );
        toast.info('Preenchido 8h normais nos dias úteis (Seg-Sex). Ajuste as exceções e horas noturnas.');
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

    const handleDownloadPdf = () => {
        const pdfData: TimesheetPdfData = {
            empresaNome: worker.empresa_nome || 'MCS Personal',
            empresaNif: worker.empresa_nif,
            workerNome: worker.nome,
            workerDoc: worker.pasaporte || worker.nie || 'N/A',
            workerFuncion: worker.funcion,
            clienteNome: period.cliente_nombre,
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

        downloadTimesheetPdf(pdfData);
    };

    return (
        <div className="space-y-5">
            {/* Top Navigation & Info */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="self-start gap-1.5 text-xs text-slate-600">
                    <ArrowLeft className="h-4 w-4" /> Voltar aos Meses
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
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
                        className="text-xs gap-1"
                    >
                        <Download className="h-3.5 w-3.5" /> Baixar PDF
                    </Button>

                    {onSwitchToUpload && !isLocked && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSwitchToUpload}
                            className="text-xs gap-1 text-slate-500 hover:text-slate-800"
                        >
                            <UploadCloud className="h-3.5 w-3.5" /> Subir em Papel
                        </Button>
                    )}
                </div>
            </div>

            {/* Period Title & Totals Bar */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                {MONTH_NAMES[period.period_month - 1]} / {period.period_year}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Cliente / Obra: <span className="font-semibold text-slate-700">{period.cliente_nombre || 'N/A'}</span>
                            </CardDescription>
                        </div>

                        {/* Status Badge */}
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
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Live Totals Counters */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                            <span className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
                                <Sun className="h-3 w-3 text-amber-500" /> Diurnas
                            </span>
                            <span className="text-lg font-bold text-slate-900">{totalNormais.toFixed(1)} h</span>
                        </div>

                        <div className="bg-sky-50/70 border border-sky-200 rounded-lg p-2.5">
                            <span className="text-[11px] text-sky-700 font-semibold flex items-center justify-center gap-1">
                                <Moon className="h-3 w-3 text-sky-600" /> Nocturnas
                            </span>
                            <span className="text-lg font-bold text-sky-900">{totalNoturnas.toFixed(1)} h</span>
                        </div>

                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5">
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-600" /> TOTAL
                            </span>
                            <span className="text-lg font-black text-emerald-900">{totalGeral.toFixed(1)} h</span>
                        </div>
                    </div>

                    {isLocked && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            <span>Esta folha já foi validada e assinada pelo encarregado e está bloqueada para alterações.</span>
                        </div>
                    )}

                    {/* Interactive Days Spreadsheet / Grid */}
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs text-left min-w-[500px]">
                            <thead className="text-[11px] uppercase bg-slate-100 text-slate-700 sticky top-0 border-b">
                                <tr>
                                    <th className="py-2 px-2.5 w-16 text-center">Dia</th>
                                    <th className="py-2 px-2 w-24">Entrada</th>
                                    <th className="py-2 px-2 w-24">Saída</th>
                                    <th className="py-2 px-2 w-20 text-center">H. Diurnas</th>
                                    <th className="py-2 px-2 w-20 text-center text-sky-700">H. Noct.</th>
                                    <th className="py-2 px-2 w-16 text-center font-bold">Total</th>
                                    <th className="py-2 px-2">Obs / Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {days.map((item) => {
                                    const dateObj = new Date(period.period_year, period.period_month - 1, item.dia);
                                    const dayOfWeek = WEEKDAYS[dateObj.getDay()];
                                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                    return (
                                        <tr
                                            key={item.dia}
                                            className={`${
                                                isWeekend ? 'bg-slate-50/70 text-slate-500' : 'hover:bg-blue-50/30'
                                            }`}
                                        >
                                            {/* Dia + Semana */}
                                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                                <span className="font-bold text-slate-900">{String(item.dia).padStart(2, '0')}</span>{' '}
                                                <span className={`text-[10px] ${isWeekend ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                                    ({dayOfWeek})
                                                </span>
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

                                            {/* Saida */}
                                            <td className="py-1 px-1.5">
                                                <Input
                                                    type="time"
                                                    value={item.saida || ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => handleDayChange(item.dia, 'saida', e.target.value)}
                                                    className="h-7 text-xs px-1.5 font-mono bg-white"
                                                />
                                            </td>

                                            {/* Horas Normais */}
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

                                            {/* Horas Noturnas */}
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

                {!isLocked && (
                    <CardFooter className="bg-slate-50/60 pt-3 pb-4 border-t flex flex-col sm:flex-row gap-2 justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="w-full sm:w-auto gap-1.5 text-xs h-9 border-slate-300"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Salvando...' : 'Salvar Rascunho Online'}
                        </Button>

                        <Button
                            onClick={() => {
                                setSignatureResult(null);
                                setSignatureModalOpen(true);
                            }}
                            className="w-full sm:w-auto gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            <Send className="h-4 w-4" /> Enviar para Assinatura do Encarregado
                        </Button>
                    </CardFooter>
                )}
            </Card>

            {/* Modal: Solicitar Firma do Encarregado */}
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
                                <p>• Horas Nocturnas: <strong>{totalNoturnas.toFixed(1)} h</strong></p>
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
