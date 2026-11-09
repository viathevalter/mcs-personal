import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import {
    Bell,
    Send,
    MessageSquare,
    Smartphone,
    Copy,
    ExternalLink,
    Users,
    Calendar,
    RefreshCw,
    CheckCircle2,
    Loader2,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
    dispatchMcsChatHoursCampaign,
    interpolateWorkerHoursTemplate,
    getMcsChatBaseUrl
} from '../../worker-portal/services/workerCommunicationService';

export interface WeeklyHoursBreakdown {
    w1: number; // Dias 01 a 07
    w2: number; // Dias 08 a 14
    w3: number; // Dias 15 a 21
    w4: number; // Dias 22 ao fim do mês
    w1Active: boolean;
    w2Active: boolean;
    w3Active: boolean;
    w4Active: boolean;
}

export interface PendingWorkerItem {
    worker_id: string;
    worker_name: string;
    movil: string | null;
    status: string;
    pasaporte?: string | null;
    cod_colab?: string | null;
    contratante?: string | null;
    funcion?: string | null;
    weekly?: WeeklyHoursBreakdown;
}

interface BroadcastReminderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientName: string;
    month: number;
    year: number;
    pendingWorkers: PendingWorkerItem[];
    allClientWorkers?: PendingWorkerItem[];
    initialWeekFilter?: 'all' | 'w1' | 'w2' | 'w3' | 'w4';
    onSuccess?: () => void;
}

