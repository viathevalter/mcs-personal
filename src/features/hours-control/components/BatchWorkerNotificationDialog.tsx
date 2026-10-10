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
    Bell, 
    Plus,
    CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    sendBatchWorkerMessages, 
    getMessageTemplates, 
    createMessageTemplate, 
    type MessageTemplate 
} from '../../worker-portal/services/workerCommunicationService';

interface SelectedWorker {
    worker_id: string;
    worker_name: string;
    movil?: string | null;
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
    const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateText, setNewTemplateText] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[periodMonth - 1] || `${periodMonth}`;

    useEffect(() => {
        if (open) {
            getMessageTemplates().then(setTemplates);
            setShowNewTemplateForm(false);
            if (templates.length > 0 && !text) {
                setText(templates[0].message);
            }
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
            const workerIds = selectedWorkers.map(w => w.worker_id);
            const total = await sendBatchWorkerMessages({
                workerIds,
                year: periodYear,
                month: periodMonth,
                senderName: 'Gestor (MCS)',
                message: text.trim()
            });

            toast.success(`Notificação enviada com sucesso para ${total} trabalhadores!`, {
                description: `As mensagens foram gravadas e notificadas nos aplicativos do cliente ${clientName}.`
            });

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
            <DialogContent className="max-w-[650px] w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden bg-background">
                {/* Header Premium */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold shadow-inner">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="font-extrabold text-base tracking-tight text-white">
                                    Notificar Trabalhadores Selecionados
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
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Lista resumida de trabalhadores selecionados */}
                    <div className="bg-muted/40 border border-border rounded-xl p-3">
                        <span className="text-[11px] font-bold text-foreground block mb-1.5">
                            Destinatários ({selectedWorkers.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
                            {selectedWorkers.map(w => (
                                <Badge key={w.worker_id} variant="secondary" className="text-[11px] font-medium py-0.5 px-2">
                                    {w.worker_name}
                                </Badge>
                            ))}
                        </div>
                    </div>

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

                    {/* Formulário Retrátil para Cadastrar Nova Frase Pronta */}
                    {showNewTemplateForm && (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2 animate-in slide-in-from-top-2">
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
                                placeholder="Título (Ex: Lembrete Quinzena)"
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
                        <label className="text-xs font-bold text-foreground block mb-1">
                            Mensagem a Enviar para os {selectedWorkers.length} Trabalhadores:
                        </label>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={4}
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>A disparar notificações...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                <span>Disparar para {selectedWorkers.length} Trabalhadores</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
