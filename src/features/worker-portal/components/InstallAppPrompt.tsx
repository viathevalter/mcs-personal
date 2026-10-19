import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2, Apple, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';

type LangCode = 'pt' | 'es' | 'fr' | 'nl' | 'en';

const COPY: Record<LangCode, {
    bannerTitle: string;
    bannerDesc: string;
    close: string;
    btnIos: string;
    btnAndroid: string;
    howToBtn: string;
    later: string;
    modalTitleIos: string;
    modalTitleAndroid: string;
    tabAndroid: string;
    tabIos: string;
    iosStep1Title: string;
    iosStep1Desc: string;
    iosStep2Title: string;
    iosStep2Desc: string;
    iosStep3Title: string;
    iosStep3Desc: string;
    andStep1Title: string;
    andStep1Desc: string;
    andStep2Title: string;
    andStep2Desc: string;
    andStep3Title: string;
    andStep3Desc: string;
    understood: string;
}> = {
    pt: {
        bannerTitle: 'Instalar App no Telemóvel / Celular',
        bannerDesc: 'Abra direto da tela inicial (Android ou iPhone) e receba notificações.',
        close: 'Fechar',
        btnIos: 'Como instalar no iPhone',
        btnAndroid: 'Instalar Aplicativo',
        howToBtn: 'Android / iPhone',
        later: 'Mais tarde',
        modalTitleIos: 'Como instalar no iPhone (Safari)',
        modalTitleAndroid: 'Como instalar no Android (Chrome)',
        tabAndroid: '🤖 Android (Chrome)',
        tabIos: '🍎 iPhone (Safari)',
        iosStep1Title: 'Toque no botão Partilhar / Compartilhar',
        iosStep1Desc: 'Abra no navegador Safari e, na barra inferior, toque no ícone de partilha (o quadrado com a seta para cima).',
        iosStep2Title: 'Escolha "Adicionar à Tela de Início / Ecrã Principal"',
        iosStep2Desc: 'Deslize o menu para baixo e toque em "➕ Adicionar ao Ecrã Principal" (ou "Adicionar à Tela de Início").',
        iosStep3Title: 'Toque em "Adicionar" no topo direito',
        iosStep3Desc: 'Confirme tocando em "Adicionar". O ícone da MCS aparecerá junto aos seus aplicativos para abrir direto!',
        andStep1Title: 'Abra no Google Chrome e toque no menu (⋮)',
        andStep1Desc: 'Se a janela automática não abrir, toque nos 3 pontinhos (⋮) no canto superior direito do navegador Chrome.',
        andStep2Title: 'Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"',
        andStep2Desc: 'No menu que abrir, escolha a opção "📲 Instalar aplicativo" (ou "Adicionar à tela inicial").',
        andStep3Title: 'Confirme em "Instalar" e permita notificações',
        andStep3Desc: 'Toque em "Instalar". O aplicativo MCS ficará salvo na tela inicial do seu Android!',
        understood: 'Compreendi!',
    },
    es: {
        bannerTitle: 'Instalar App en el Móvil',
        bannerDesc: 'Abra directamente desde la pantalla de inicio (Android o iPhone) y reciba avisos.',
        close: 'Cerrar',
        btnIos: 'Cómo instalar en iPhone',
        btnAndroid: 'Instalar Aplicación',
        howToBtn: 'Android / iPhone',
        later: 'Más tarde',
        modalTitleIos: 'Cómo instalar en iPhone (Safari)',
        modalTitleAndroid: 'Cómo instalar en Android (Chrome)',
        tabAndroid: '🤖 Android (Chrome)',
        tabIos: '🍎 iPhone (Safari)',
        iosStep1Title: 'Toque el botón Compartir',
        iosStep1Desc: 'Abra en el navegador Safari y, en la barra inferior, toque el icono de compartir (el cuadrado con la flecha hacia arriba).',
        iosStep2Title: 'Seleccione "Añadir a la pantalla de inicio"',
        iosStep2Desc: 'Deslice hacia abajo en el menú y elija la opción "➕ Añadir a la pantalla de inicio".',
        iosStep3Title: 'Toque en "Añadir" arriba a la derecha',
        iosStep3Desc: 'Toque en "Añadir". El icono de MCS aparecerá entre sus aplicaciones móviles para abrirlo directamente.',
        andStep1Title: 'Abra en Google Chrome y toque el menú (⋮)',
        andStep1Desc: 'Si el aviso automático no aparece, toque los 3 puntos (⋮) en la esquina superior derecha de Chrome.',
        andStep2Title: 'Seleccione "Instalar aplicación" o "Añadir a inicio"',
        andStep2Desc: 'En el menú desplegable, toque la opción "📲 Instalar aplicación" (o "Añadir a pantalla de inicio").',
        andStep3Title: 'Confirme en "Instalar" y active notificaciones',
        andStep3Desc: 'Toque en "Instalar". ¡El icono de MCS quedará guardado en la pantalla principal de su Android!',
        understood: '¡Entendido!',
    },
    fr: {
        bannerTitle: 'Installer l\'App sur le Téléphone',
        bannerDesc: 'Ouvrez directement depuis l\'écran d\'accueil (Android ou iPhone) et recevez les alertes.',
        close: 'Fermer',
        btnIos: 'Comment installer sur iPhone',
        btnAndroid: 'Installer l\'Application',
        howToBtn: 'Android / iPhone',
        later: 'Plus tard',
        modalTitleIos: 'Comment installer sur iPhone (Safari)',
        modalTitleAndroid: 'Comment installer sur Android (Chrome)',
        tabAndroid: '🤖 Android (Chrome)',
        tabIos: '🍎 iPhone (Safari)',
        iosStep1Title: 'Appuyez sur le bouton Partager',
        iosStep1Desc: 'Ouvrez dans Safari et, dans la barre inférieure, appuyez sur l\'icône Partager (le carré avec une flèche vers le haut).',
        iosStep2Title: 'Sélectionnez "Sur l\'écran d\'accueil"',
        iosStep2Desc: 'Faites défiler vers le bas et choisissez l\'option "➕ Sur l\'écran d\'accueil".',
        iosStep3Title: 'Appuyez sur "Ajouter" en haut à droite',
        iosStep3Desc: 'Confirmez sur "Ajouter". L\'icône MCS apparaîtra sur l\'écran de votre iPhone.',
        andStep1Title: 'Ouvrez dans Google Chrome et appuyez sur le menu (⋮)',
        andStep1Desc: 'Si la fenêtre automatique ne s\'ouvre pas, appuyez sur les 3 points (⋮) en haut à droite de Chrome.',
        andStep2Title: 'Choisissez "Installer l\'application" ou "Ajouter à l\'écran"',
        andStep2Desc: 'Dans le menu, sélectionnez "📲 Installer l\'application" (ou "Ajouter à l\'écran d\'accueil").',
        andStep3Title: 'Confirmez sur "Installer"',
        andStep3Desc: 'Appuyez sur "Installer". L\'application MCS sera ajoutée à l\'écran d\'accueil de votre Android !',
        understood: 'Compris !',
    },
    nl: {
        bannerTitle: 'Installeer de App op uw Telefoon',
        bannerDesc: 'Open direct vanaf uw startscherm (Android of iPhone) en ontvang meldingen.',
        close: 'Sluiten',
        btnIos: 'Hoe te installeren op iPhone',
        btnAndroid: 'App Installeren',
        howToBtn: 'Android / iPhone',
        later: 'Later',
        modalTitleIos: 'Installeren op iPhone (Safari)',
        modalTitleAndroid: 'Installeren op Android (Chrome)',
        tabAndroid: '🤖 Android (Chrome)',
        tabIos: '🍎 iPhone (Safari)',
        iosStep1Title: 'Tik op de Deel-knop',
        iosStep1Desc: 'Open in Safari en tik onderaan op het deel-icoon (het vierkantje met het pijltje omhoog).',
        iosStep2Title: 'Kies "Zet op beginscherm"',
        iosStep2Desc: 'Scroll naar beneden in het menu en kies "➕ Zet op beginscherm".',
        iosStep3Title: 'Tik rechtsboven op "Voeg toe"',
        iosStep3Desc: 'Tik op "Voeg toe". Het MCS-icoon verschijnt direct tussen uw apps op de iPhone.',
        andStep1Title: 'Open in Google Chrome en tik op het menu (⋮)',
        andStep1Desc: 'Als de automatische melding niet verschijnt, tikt u rechtsboven in Chrome op de 3 puntjes (⋮).',
        andStep2Title: 'Kies "App installeren" of "Toevoegen aan startscherm"',
        andStep2Desc: 'Selecteer in het menu de optie "📲 App installeren" (of "Toevoegen aan startscherm").',
        andStep3Title: 'Bevestig met "Installeren"',
        andStep3Desc: 'Tik op "Installeren". De MCS-app staat nu op het startscherm van uw Android-telefoon!',
        understood: 'Begrepen!',
    },
    en: {
        bannerTitle: 'Install App on Your Phone',
        bannerDesc: 'Open directly from your home screen (Android or iPhone) and receive notifications.',
        close: 'Close',
        btnIos: 'How to install on iPhone',
        btnAndroid: 'Install App',
        howToBtn: 'Android / iPhone',
        later: 'Later',
        modalTitleIos: 'How to install on iPhone (Safari)',
        modalTitleAndroid: 'How to install on Android (Chrome)',
        tabAndroid: '🤖 Android (Chrome)',
        tabIos: '🍎 iPhone (Safari)',
        iosStep1Title: 'Tap the Share button',
        iosStep1Desc: 'Open in Safari and, in the bottom bar, tap the Share icon (the square with the upward arrow).',
        iosStep2Title: 'Select "Add to Home Screen"',
        iosStep2Desc: 'Scroll down the menu and tap "➕ Add to Home Screen".',
        iosStep3Title: 'Tap "Add" in the top-right corner',
        iosStep3Desc: 'Tap "Add". The MCS icon will appear on your iPhone home screen for instant access.',
        andStep1Title: 'Open in Google Chrome and tap the menu (⋮)',
        andStep1Desc: 'If the automatic prompt does not open, tap the 3 dots (⋮) in the top-right corner of Chrome.',
        andStep2Title: 'Tap "Install app" or "Add to Home screen"',
        andStep2Desc: 'In the dropdown menu, select "📲 Install app" (or "Add to Home screen").',
        andStep3Title: 'Confirm "Install" and allow notifications',
        andStep3Desc: 'Tap "Install". The MCS app icon will be placed directly on your Android home screen!',
        understood: 'Got it!',
    },
};

