import React, { useState } from 'react';
import { 
    ChevronLeft, FileText, Send, Download, CheckCircle2, 
    ArrowLeft, User, Mail, Phone, UploadCloud, Loader2, Copy, Check
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../shared/supabase/client';
import { downloadTimesheetPdf, type TimesheetPdfData, type TimesheetDayEntry } from '../services/timesheetPdfService';
import { getCompanyBranding } from '../services/companyLogos';
import type { WorkerHour } from '../../../shared/types/corePersonal';

interface GeneratePdfViewProps {
    worker: any;
    period: WorkerHour;
    days: TimesheetDayEntry[];
    monthlyStats: {
        totalHours: number;
        totalNormais: number;
        totalNoturnas: number;
        daysWorked: number;
        pendingDays: number;
    };
    onBack: () => void;
    onSwitchToUpload?: () => void;
    onCompleted?: () => void;
}

export function GeneratePdfView({
    worker,
    period,
    days,
    monthlyStats,
    onBack,
    onSwitchToUpload,
    onCompleted
}: GeneratePdfViewProps) {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');
    const locale = isSpanish ? 'es-ES' : 'pt-PT';

    // Etapas do fluxo: 'review' (Tela 8) | 'send' (Tela 9) | 'success' (Tela 10)
    const [step, setStep] = useState<'review' | 'send' | 'success'>('review');
    const [downloading, setDownloading] = useState(false);
    const [sending, setSending] = useState(false);

    // Campos do encarregado
    const [encarregadoNome, setEncarregadoNome] = useState(period.encarregado_nome || '');
    const [encarregadoEmail, setEncarregadoEmail] = useState(period.encarregado_email || '');
    const [encarregadoTelefone, setEncarregadoTelefone] = useState(period.encarregado_telefone || '');

    const dateObj = new Date(period.period_year, period.period_month - 1, 1);
    const monthName = dateObj.toLocaleDateString(locale, { month: 'long' });

    const [mensagem, setMensagem] = useState(
        isSpanish 
            ? `Hola, adjunto mi hoja de horas del mes de ${monthName}.`
            : `Olá, segue a minha folha de horas do mês de ${monthName}.`
    );

    const [signingResult, setSigningResult] = useState<{
        token: string;
        otp?: string;
        link: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const compName = worker.contratante || worker.empresa_nome || 'MCS Personal';
    const branding = getCompanyBranding(compName);

    // Gerar e Baixar PDF Oficial
    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            const firstObra = days.find(d => d.obra)?.obra || '';
            const pdfData: TimesheetPdfData = {
                empresaNome: compName,
                empresaNif: worker.empresa_nif || branding?.nif,
                logoUrl: branding?.logoUrl,
                workerNome: worker.nome,
                workerDoc: worker.pasaporte || worker.nie || 'N/A',
                workerFuncion: worker.funcion,
                clienteNome: period.cliente_nombre,
                obraNome: firstObra,
                mes: period.period_month,
                ano: period.period_year,
                apontamentos: days,
                totalNormais: monthlyStats.totalNormais,
                totalNoturnas: monthlyStats.totalNoturnas,
                totalGeral: monthlyStats.totalHours,
                encarregadoNome: period.encarregado_nome,
                signedAt: period.signed_at,
                signedIp: period.signed_ip,
                signatureImageUrl: period.signature_image_url
            };
            await downloadTimesheetPdf(pdfData);
            toast.success(isSpanish ? '¡PDF oficial generado con éxito!' : 'PDF oficial gerado com sucesso!');
        } catch (err: any) {
            console.error('Erro ao baixar PDF:', err);
            toast.error(err.message || 'Erro ao gerar o PDF.');
        } finally {
            setDownloading(false);
        }
    };

    // Enviar ao Encarregado
    const handleSendToSupervisor = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!encarregadoNome.trim()) {
            toast.error(isSpanish ? 'Por favor, introduce el nombre del encargado.' : 'Por favor, informe o nome do encarregado de obra.');
            return;
        }

        try {
            setSending(true);
            const passport = worker.pasaporte || worker.nie;

            const apontamentosFormatted = days.map(d => ({
                dia: d.dia,
                day: d.dia,
                entrada: d.entrada || '',
                saida: d.saida || '',
                horasNormais: Number(d.horasNormais || 0),
                horas_normais: Number(d.horasNormais || 0),
                horasNoturnas: Number(d.horasNoturnas || 0),
                horas_noturnas: Number(d.horasNoturnas || 0),
                totalHoras: Number(d.totalHoras || 0),
                total_horas: Number(d.totalHoras || 0),
                obra: d.obra || '',
                obs: d.obs || ''
            }));

            // 1. Garantir que o rascunho está salvo no banco
            await supabase.rpc('save_worker_timesheet_draft', {
                p_worker_id: worker.id,
                p_pasaporte: passport,
                p_worker_hour_id: period.id,
                p_apontamentos: apontamentosFormatted,
                p_total_normais: monthlyStats.totalNormais,
                p_total_noturnas: monthlyStats.totalNoturnas
            });

            // 2. Disparar RPC de solicitação de assinatura ao encarregado
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
                toast.error(data?.error || 'Erro ao solicitar assinatura.');
                return;
            }

            const token = data.signature_token;
            const otp = data.otp_code;
            const fullLink = `${window.location.origin}/assinar-folha/${token}`;

            setSigningResult({
                token,
                otp,
                link: fullLink
            });

            setStep('success');
            toast.success(isSpanish ? '¡Hoja enviada al encargado!' : 'Folha enviada ao encarregado!');
        } catch (err: any) {
            console.error('Erro ao enviar ao encarregado:', err);
            toast.error(err.message || 'Erro ao enviar a folha.');
        } finally {
            setSending(false);
        }
    };

    const handleCopyLink = () => {
        if (!signingResult?.link) return;
        navigator.clipboard.writeText(signingResult.link);
        setCopied(true);
        toast.success(isSpanish ? '¡Enlace copiado al portapapeles!' : 'Link copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2500);
    };

    // TELA 10: CONFIRMAÇÃO DE SUCESSO
    if (step === 'success') {
        return (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
                <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="h-10 w-10" />
                </div>

                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {t('workerPortal.generatePdf.successTitle', 'Folha Enviada com Sucesso!')}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                        {t('workerPortal.generatePdf.successDesc', 'O encarregado receberá o link para conferir as horas e assinar com o código OTP.')}
                    </p>
                </div>

                {/* Resumo da Folha */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 font-bold block uppercase">
                                {t('workerPortal.generatePdf.title', 'Folha de Horas')}
                            </span>
                            <span className="text-sm font-black text-slate-900 block capitalize">
                                {monthName} de {period.period_year}
                            </span>
                        </div>
                    </div>
                    <span className="text-base font-black text-emerald-800">
                        {monthlyStats.totalHours.toFixed(1).replace('.', ',')} h
                    </span>
                </div>

                {/* Link de Assinatura Rápido para Envio no WhatsApp */}
                {signingResult?.link && (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-left space-y-2">
                        <span className="text-xs font-bold text-emerald-900 block">
                            {isSpanish ? 'Enlace directo para firma del Encargado:' : 'Link direto para o Encarregado assinar:'}
                        </span>
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={signingResult.link}
                                className="h-9 rounded-xl bg-white border-emerald-300 text-xs text-slate-700 font-mono"
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCopyLink}
                                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <Button
                    type="button"
                    onClick={onCompleted || onBack}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-95 transition-all"
                >
                    {t('workerPortal.generatePdf.btnBackHome', 'Voltar ao Início')}
                </Button>
            </div>
        );
    }

    // TELA 9: ENVIAR PARA O ENCARREGADO
    if (step === 'send') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setStep('review')}
                        className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                            {t('workerPortal.generatePdf.sendTitle', 'Validação do Encarregado')}
                        </h2>
                    </div>
                </div>

                <form onSubmit={handleSendToSupervisor} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
                    {/* Nome do Encarregado */}
                    <div className="space-y-1">
                        <Label htmlFor="encarregadoNome" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t('workerPortal.generatePdf.supervisorName', 'Nome do Encarregado')} *
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="encarregadoNome"
                                required
                                value={encarregadoNome}
                                onChange={(e) => setEncarregadoNome(e.target.value)}
                                placeholder="Ex: Juan Martínez"
                                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold text-slate-900 text-sm focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* E-mail (Opcional) */}
                    <div className="space-y-1">
                        <Label htmlFor="encarregadoEmail" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t('workerPortal.generatePdf.supervisorEmail', 'E-mail do Encarregado')}
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="encarregadoEmail"
                                type="email"
                                value={encarregadoEmail}
                                onChange={(e) => setEncarregadoEmail(e.target.value)}
                                placeholder="encarregado@obra.com"
                                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 text-sm focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Telefone / WhatsApp (Opcional) */}
                    <div className="space-y-1">
                        <Label htmlFor="encarregadoTelefone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t('workerPortal.generatePdf.supervisorPhone', 'Telemóvel / WhatsApp')}
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="encarregadoTelefone"
                                type="tel"
                                value={encarregadoTelefone}
                                onChange={(e) => setEncarregadoTelefone(e.target.value)}
                                placeholder="+34 600 000 000"
                                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 text-sm focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Mensagem Opcional */}
                    <div className="space-y-1">
                        <Label htmlFor="mensagem" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t('workerPortal.generatePdf.messageLabel', 'Mensagem')}
                        </Label>
                        <textarea
                            id="mensagem"
                            rows={3}
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none font-medium"
                        />
                    </div>

                    {/* Botão de Envio */}
                    <Button
                        type="submit"
                        disabled={sending}
                        className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('workerPortal.generatePdf.btnSending', 'A enviar...')}
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                {t('workerPortal.generatePdf.btnConfirmSend', 'Enviar Folha para Assinatura')}
                            </>
                        )}
                    </Button>
                </form>
            </div>
        );
    }

    // TELA 8: REVISAR E GERAR PDF PARA ASSINATURA
    return (
        <div className="space-y-4">
            {/* Topo com botão Voltar */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-extrabold text-slate-900">
                    {t('workerPortal.generatePdf.title', 'Folha Oficial de Horas')}
                </h2>
            </div>

            {/* Cartão de Resumo da Folha de Horas */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                {/* Cabeçalho da Folha */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {branding?.logoUrl ? (
                            <img src={branding.logoUrl} alt={compName} className="h-9 w-auto max-w-[100px] object-contain" />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs">
                                MCS
                            </div>
                        )}
                        <div>
                            <span className="text-xs uppercase font-extrabold text-slate-400 block tracking-wider">
                                {t('workerPortal.generatePdf.title', 'Folha de Horas')}
                            </span>
                            <span className="text-base font-black text-slate-900 block leading-tight capitalize">
                                {monthName} de {period.period_year}
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-xs uppercase font-bold text-slate-400 block">
                            {t('workerPortal.dashboard.kpiMonth', 'Total do Mês')}
                        </span>
                        <span className="text-2xl font-black text-emerald-800 block leading-none">
                            {monthlyStats.totalHours.toFixed(1).replace('.', ',')} h
                        </span>
                    </div>
                </div>

                {/* Dados do Trabalhador e Obra */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="text-slate-400 font-bold block uppercase text-[10px]">
                            {t('workerPortal.dashboard.workerTitle', 'Trabalhador')}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm block truncate">{worker.nome}</span>
                    </div>

                    <div>
                        <span className="text-slate-400 font-bold block uppercase text-[10px]">Passaporte / Doc</span>
                        <span className="font-mono font-bold text-slate-800 text-sm block">{worker.pasaporte || worker.nie || 'N/A'}</span>
                    </div>

                    <div>
                        <span className="text-slate-400 font-bold block uppercase text-[10px]">Empresa</span>
                        <span className="font-semibold text-slate-800 block truncate">{compName}</span>
                    </div>

                    <div>
                        <span className="text-slate-400 font-bold block uppercase text-[10px]">Obra / Cliente</span>
                        <span className="font-semibold text-slate-800 block truncate">{period.cliente_nombre || 'NÃO DEFINIDO'}</span>
                    </div>
                </div>

                {/* Alerta de Dias Pendentes se houver */}
                {monthlyStats.pendingDays > 0 && (
                    <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 text-amber-900 text-xs font-semibold flex items-center gap-2">
                        <span className="text-amber-600 font-bold">Atenção:</span> Existem {monthlyStats.pendingDays} dia(s) pendente(s) neste mês.
                    </div>
                )}

                {/* Botões de Ação */}
                <div className="space-y-2 pt-2">
                    <Button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {downloading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isSpanish ? 'Generando PDF...' : 'Gerando PDF...'}
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                {t('workerPortal.generatePdf.btnDownload', 'Baixar PDF Oficial')}
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => setStep('send')}
                        variant="outline"
                        className="w-full h-12 rounded-2xl border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Send className="h-4 w-4 text-emerald-600" />
                        {t('workerPortal.generatePdf.btnSendSupervisor', 'Enviar para o Encarregado')}
                    </Button>
                </div>
            </div>

            {/* Plano B: Enviar folha de papel física */}
            {onSwitchToUpload && (
                <div className="text-center pt-1">
                    <button
                        type="button"
                        onClick={onSwitchToUpload}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline flex items-center justify-center gap-1.5 mx-auto py-2"
                    >
                        <UploadCloud className="h-4 w-4 text-slate-400" />
                        {t('workerPortal.generatePdf.btnPaperFallback', 'Enviar folha em papel (Plano B)')}
                    </button>
                </div>
            )}
        </div>
    );
}
