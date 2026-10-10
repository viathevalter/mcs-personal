import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { 
    Send, 
    MessageSquare, 
    Clock, 
    Check, 
    CheckCheck, 
    Plus, 
    Sparkles, 
    User, 
    Shield, 
    Loader2, 
    Bookmark, 
    Bell, 
    Smartphone 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    getWorkerPeriodMessages, 
    sendWorkerMessage, 
    getMessageTemplates, 
    createMessageTemplate, 
    markMessagesAsRead,
    type WorkerMessage, 
    type MessageTemplate 
} from '../../worker-portal/services/workerCommunicationService';

interface WorkerNotificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    workerCode?: string;
    workerPassport?: string;
    workerPhone?: string;
    periodYear: number;
    periodMonth: number;
    clientName: string;
    hourRecordId?: string;
    onMessageSent?: () => void;
}

export function WorkerNotificationDialog({
    open,
    onOpenChange,
    workerId,
    workerName,
    workerCode,
    workerPassport,
    workerPhone,
    periodYear,
    periodMonth,
    clientName,
    hourRecordId,
    onMessageSent
}: WorkerNotificationDialogProps) {
    const [messages, setMessages] = useState<WorkerMessage[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateText, setNewTemplateText] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[periodMonth - 1] || `${periodMonth}`;

    const loadData = async () => {
        if (!workerId) return;
        try {
            setLoading(true);
            const [msgs, tmpls] = await Promise.all([
                getWorkerPeriodMessages(workerId, periodYear, periodMonth),
                getMessageTemplates()
            ]);
            setMessages(msgs);
            setTemplates(tmpls);

            // Marcar mensagens do trabalhador como lidas pelo gestor
            const unreadIds = msgs
                .filter(m => m.sender_type === 'trabalhador' && !m.read)
                .map(m => m.id);
            if (unreadIds.length > 0) {
                await markMessagesAsRead(unreadIds);
                if (onMessageSent) onMessageSent();
            }
        } catch (err) {
            console.error('Erro ao carregar dados de notificação:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadData();
            setShowNewTemplateForm(false);
        }
    }, [open, workerId, periodYear, periodMonth]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim()) {
            toast.error('Digite uma mensagem para enviar.');
            return;
        }

        try {
            setSending(true);
            await sendWorkerMessage({
                workerId,
                year: periodYear,
                month: periodMonth,
                senderType: 'gestor',
                senderName: 'Gestor (MCS)',
                message: text.trim(),
                hourRecordId
            });

            setText('');
            toast.success('Notificação enviada ao trabalhador!');
            await loadData();
            if (onMessageSent) onMessageSent();
        } catch (err) {
            toast.error('Erro ao enviar mensagem.');
        } finally {
            setSending(false);
        }
    };

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
                toast.success('Nova frase pronta cadastrada e selecionada!');
            }
        } catch (err) {
            toast.error('Erro ao salvar frase pronta.');
        } finally {
            setSavingTemplate(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[700px] w-[95vw] h-[85vh] max-h-[750px] p-0 flex flex-col overflow-hidden bg-background">
                {/* Header Premium */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-base tracking-tight text-white">
                                    {workerName}
                                </h3>
                                {workerCode && (
                                    <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                        #{workerCode}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                                <span>{clientName}</span>
                                <span>&bull;</span>
                                <span className="font-bold text-emerald-400">{monthName} / {periodYear}</span>
                                {workerPassport && (
                                    <>
                                        <span>&bull;</span>
                                        <span className="font-mono text-slate-400">{workerPassport}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">Notificações & Chat</span>
                        <span>Rastreabilidade em tempo real</span>
                    </div>
                </div>

                {/* Sub-Bar: Frases Prontas (Templates) */}
                <div className="bg-muted/40 border-b border-border px-4 py-2.5 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap flex items-center gap-1 mr-1">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            Frases Prontas:
                        </span>
                        {templates.slice(0, 4).map((tmpl) => (
                            <button
                                key={tmpl.id}
                                type="button"
                                onClick={() => handleSelectTemplate(tmpl)}
                                className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary/10 hover:border-primary/40 border border-border text-xs font-semibold text-foreground whitespace-nowrap transition-all shadow-2xs"
                                title={tmpl.message}
                            >
                                {tmpl.title}
                            </button>
                        ))}
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                        className="h-7 px-2 text-xs font-bold gap-1 shrink-0"
                    >
                        <Plus className="h-3 w-3" />
                        <span>Cadastrar Frase</span>
                    </Button>
                </div>

                {/* Formulário Retrátil para Cadastrar Nova Frase Pronta */}
                {showNewTemplateForm && (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 shrink-0 space-y-2 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                                Cadastrar Nova Frase Pronta
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowNewTemplateForm(false)}
                                className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                            >
                                Cancelar
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                                placeholder="Título (Ex: Urgente - Folha de Horas)"
                                value={newTemplateTitle}
                                onChange={(e) => setNewTemplateTitle(e.target.value)}
                                className="h-8 text-xs bg-white dark:bg-slate-900"
                            />
                            <Input
                                placeholder="Mensagem completa..."
                                value={newTemplateText}
                                onChange={(e) => setNewTemplateText(e.target.value)}
                                className="h-8 text-xs sm:col-span-2 bg-white dark:bg-slate-900"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleSaveNewTemplate}
                                disabled={savingTemplate}
                                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            >
                                {savingTemplate ? 'Salvando...' : 'Salvar e Inserir'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Histórico de Mensagens (Chat com Rastreabilidade) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20">
                    {loading && (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!loading && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Nenhuma notificação enviada ainda</h4>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                Envie uma instrução, lembrete ou tire dúvidas sobre as horas de {monthName}/{periodYear} com {workerName}.
                            </p>
                        </div>
                    )}

                    {!loading && messages.map((msg) => {
                        const isGestor = msg.sender_type === 'gestor';
                        const isSystem = msg.sender_type === 'sistema';
                        const dateFormatted = new Date(msg.created_at).toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-2">
                                    <span className="text-[10px] bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium border">
                                        {msg.message} &bull; {dateFormatted}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isGestor ? 'items-end' : 'items-start'} max-w-[85%] ${
                                    isGestor ? 'ml-auto' : 'mr-auto'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                    {isGestor ? (
                                        <>
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {msg.sender_name || 'Gestor (MCS)'}
                                            </span>
                                            <Shield className="h-3 w-3 text-blue-500" />
                                        </>
                                    ) : (
                                        <>
                                            <User className="h-3 w-3 text-emerald-600" />
                                            <span className="text-[10px] font-bold text-foreground">
                                                {workerName}
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div
                                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
                                        isGestor
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-900 text-foreground border border-border rounded-tl-none'
                                    }`}
                                >
                                    {msg.message}
                                </div>

                                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>{dateFormatted}</span>
                                    {isGestor && (
                                        <span className="flex items-center gap-0.5 ml-1">
                                            {msg.read ? (
                                                <span className="text-emerald-500 flex items-center font-bold">
                                                    <CheckCheck className="h-3 w-3 mr-0.5" />
                                                    Lida
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 flex items-center">
                                                    <Check className="h-3 w-3 mr-0.5" />
                                                    Enviada
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input e Ação de Envio */}
                <div className="p-3 sm:p-4 bg-background border-t border-border shrink-0 space-y-2">
                    <div className="relative">
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Escreva uma mensagem ou instrução para o trabalhador (pressione Enter para enviar)..."
                            className="min-h-[75px] max-h-[140px] text-xs resize-none pr-12 rounded-xl"
                        />
                        <Button
                            type="button"
                            onClick={handleSend}
                            disabled={sending || !text.trim()}
                            size="icon"
                            className="absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            title="Enviar Notificação"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3 text-blue-500" />
                            A mensagem é entregue no aplicativo do colaborador e gera aviso imediato.
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Fechar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
