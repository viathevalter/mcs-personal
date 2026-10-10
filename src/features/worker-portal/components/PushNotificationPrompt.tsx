import { useState, useEffect } from 'react';
import { Bell, BellRing, X, Check, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';

interface PushNotificationPromptProps {
    workerId?: string;
}

export function PushNotificationPrompt({ workerId }: PushNotificationPromptProps) {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');

    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [dismissed, setDismissed] = useState(false);
    const [activating, setActivating] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Verificar se o navegador suporta Notificações e Service Worker
        const hasSupport = 'Notification' in window && 'serviceWorker' in navigator;
        setSupported(hasSupport);

        if (hasSupport) {
            setPermission(Notification.permission);
        }

        if (sessionStorage.getItem('push_prompt_dismissed') === '1') {
            setDismissed(true);
        }
    }, []);

    // Não exibir se não for suportado, já estiver concedido ou foi dispensado nesta sessão
    if (!supported || permission === 'granted' || dismissed) {
        return null;
    }

    const handleEnableNotifications = async () => {
        try {
            setActivating(true);
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification('Portal MCS', {
                    body: isSpanish 
                        ? '¡Notificaciones activadas! Recibirá avisos y recordatorios de horas aquí.' 
                        : 'Notificações ativadas! Receberá avisos e lembretes de horas aqui.',
                    icon: '/logo_mcs_transparent.png',
                    badge: '/logo_mcs_transparent.png',
                    tag: 'mcs-welcome'
                });
                toast.success(isSpanish ? '¡Notificaciones activadas!' : 'Notificações ativadas com sucesso!');
            } else if (result === 'denied') {
                toast.info(isSpanish 
                    ? 'Para activar más tarde, acceda a los ajustes de su navegador.' 
                    : 'Para ativar mais tarde, aceda às definições do seu navegador.');
                setDismissed(true);
            }
        } catch (err) {
            console.error('Erro ao solicitar permissão de notificações:', err);
            toast.error(isSpanish ? 'No fue posible activar las notificaciones.' : 'Não foi possível ativar as notificações.');
        } finally {
            setActivating(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('push_prompt_dismissed', '1');
    };

    return (
        <div className="w-full my-2.5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-slate-900/90 border border-blue-500/40 p-3.5 shadow-lg backdrop-blur-md text-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0 text-blue-300 shadow-inner">
                            <BellRing className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black tracking-tight text-white">
                                    {isSpanish ? 'Activar Recordatorios de Horas' : 'Ativar Lembretes de Horas'}
                                </h4>
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40">
                                    Push
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                                {isSpanish
                                    ? 'Reciba avisos en su móvil sobre el cierre de horas y mensajes de la empresa.'
                                    : 'Receba avisos no seu telemóvel sobre o fecho da folha e mensagens da empresa.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title={isSpanish ? 'Cerrar' : 'Fechar'}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleEnableNotifications}
                        disabled={activating}
                        className="flex-1 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                        <Bell className="h-3.5 w-3.5" />
                        <span>{activating 
                            ? (isSpanish ? 'Activando...' : 'A ativar...') 
                            : (isSpanish ? 'Activar Notificaciones' : 'Ativar Notificações')}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDismiss}
                        className="h-8 px-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-medium"
                    >
                        {isSpanish ? 'Ahora no' : 'Agora não'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
