import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { 
    Send, 
    MessageSquare, 
    Sparkles, 
    Users, 
    Loader2, 
    Bookmark, 
    Plus,
    X,
    Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    dispatchMcsChatHoursCampaign,
    sendBatchWorkerMessages, 
    getMessageTemplates, 
    createMessageTemplate, 
    type MessageTemplate 
} from '../../worker-portal/services/workerCommunicationService';

export interface SelectedWorker {
    worker_id: string;
    worker_name: string;
    movil?: string | null;
    pasaporte?: string | null;
    cod_colab?: string | null;
    contratante?: string | null;
    funcion?: string | null;
}

interface BatchWorkerNotificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientName: string;
    periodYear: number;
    periodMonth: number;
    selectedWorkers: SelectedWorker[];
    onSuccess?: () => void;
}

export function BatchWorkerNotificationDialog({
    open,
    onOpenChange,
    clientName,
    periodYear,
    periodMonth,
    selectedWorkers,
    onSuccess
}: BatchWorkerNotificationDialogProps) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendViaMcsChatWhatsApp, setSendViaMcsChatWhatsApp] = useState(true);
    const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateText, setNewTemplateText] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[periodMonth - 1] || `${periodMonth}`;

    const defaultWeeklyEs = `Hola *{primeiro_nome}*, te recordamos desde *{empresa}* registrar tus horas trabajadas de esta semana en la obra *{cliente}* (${monthName}/${periodYear}).\n\n🔗 Portal: https://mcs-personal.vercel.app/portal/\n• Nombre completo: *{nome}*\n• Contraseña / Pasaporte: *{passaporte}*`;

    useEffect(() => {
        if (open) {
            getMessageTemplates().then(loaded => {
                setTemplates(loaded);
                if (!text) {
                    setText(loaded[0]?.message || defaultWeeklyEs);
                }
            });
            setShowNewTemplateForm(false);
        }
    }, [open]);

    const handleSelectTemplate = (tmpl: MessageTemplate) => {
        setText(tmpl.message);
        toast.info(`Frase pronta aplicada: "${tmpl.title}"`);
    };

    const handleSaveNewTemplate = async () => {
        if (!newTemplateTitle.trim() || !newTemplateText.trim()) {
            toast.error('Preencha o título e o texto da frase pronta.');
            return;
        }

        try {
            setSavingTemplate(true);
            const created = await createMessageTemplate(newTemplateTitle, newTemplateText);
            if (created) {
                setTemplates(prev => [created, ...prev]);
                setText(created.message);
                setShowNewTemplateForm(false);
                setNewTemplateTitle('');
                setNewTemplateText('');
                toast.success('Nova frase pronta cadastrada!');
            }
        } catch (err) {
            toast.error('Erro ao salvar frase pronta.');
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleSendBatch = async () => {
        if (!text.trim()) {
            toast.error('Digite a mensagem a ser enviada.');
            return;
        }

        try {
            setSending(true);
            if (sendViaMcsChatWhatsApp) {
                const res = await dispatchMcsChatHoursCampaign({
                    campaignTitle: `⏱️ Notificação Controle de Horas — ${clientName} (${monthName}/${periodYear})`,
                    clientName,
                    year: periodYear,
                    month: periodMonth,
                    messageTemplate: text.trim(),
                    recipients: selectedWorkers.map(w => ({
                        worker_id: w.worker_id,
                        worker_name: w.worker_name,
                        movil: w.movil,
                        pasaporte: w.pasaporte,
                        cod_colab: w.cod_colab,
                        contratante: w.contratante,
                        funcion: w.funcion,
                        cliente: clientName
                    })),
                    scheduleType: 'immediate',
                    alsoSendPortalNotification: true
                });

                toast.success(`Disparo enviado via MCS-Chat para ${res.enqueuedCount} trabalhador(es)!`, {
                    description: `As mensagens foram enviadas pelo WhatsApp Oficial no MCS-Chat e salvas no Portal.`
                });
            } else {
                const workerIds = selectedWorkers.map(w => w.worker_id);
                const total = await sendBatchWorkerMessages({
                    workerIds,
                    year: periodYear,
                    month: periodMonth,
                    senderName: 'Gestor (MCS)',
                    message: text.trim()
                });

                toast.success(`Notificação enviada no Portal para ${total} trabalhadores!`);
            }

            setText('');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error('Erro ao enviar notificações em lote.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[650px] w-[95vw] max-h-[88vh] p-0 flex flex-col overflow-hidden bg-background">
                {/* Header Premium */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold shadow-inner">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="font-extrabold text-base tracking-tight text-white">
                                    Notificar Trabalhadores Selecionados (MCS-Chat)
                                </DialogTitle>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                                    {selectedWorkers.length} selecionados
                                </span>
                            </div>
                            <DialogDescription className="text-xs text-slate-300 mt-0.5">
                                Cliente: <strong className="text-white">{clientName}</strong> &bull; {monthName}/{periodYear}
                            </DialogDescription>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0 border border-white/20 cursor-pointer shadow-xs transition-colors"
                        title="Fechar janela (Esc)"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Lista resumida de trabalhadores selecionados */}
                    <div className="bg-muted/40 border border-border rounded-xl p-3">
                        <span className="text-[11px] font-bold text-foreground block mb-1.5">
                            Destinatários ({selectedWorkers.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                            {selectedWorkers.map(w => (
                                <Badge key={w.worker_id} variant="secondary" className="text-[11px] font-medium py-0.5 px-2">
                                    {w.worker_name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Opção Canal MCS-Chat */}
                    <label className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                            <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                                <div className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                                    Enviar por dentro do MCS-Chat (WhatsApp Oficial da Empresa + Portal)
                                </div>
                                <div className="text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80">
                                    Substitui automaticamente {'{nome}'} e {'{passaporte}'} de cada trabalhador e mantém o chat como Fechado.
                                </div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={sendViaMcsChatWhatsApp}
                            onChange={(e) => setSendViaMcsChatWhatsApp(e.target.checked)}
                            className="h-4 w-4 accent-emerald-600 rounded"
                        />
                    </label>

                    {/* Frases Prontas (Templates) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                Escolha uma Frase Pronta ou Digite:
                            </label>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                                className="h-6 text-xs text-primary font-bold gap-1"
                            >
                                <Plus className="h-3 w-3" />
                                <span>Cadastrar Nova Frase</span>
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setText(defaultWeeklyEs)}
                                className="px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-all text-left shadow-2xs"
                            >
                                📅 Cobrança Semanal (ES + Login/Passaporte)
                            </button>
                            {templates.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => handleSelectTemplate(tmpl)}
                                    className="px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-card hover:bg-primary/10 hover:border-primary/40 transition-all text-left shadow-2xs"
                                >
                                    {tmpl.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {showNewTemplateForm && (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                    <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                                    Salvar Modelo Reutilizável
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowNewTemplateForm(false)}
                                    className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                                >
                                    Cancelar
                                </button>
                            </div>
                            <Input
                                placeholder="Título (Ex: Lembrete Semanal)"
                                value={newTemplateTitle}
                                onChange={(e) => setNewTemplateTitle(e.target.value)}
                                className="h-8 text-xs bg-white dark:bg-slate-900"
                            />
                            <Input
                                placeholder="Texto que será enviado ao trabalhador..."
                                value={newTemplateText}
                                onChange={(e) => setNewTemplateText(e.target.value)}
                                className="h-8 text-xs bg-white dark:bg-slate-900"
                            />
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={handleSaveNewTemplate}
                                    disabled={savingTemplate}
                                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                >
                                    {savingTemplate ? 'Salvando...' : 'Salvar Frase'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Mensagem a ser enviada */}
                    <div>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <label className="text-xs font-bold text-foreground">
                                Mensagem para os {selectedWorkers.length} Trabalhadores:
                            </label>
                            <div className="flex items-center gap-1">
                                {['{primeiro_nome}', '{nome}', '{passaporte}', '{empresa}', '{cliente}'].map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setText(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${v}`)}
                                        className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={5}
                            className="text-xs resize-none rounded-xl"
                            placeholder="Digite a instrução ou selecione um modelo acima..."
                        />
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-border shrink-0 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSendBatch}
                        disabled={sending || !text.trim() || selectedWorkers.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Enviando via MCS-Chat...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                <span>Disparar via MCS-Chat ({selectedWorkers.length} Trab.)</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