function resolveLang(raw?: string): LangCode {
    const code = (raw || 'pt').toLowerCase().slice(0, 2);
    if (code === 'es' || code === 'fr' || code === 'nl' || code === 'en') {
        return code;
    }
    return 'pt';
}

export function InstallAppPrompt() {
    const { i18n } = useTranslation();
    const lang = resolveLang(i18n.language);
    const c = COPY[lang];

    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [guideTab, setGuideTab] = useState<'android' | 'ios'>('android');
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
        setGuideTab(isAppleDevice ? 'ios' : 'android');

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
            setGuideTab('android');
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
                        <img 
                            src="/icon-192.png" 
                            alt="Portal MCS" 
                            className="h-12 w-12 rounded-2xl object-cover shadow-lg border border-white/20 shrink-0" 
                        />
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-black tracking-tight text-white">
                                    {c.bannerTitle}
                                </h3>
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                                    {isIOS ? 'iPhone (iOS)' : isAndroid ? 'Android' : 'Android / iPhone'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                                {c.bannerDesc}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title={c.close}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Botões de Ação */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {isIOS ? (
                        <Button
                            type="button"
                            onClick={() => {
                                setGuideTab('ios');
                                setShowGuide(true);
                            }}
                            className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                            <Share2 className="h-4 w-4" />
                            <span>{c.btnIos}</span>
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                onClick={handleInstallAndroid}
                                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                                <Download className="h-4 w-4" />
                                <span>{c.btnAndroid}</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setGuideTab('ios');
                                    setShowGuide(true);
                                }}
                                className="h-9 px-2.5 rounded-xl text-emerald-300 hover:text-white hover:bg-white/10 text-xs font-semibold border border-emerald-500/30"
                            >
                                🍎 iPhone
                            </Button>
                        </>
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDismiss}
                        className="h-9 px-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold"
                    >
                        {c.later}
                    </Button>
                </div>
            </div>

            {/* Modal / Guia de Instalação com Abas Android vs. iPhone */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-5 text-white shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                {guideTab === 'ios' ? (
                                    <Apple className="h-5 w-5 text-sky-400" />
                                ) : (
                                    <Smartphone className="h-5 w-5 text-emerald-400" />
                                )}
                                <h4 className="font-bold text-sm sm:text-base">
                                    {guideTab === 'ios' ? c.modalTitleIos : c.modalTitleAndroid}
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

                        {/* Seletor Android vs iPhone */}
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setGuideTab('android')}
                                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all ${
                                    guideTab === 'android'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {c.tabAndroid}
                            </button>
                            <button
                                type="button"
                                onClick={() => setGuideTab('ios')}
                                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all ${
                                    guideTab === 'ios'
                                        ? 'bg-sky-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {c.tabIos}
                            </button>
                        </div>

                        {guideTab === 'ios' ? (
                            <div className="space-y-3 py-1 text-xs">
                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-black">
                                        1
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <span>{c.iosStep1Title}</span>
                                            <Share2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.iosStep1Desc}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black">
                                        2
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <span>{c.iosStep2Title}</span>
                                            <PlusSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.iosStep2Desc}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black">
                                        3
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <img src="/icon-192.png" alt="Portal MCS" className="h-5 w-5 rounded-md object-cover inline-block" />
                                            <span>{c.iosStep3Title}</span>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.iosStep3Desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 py-1 text-xs">
                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black">
                                        1
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <span>{c.andStep1Title}</span>
                                            <MoreVertical className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.andStep1Desc}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-black">
                                        2
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <span>{c.andStep2Title}</span>
                                            <Download className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.andStep2Desc}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black">
                                        3
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                            <img src="/icon-192.png" alt="Portal MCS" className="h-5 w-5 rounded-md object-cover inline-block" />
                                            <span>{c.andStep3Title}</span>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                        </p>
                                        <p className="text-slate-400 leading-relaxed">
                                            {c.andStep3Desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            type="button"
                            onClick={() => setShowGuide(false)}
                            className="w-full h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                            {c.understood}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

