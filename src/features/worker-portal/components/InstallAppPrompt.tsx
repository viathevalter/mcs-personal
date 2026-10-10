import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2, ChevronRight, Apple } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';

export function InstallAppPrompt() {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');

    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // 1. Verificar se já está rodando em modo standalone (como app instalado)
        const checkStandalone = () => {
            const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isNavigatorStandalone = (window.navigator as any).standalone === true;
            return isDisplayStandalone || isNavigatorStandalone;
        };

        if (checkStandalone()) {
            setIsStandalone(true);
            return;
        }

        // Verificar se usuário já dispensou nesta sessão
        if (sessionStorage.getItem('pwa_prompt_dismissed') === '1') {
            setDismissed(true);
            return;
        }

        // 2. Detectar Sistema Operacional
        const userAgent = window.navigator.userAgent || '';
        const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroidDevice = /Android/i.test(userAgent);

        setIsIOS(isAppleDevice);
        setIsAndroid(isAndroidDevice);

        // 3. Capturar evento de instalação do Android / Chrome
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Evento quando o app for instalado com sucesso
        const handleAppInstalled = () => {
            setIsStandalone(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Se já estiver como app instalado ou o usuário dispensou, não renderiza
    if (isStandalone || dismissed) {
        return null;
    }

    // Handler para disparar a instalação no Android / Chrome
    const handleInstallAndroid = async () => {
        if (!deferredPrompt) {
            setShowGuide(true);
            return;
        }
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsStandalone(true);
            }
            setDeferredPrompt(null);
        } catch (err) {
            console.error('Erro ao acionar instalador:', err);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('pwa_prompt_dismissed', '1');
    };

    return (
        <div className="w-full my-3">
            {/* Banner Chamativo Principal */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-slate-950/90 border border-emerald-500/40 p-4 shadow-xl backdrop-blur-md text-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
                            {isIOS ? <Apple className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black tracking-tight text-white">
                                    {isSpanish ? 'Instalar App no Celular' : 'Instalar App no Telemóvel'}
                                </h3>
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                                    {isIOS ? 'iPhone (iOS)' : isAndroid ? 'Android' : 'PWA'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                                {isSpanish
                                    ? 'Abra directamente desde la pantalla de inicio sin usar el navegador.'
                                    : 'Abra direto do ecrã principal sem depender do navegador web.'}
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

                {/* Botões de Ação */}
                <div className="mt-3 flex items-center gap-2">
                    {isIOS ? (
                        <Button
                            type="button"
                            onClick={() => setShowGuide(true)}
                            className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                            <Share2 className="h-4 w-4" />
                            <span>{isSpanish ? 'Ver cómo instalar en iPhone' : 'Como instalar no iPhone'}</span>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleInstallAndroid}
                            className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                            <Download className="h-4 w-4" />
                            <span>{isSpanish ? 'Instalar Aplicación' : 'Instalar Aplicativo'}</span>
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDismiss}
                        className="h-9 px-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold"
                    >
                        {isSpanish ? 'Más tarde' : 'Mais tarde'}
                    </Button>
                </div>
            </div>

            {/* Modal / Guia de Instalação para iPhone (iOS Safari) */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-5 text-white shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Apple className="h-5 w-5 text-emerald-400" />
                                <h4 className="font-bold text-base">
                                    {isSpanish ? 'Cómo instalar en iPhone (Safari)' : 'Como instalar no iPhone (Safari)'}
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 py-1 text-xs">
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                <div className="h-7 w-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black">
                                    1
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                        <span>{isSpanish ? 'Toque el botón Compartir' : 'Toque no botão Partilhar'}</span>
                                        <Share2 className="h-3.5 w-3.5 text-blue-400" />
                                    </p>
                                    <p className="text-slate-400 leading-relaxed">
                                        {isSpanish
                                            ? 'En la barra inferior de Safari, toque el icono de compartir (el cuadrado con la flecha hacia arriba).'
                                            : 'Na barra inferior do Safari, toque no ícone de partilha (o quadrado com a seta a apontar para cima).'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black">
                                    2
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                        <span>{isSpanish ? 'Seleccione "Añadir a inicio"' : 'Selecione "Ecrã Principal"'}</span>
                                        <PlusSquare className="h-3.5 w-3.5 text-emerald-400" />
                                    </p>
                                    <p className="text-slate-400 leading-relaxed">
                                        {isSpanish
                                            ? 'Deslice hacia abajo y seleccione la opción "Añadir a la pantalla de inicio".'
                                            : 'Deslize para baixo e escolha a opção "Adicionar ao Ecrã Principal" (ou "Tela de Início").'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black">
                                    3
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                        <span>{isSpanish ? 'Abra la App y disfrute' : 'Abra o App e ative avisos'}</span>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                                    </p>
                                    <p className="text-slate-400 leading-relaxed">
                                        {isSpanish
                                            ? 'Toque en "Añadir". El icono de MCS aparecerá entre sus aplicaciones móviles para abrirlo directamente.'
                                            : 'Toque em "Adicionar". O ícone da MCS aparecerá no seu telefone para aceder direto e receber notificações.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={() => setShowGuide(false)}
                            className="w-full h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                            {isSpanish ? '¡Entendido!' : 'Compreendi!'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