export function BroadcastReminderDialog({
    open,
    onOpenChange,
    clientName,
    month,
    year,
    pendingWorkers,
    allClientWorkers,
    initialWeekFilter = 'all',
    onSuccess
}: BroadcastReminderDialogProps) {
    const monthNamesPt = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthNamesEs = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthNamePt = monthNamesPt[month - 1] || `${month}`;
    const monthNameEs = monthNamesEs[month - 1] || `${month}`;

    // Detecta automaticamente a semana atual se estivermos no mês vigente
    const getAutoWeekFocus = (): 'all' | 'w1' | 'w2' | 'w3' | 'w4' => {
        if (initialWeekFilter && initialWeekFilter !== 'all') return initialWeekFilter;
        const now = new Date();
        if (now.getFullYear() === year && now.getMonth() + 1 === month) {
            const d = now.getDate();
            if (d <= 10) return 'w1';
            if (d <= 17) return 'w2';
            if (d <= 24) return 'w3';
            return 'w4';
        }
        return 'all';
    };

    const [weekFocus, setWeekFocus] = useState<'all' | 'w1' | 'w2' | 'w3' | 'w4'>(getAutoWeekFocus);
    const [msgLang, setMsgLang] = useState<'es' | 'pt'>('es');
    const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);
    const [customMessage, setCustomMessage] = useState('');
    const [scheduleMode, setScheduleMode] = useState<'immediate' | 'recurring'>('immediate');
    const [recurringDays, setRecurringDays] = useState<number[]>([5]); // 5 = Sexta-feira, 1 = Segunda-feira
    const [recurringTime, setRecurringTime] = useState('09:00');
    const [sending, setSending] = useState(false);

    const weekLabels: Record<'all' | 'w1' | 'w2' | 'w3' | 'w4', { pt: string; es: string; range: string }> = {
        w1: { pt: 'Semana 1 (Dias 01 a 07)', es: 'Semana 1 (Días 01 al 07)', range: '01 a 07' },
        w2: { pt: 'Semana 2 (Dias 08 a 14)', es: 'Semana 2 (Días 08 al 14)', range: '08 a 14' },
        w3: { pt: 'Semana 3 (Dias 15 a 21)', es: 'Semana 3 (Días 15 al 21)', range: '15 a 21' },
        w4: { pt: 'Semana 4 (Dias 22 ao Fim)', es: 'Semana 4 (Días 22 al Fin)', range: '22 ao fim' },
        all: { pt: 'Mês Completo (Fechamento)', es: 'Mes Completo (Cierre)', range: '01 a 31' }
    };

    // Filtra automaticamente os trabalhadores que estão pendentes na semana escolhida (ou no mês todo)
    const targetWorkers = useMemo(() => {
        const baseList = allClientWorkers && allClientWorkers.length > 0 ? allClientWorkers : pendingWorkers;
        if (weekFocus === 'all') {
            return pendingWorkers;
        }
        return baseList.filter(w => {
            if (w.status === 'validado' || w.status === 'assinado_encarregado') return false;
            if (!w.weekly) return w.status === 'pendente';
            if (weekFocus === 'w1') return !w.weekly.w1Active;
            if (weekFocus === 'w2') return !w.weekly.w2Active;
            if (weekFocus === 'w3') return !w.weekly.w3Active;
            if (weekFocus === 'w4') return !w.weekly.w4Active;
            return true;
        });
    }, [allClientWorkers, pendingWorkers, weekFocus]);

    const workersWithPhone = useMemo(
        () => targetWorkers.filter(w => !!w.movil && w.movil.replace(/\D/g, '').length >= 8),
        [targetWorkers]
    );

    const buildTemplates = (lang: 'es' | 'pt', wf: 'all' | 'w1' | 'w2' | 'w3' | 'w4') => {
        const wInfo = weekLabels[wf];
        if (lang === 'es') {
            return [
                {
                    label: wf === 'all' ? '📅 Recordatorio Mensual' : `📅 Control Semanal (${wInfo.range})`,
                    text:
                        wf === 'all'
                            ? `Hola *{primeiro_nome}*, te recordamos desde *{empresa}* que el registro de tus horas de *${monthNameEs}/${year}* en la obra *{cliente}* está pendiente.\n\nPor favor, ingresa hoy al Portal del Trabajador y registra tus horas trabajadas:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Datos de acceso:*\n• Nombre completo: *{nome}*\n• Contraseña / Pasaporte: *{passaporte}*\n\nSaludos cordiales,\n*Recursos Humanos {empresa}*`
                            : `Hola *{primeiro_nome}*, estamos realizando el seguimiento semanal de horas en *{cliente}* (*${wInfo.es}* de ${monthNameEs}/${year}).\n\nPor favor, ingresa al Portal del Trabajador y deja registradas tus horas trabajadas de esta semana para mantener tu control al día:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Datos de acceso:*\n• Nombre completo: *{nome}*\n• Contraseña / Pasaporte: *{passaporte}*\n\n¡Muchas gracias por tu compromiso!\n*Recursos Humanos {empresa}*`
                },
                {
                    label: '⏰ Aviso de Plazo Semanal',
                    text: `Importante *{primeiro_nome}*:\n\nTe recordamos que el registro semanal de horas en el portal (*${wInfo.es}* - *${monthNameEs}/${year}*) es obligatorio para evitar retrasos en el cierre de *{cliente}*.\n\nIngresa ahora en:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Datos de acceso:*\n• Nombre completo: *{nome}*\n• Contraseña / Pasaporte: *{passaporte}*\n\nSaludos cordiales,\n*Recursos Humanos {empresa}*`
                },
                {
                    label: '🚨 Urgente (Sin Registro)',
                    text: `🚨 *AVISO URGENTE - CONTROL DE HORAS*\n\nEstimado(a) *{nome}*, aún no identificamos el registro de tus horas de *${wInfo.es}* (${monthNameEs}/${year}) en la obra *{cliente}*.\n\nPor favor actualiza tus días trabajados hoy mismo en el portal:\n🔗 https://mcs-personal.vercel.app/portal/\n\n• Usuario: *{nome}*\n• Contraseña / Pasaporte: *{passaporte}*`
                }
            ];
        }

        return [
            {
                label: wf === 'all' ? '📅 Lembrete Mensal' : `📅 Controle Semanal (${wInfo.range})`,
                text:
                    wf === 'all'
                        ? `Olá *{primeiro_nome}*, lembramos que o apontamento das suas horas de *${monthNamePt}/${year}* na obra *{cliente}* está pendente.\n\nPor favor, aceda ao Portal do Trabalhador e preencha os seus dias trabalhados:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Dados de acesso:*\n• Nome completo: *{nome}*\n• Senha / Passaporte: *{passaporte}*\n\nAtenciosamente,\n*Recursos Humanos {empresa}*`
                        : `Olá *{primeiro_nome}*, estamos fazendo o acompanhamento semanal de horas na obra *{cliente}* (*${wInfo.pt}* de ${monthNamePt}/${year}).\n\nPor favor, aceda ao Portal do Trabalhador e registe as horas trabalhadas desta semana para manter a sua folha em dia:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Dados de acesso:*\n• Nome completo: *{nome}*\n• Senha / Passaporte: *{passaporte}*\n\nContamos com a sua colaboração!\n*Recursos Humanos {empresa}*`
            },
            {
                label: '⏰ Aviso de Prazo Semanal',
                text: `Atenção *{primeiro_nome}*:\n\nO preenchimento semanal das horas no portal (*${wInfo.pt}* - *${monthNamePt}/${year}*) é obrigatório para evitar divergências no fechamento da obra *{cliente}*.\n\nAceda agora:\n🔗 https://mcs-personal.vercel.app/portal/\n\n🔑 *Dados de acesso:*\n• Nome completo: *{nome}*\n• Senha / Passaporte: *{passaporte}*`
            },
            {
                label: '🚨 Urgente (Sem Registo)',
                text: `🚨 *AVISO URGENTE - CONTROLE DE HORAS*\n\nOlá *{nome}*, ainda não identificamos o lançamento das suas horas da *${wInfo.pt}* (${monthNamePt}/${year}) na obra *{cliente}*.\n\nRegularize hoje pelo aplicativo:\n🔗 https://mcs-personal.vercel.app/portal/\n\n• Nome completo: *{nome}*\n• Senha / Passaporte: *{passaporte}*`
            }
        ];
    };

    const currentTemplates = useMemo(
        () => buildTemplates(msgLang, weekFocus),
        [msgLang, weekFocus, monthNameEs, monthNamePt, year]
    );

    useEffect(() => {
        if (open) {
            const nextWf = getAutoWeekFocus();
            setWeekFocus(nextWf);
            const tpls = buildTemplates(msgLang, nextWf);
            setSelectedTemplateIdx(0);
            setCustomMessage(tpls[0].text);
        }
    }, [open, initialWeekFilter]);

    const handleChangeWeekFocus = (nextWf: 'all' | 'w1' | 'w2' | 'w3' | 'w4') => {
        setWeekFocus(nextWf);
        const tpls = buildTemplates(msgLang, nextWf);
        const idx = Math.min(selectedTemplateIdx, tpls.length - 1);
        setCustomMessage(tpls[idx].text);
    };

    const handleChangeLang = (nextLang: 'es' | 'pt') => {
        setMsgLang(nextLang);
        const tpls = buildTemplates(nextLang, weekFocus);
        const idx = Math.min(selectedTemplateIdx, tpls.length - 1);
        setCustomMessage(tpls[idx].text);
    };

    const handleSelectTemplate = (idx: number) => {
        setSelectedTemplateIdx(idx);
        setCustomMessage(currentTemplates[idx].text);
    };

    const sampleWorker = targetWorkers[0] || pendingWorkers[0] || {
        worker_id: 'sample',
        worker_name: 'CARLOS ALBERTO PEREZ',
        pasaporte: 'GJ703064',
        contratante: 'LUMINOUS',
        movil: '+34600000000',
        status: 'pendente'
    };

    const previewRendered = useMemo(() => {
        if (!customMessage.trim()) return '';
        return interpolateWorkerHoursTemplate(customMessage, {
            worker_name: sampleWorker.worker_name,
            pasaporte: sampleWorker.pasaporte || 'PASSAPORTE',
            cod_colab: sampleWorker.cod_colab,
            contratante: sampleWorker.contratante || 'LUMINOUS',
            cliente: clientName,
            funcion: sampleWorker.funcion
        });
    }, [customMessage, sampleWorker, clientName]);

    const handleDispatchViaMcsChat = async () => {
        if (!customMessage.trim()) {
            toast.error('Informe a mensagem a ser enviada.');
            return;
        }
        if (targetWorkers.length === 0) {
            toast.error('Nenhum trabalhador pendente neste filtro.');
            return;
        }

        try {
            setSending(true);
            const focusTitle = weekLabels[weekFocus].pt;
            const campaignTitle = `⏱️ Controle de Horas (${focusTitle}) — ${clientName} (${monthNamePt}/${year})`;

            const result = await dispatchMcsChatHoursCampaign({
                campaignTitle,
                clientName,
                year,
                month,
                messageTemplate: customMessage,
                recipients: targetWorkers.map(w => ({
                    worker_id: w.worker_id,
                    worker_name: w.worker_name,
                    movil: w.movil,
                    pasaporte: w.pasaporte,
                    cod_colab: w.cod_colab,
                    contratante: w.contratante,
                    funcion: w.funcion,
                    cliente: clientName
                })),
                scheduleType: scheduleMode,
                recurrenceDaysOfWeek: recurringDays,
                recurrenceTimeOfDay: recurringTime,
                alsoSendPortalNotification: true
            });

            if (scheduleMode === 'recurring') {
                toast.success(
                    `Campanha Semanal ativada no MCS-Chat e 1ª remessa enviada para ${result.enqueuedCount} trabalhador(es)!`,
                    {
                        description: `O MCS-Chat cobrará automaticamente a cada semana apenas quem estiver ativo na obra ${clientName}.`
                    }
                );
            } else {
                toast.success(
                    `Disparo iniciado por dentro do MCS-Chat para ${result.enqueuedCount} trabalhador(es)!`,
                    {
                        description: `As mensagens saem pelo WhatsApp Oficial da empresa de cada trabalhador (como conversa fechada) e também ficam salvas no Portal.`
                    }
                );
            }

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Erro ao disparar pelo MCS-Chat:', err);
            toast.error(err?.message || 'Erro ao disparar campanha no MCS-Chat.');
        } finally {
            setSending(false);
        }
    };

    const toggleRecurringDay = (dayId: number) => {
        setRecurringDays(prev =>
            prev.includes(dayId) ? (prev.length > 1 ? prev.filter(d => d !== dayId) : prev) : [...prev, dayId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
                {/* Header */}
                <DialogHeader className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
                                    <span>Notificar Horas via MCS-Chat (WhatsApp Oficial)</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                                    Cliente: <strong className="text-white">{clientName}</strong> • {monthNamePt}/{year} • Disparo integrado ao MCS-Chat + Portal
                                </DialogDescription>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${getMcsChatBaseUrl()}/inbox/automations`, '_blank')}
                            className="h-8 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 shrink-0"
                        >
                            <span>Abrir MCS-Chat</span>
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* 1. Seletor de Semana (Controle Semanal de Horas) */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                1. Qual período você deseja cobrar agora?
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                Filtra automaticamente quem ainda não lançou horas na semana
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {(['w1', 'w2', 'w3', 'w4', 'all'] as const).map(wf => {
                                const active = weekFocus === wf;
                                const shortLabel =
                                    wf === 'w1'
                                        ? 'Semana 1 (01-07)'
                                        : wf === 'w2'
                                        ? 'Semana 2 (08-14)'
                                        : wf === 'w3'
                                        ? 'Semana 3 (15-21)'
                                        : wf === 'w4'
                                        ? 'Semana 4 (22-Fim)'
                                        : 'Mês Completo';
                                return (
                                    <button
                                        key={wf}
                                        type="button"
                                        onClick={() => handleChangeWeekFocus(wf)}
                                        className={`py-2 px-2 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                                            active
                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                                        }`}
                                    >
                                        {shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Resumo dos Destinatários no Filtro */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-xl p-3 flex items-center gap-3">
                            <Users className="h-5 w-5 text-rose-600 shrink-0" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">
                                    Pendentes em {weekLabels[weekFocus].pt}
                                </span>
                                <span className="text-xl font-black text-rose-800 dark:text-rose-200">
                                    {targetWorkers.length} trabalhador(es)
                                </span>
                            </div>
                        </div>

                        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 flex items-center gap-3">
                            <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                                    Prontos p/ WhatsApp (MCS-Chat)
                                </span>
                                <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                                    {workersWithPhone.length} / {targetWorkers.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Idioma e Modelos Rápidos com Login e Passaporte Automáticos */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                2. Modelo de Mensagem (preenche Nome e Passaporte automaticamente):
                            </label>

                            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border">
                                <button
                                    type="button"
                                    onClick={() => handleChangeLang('es')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                                        msgLang === 'es'
                                            ? 'bg-amber-500 text-white shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    🇪🇸 Español
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChangeLang('pt')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                                        msgLang === 'pt'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    🇵🇹 Português
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {currentTemplates.map((tpl, idx) => (
                                <button
                                    key={tpl.label}
                                    type="button"
                                    onClick={() => handleSelectTemplate(idx)}
                                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                                        selectedTemplateIdx === idx
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-2xs'
                                            : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[10.5px] font-bold text-muted-foreground mr-1">
                                Variáveis automáticas:
                            </span>
                            {['{primeiro_nome}', '{nome}', '{passaporte}', '{empresa}', '{cliente}'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setCustomMessage(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${tag}`)}
                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 cursor-pointer"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        <Textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={5}
                            className="text-xs resize-none rounded-xl font-medium leading-relaxed"
                            placeholder="Digite a mensagem para os trabalhadores..."
                        />
                    </div>

                    {/* Preview WhatsApp em Tempo Real */}
                    <div className="rounded-xl bg-[#efeae2] dark:bg-slate-900 p-3 border border-emerald-300/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                            <span>
                                📱 Preview no WhatsApp ({sampleWorker.worker_name})
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px]">
                                Canal MCS-Chat: {sampleWorker.contratante || 'Automático pela Empresa'}
                            </span>
                        </div>
                        <div className="bg-[#d9fdd3] dark:bg-emerald-950 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-xs whitespace-pre-wrap leading-snug max-h-36 overflow-y-auto shadow-2xs">
                            {previewRendered}
                        </div>
                    </div>

                    {/* 3. Modo de Disparo: Agora ou Recorrência Semanal Automática */}
                    <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                                3. Modo de Controle no MCS-Chat:
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setScheduleMode('immediate')}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    scheduleMode === 'immediate'
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="font-extrabold text-xs">⚡ Disparar Agora no MCS-Chat</div>
                                <div className={`text-[10.5px] mt-0.5 ${scheduleMode === 'immediate' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                                    Envia agora para os {workersWithPhone.length} pendentes com proteção Anti-Ban (conversa fechada).
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScheduleMode('recurring')}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    scheduleMode === 'recurring'
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="font-extrabold text-xs">🔄 Disparar Agora + Repetir Toda Semana</div>
                                <div className={`text-[10.5px] mt-0.5 ${scheduleMode === 'recurring' ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                                    Envia hoje e deixa agendado no MCS-Chat para cobrar toda semana automaticamente.
                                </div>
                            </button>
                        </div>

                        {scheduleMode === 'recurring' && (
                            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 mr-1">
                                        Dias da cobrança semanal:
                                    </span>
                                    {[
                                        { id: 1, label: 'Seg' },
                                        { id: 3, label: 'Qua' },
                                        { id: 5, label: 'Sex' },
                                        { id: 6, label: 'Sáb' }
                                    ].map(d => {
                                        const isAct = recurringDays.includes(d.id);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => toggleRecurringDay(d.id)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
                                                    isAct
                                                        ? 'bg-indigo-600 text-white border-indigo-700'
                                                        : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-300'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                                        Horário:
                                    </span>
                                    <input
                                        type="time"
                                        value={recurringTime}
                                        onChange={(e) => setRecurringTime(e.target.value)}
                                        className="px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="shrink-0 p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-xs font-semibold"
                    >
                        Fechar
                    </Button>

                    <Button
                        type="button"
                        onClick={handleDispatchViaMcsChat}
                        disabled={sending || targetWorkers.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-2 px-4 h-10 rounded-xl shadow-sm cursor-pointer"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Enviando para o MCS-Chat...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                <span>
                                    {scheduleMode === 'recurring'
                                        ? `Disparar e Ativar Semanal (${targetWorkers.length} Trab.)`
                                        : `Disparar pelo MCS-Chat para ${targetWorkers.length} Trabalhador(es)`}
                                </span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
