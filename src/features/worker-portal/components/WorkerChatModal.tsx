import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { 
    Send, 
    MessageSquare, 
    Clock, 
    Shield, 
    User, 
    Loader2, 
    Check, 
    CheckCheck, 
    Bell, 
    X,
    Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
    getWorkerPeriodMessages, 
    sendWorkerMessage, 
    markMessagesAsRead,
    triggerLocalTestPush,
    type WorkerMessage 
} from '../services/workerCommunicationService';

interface WorkerChatModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    periodYear: number;
    periodMonth: number;
    hourRecordId?: string;
    onMessagesRead?: () => void;
}

export function WorkerChatModal({
    open,
    onOpenChange,
    workerId,
    workerName,
    periodYear,
    periodMonth,
    hourRecordId,
    onMessagesRead
}: WorkerChatModalProps) {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');

    const [messages, setMessages] = useState<WorkerMessage[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [testingPush, setTestingPush] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        if (!workerId) return;
        try {
            setLoading(true);
            const data = await getWorkerPeriodMessages(workerId, periodYear, periodMonth);
            setMessages(data);

            // Marcar mensagens do gestor como lidas pelo trabalhador
            const unreadByWorker = data
                .filter(m => m.sender_type === 'gestor' && !m.read)
                .map(m => m.id);
            if (unreadByWorker.length > 0) {
                await markMessagesAsRead(unreadByWorker);
                if (onMessagesRead) onMessagesRead();
            }
        } catch (err) {
            console.error('Erro ao buscar mensagens no portal:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadMessages();
        }
    }, [open, workerId, periodYear, periodMonth]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim()) return;

        try {
            setSending(true);
            await sendWorkerMessage({
                workerId,
                year: periodYear,
                month: periodMonth,
                senderType: 'trabalhador',
                senderName: workerName,
                message: text.trim(),
                hourRecordId
            });

            setText('');
            toast.success(isSpanish ? '¡Mensaje enviado al gestor!' : 'Mensagem enviada ao gestor!');
            await loadMessages();
        } catch (err) {
            toast.error(isSpanish ? 'Error al enviar mensaje.' : 'Erro ao enviar mensagem.');
        } finally {
            setSending(false);
        }
    };

    const handleTestPush = async () => {
        setTestingPush(true);
        const ok = await triggerLocalTestPush(
            'Portal MCS • Teste Push',
            isSpanish 
                ? '¡Excelente! Las notificaciones están funcionando correctamente en su dispositivo móvil.' 
                : 'Excelente! As notificações estão a funcionar perfeitamente no seu dispositivo.'
        );
        setTestingPush(false);
        if (ok) {
            toast.success(isSpanish ? 'Notificación enviada a la pantalla de su móvil!' : 'Notificação enviada para o ecrã do seu telemóvel!');
        } else {
            toast.info(isSpanish 
                ? 'Para ver la notificación, asegúrese de haber permitido avisos en el navegador o instalado la app.' 
                : 'Para ver a notificação, certifique-se de que permitiu avisos no navegador ou instalou o app.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[550px] w-[95vw] h-[82vh] max-h-[680px] p-0 flex flex-col overflow-hidden bg-white text-slate-900 rounded-3xl">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm text-white">
                                {isSpanish ? 'Mensajes y Notificaciones' : 'Mensagens e Notificações'}
                            </h3>
                            <p className="text-[11px] text-slate-300">
                                {isSpanish ? 'Comunicación directa con el Gestor de Horas' : 'Comunicação direta com o Gestor de Horas'}
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleTestPush}
                        disabled={testingPush}
                        className="h-7 text-[11px] font-bold border-white/20 bg-white/10 text-white hover:bg-white/20 gap-1 px-2.5 rounded-lg"
                        title={isSpanish ? 'Probar notificación en este móvil' : 'Testar notificação neste telemóvel'}
                    >
                        <Bell className="h-3 w-3 text-emerald-400 animate-pulse" />
                        <span>{isSpanish ? 'Testar Push' : 'Testar Push'}</span>
                    </Button>
                </div>

                {/* Histórico de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {loading && (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    )}

                    {!loading && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                            <div className="h-11 w-11 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs text-slate-700">
                                {isSpanish ? 'Sin mensajes por el momento' : 'Sem mensagens no momento'}
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-xs">
                                {isSpanish
                                    ? 'Cualquier aviso sobre sus horas aparecerá aquí y podrá responder directamente a la empresa.'
                                    : 'Qualquer aviso sobre as suas horas aparecerá aqui e poderá responder diretamente à empresa.'}
                            </p>
                        </div>
                    )}

                    {!loading && messages.map((msg) => {
                        const isWorker = msg.sender_type === 'trabalhador';
                        const dateFormatted = new Date(msg.created_at).toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isWorker ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[85%]`}
                            >
                                <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1 flex items-center gap-1">
                                    {isWorker ? (
                                        <>
                                            <span>{isSpanish ? 'Tú' : 'Você'}</span>
                                            <User className="h-2.5 w-2.5" />
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="h-2.5 w-2.5 text-blue-500" />
                                            <span>{msg.sender_name || 'Gestor (MCS)'}</span>
                                        </>
                                    )}
                                </span>

                                <div
                                    className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
                                        isWorker
                                            ? 'bg-emerald-600 text-white rounded-tr-none'
                                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                                    }`}
                                >
                                    {msg.message}
                                </div>

                                <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-slate-400">
                                    <Clock className="h-2 w-2" />
                                    <span>{dateFormatted}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Caixa de Resposta do Trabalhador */}
                <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
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
                            placeholder={isSpanish 
                                ? 'Escriba una respuesta o duda para el gestor...' 
                                : 'Escreva uma resposta ou dúvida para o gestor...'}
                            className="min-h-[70px] max-h-[120px] text-xs resize-none pr-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                        <Button
                            type="button"
                            onClick={handleSend}
                            disabled={sending || !text.trim()}
                            size="icon"
                            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            title={isSpanish ? 'Enviar respuesta' : 'Enviar resposta'}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{isSpanish ? 'Historial auditado y registrado con fecha y hora.' : 'Histórico auditado e registado com data e hora.'}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-6 text-xs text-slate-500 hover:text-slate-800"
                        >
                            {isSpanish ? 'Cerrar' : 'Fechar'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
