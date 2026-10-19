import React, { useState } from 'react';
import { BookOpen, PlayCircle, X, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type GuideLang = 'pt' | 'es' | 'fr' | 'nl' | 'en';
export type VideoLang = 'es' | 'pt' | 'fr' | 'en';

const GUIDE_LABELS: Record<GuideLang, {
    button: string;
    videoBtn: string;
    subtitle: string;
    chooseLang: string;
    modalTitle: string;
    downloadMp4: string;
    openFullGuide: string;
}> = {
    pt: {
        button: '📖 Ver Guia de Como Usar',
        videoBtn: '🎬 Assistir Vídeo (1 min)',
        subtitle: 'Vídeo narrado + Passo a passo ilustrado',
        chooseLang: 'Idioma:',
        modalTitle: '🎬 Vídeo Tutorial — Como Usar o Portal',
        downloadMp4: '⬇️ Baixar Vídeo (.MP4)',
        openFullGuide: '📖 Abrir Guia Ilustrado (PDF)'
    },
    es: {
        button: '📖 Ver Guía de Cómo Usar',
        videoBtn: '🎬 Ver Vídeo (1 min)',
        subtitle: 'Vídeo narrado + Paso a paso ilustrado',
        chooseLang: 'Idioma:',
        modalTitle: '🎬 Vídeo Tutorial — Cómo Usar el Portal',
        downloadMp4: '⬇️ Descargar Vídeo (.MP4)',
        openFullGuide: '📖 Abrir Guía Ilustrada (PDF)'
    },
    fr: {
        button: "📖 Voir le Guide d'Utilisation",
        videoBtn: '🎬 Voir la Vidéo (1 min)',
        subtitle: 'Vidéo narrée + Guide illustré étape par étape',
        chooseLang: 'Langue :',
        modalTitle: '🎬 Vidéo Tutoriel — Comment Utiliser le Portail',
        downloadMp4: '⬇️ Télécharger la Vidéo (.MP4)',
        openFullGuide: '📖 Ouvrir le Guide Illustré (PDF)'
    },
    nl: {
        button: '📖 Gebruikersgids Bekijken',
        videoBtn: '🎬 Bekijk Video (1 min)',
        subtitle: 'Video + Geïllustreerde handleiding',
        chooseLang: 'Taal:',
        modalTitle: '🎬 Video Tutorial — Hoe het Portaal te Gebruiken',
        downloadMp4: '⬇️ Video Downloaden (.MP4)',
        openFullGuide: '📖 Geïllustreerde Gids Openen (PDF)'
    },
    en: {
        button: '📖 View How-To Guide',
        videoBtn: '🎬 Watch Video (1 min)',
        subtitle: 'Narrated video + Illustrated step-by-step guide',
        chooseLang: 'Language:',
        modalTitle: '🎬 Video Tutorial — How to Use the Portal',
        downloadMp4: '⬇️ Download Video (.MP4)',
        openFullGuide: '📖 Open Illustrated Guide (PDF)'
    }
};

const LANGUAGES: Array<{ code: GuideLang; flag: string; short: string; name: string }> = [
    { code: 'es', flag: '🇪🇸', short: 'ES', name: 'Español' },
    { code: 'pt', flag: '🇵🇹', short: 'PT', name: 'Português' },
    { code: 'fr', flag: '🇫🇷', short: 'FR', name: 'Français' },
    { code: 'en', flag: '🇬🇧', short: 'EN', name: 'English' },
    { code: 'nl', flag: '🇳🇱', short: 'NL', name: 'Nederlands' }
];

const VIDEO_LANGUAGES: Array<{ code: VideoLang; flag: string; label: string }> = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'pt', flag: '🇵🇹', label: 'Português' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' }
];

export function getActiveGuideLang(i18nLang?: string): GuideLang {
    const raw = (i18nLang || 'pt').toLowerCase();
    if (raw.startsWith('es')) return 'es';
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('nl')) return 'nl';
    if (raw.startsWith('en')) return 'en';
    return 'pt';
}

export function getActiveVideoLang(lang: GuideLang): VideoLang {
    if (lang === 'es' || lang === 'fr' || lang === 'en') return lang;
    if (lang === 'nl') return 'en';
    return 'pt';
}

export function openTrainingGuide(lang: GuideLang, scrollToVideo = false) {
    const url = `/treinamento-portal-trabalhador.html?lang=${lang}${scrollToVideo ? '&video=1' : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

interface HowToUseGuideButtonProps {
    variant?: 'header' | 'login' | 'card';
}

export const HowToUseGuideButton: React.FC<HowToUseGuideButtonProps> = ({ variant = 'card' }) => {
    const { i18n } = useTranslation();
    const activeLang = getActiveGuideLang(i18n.language);
    const copy = GUIDE_LABELS[activeLang] || GUIDE_LABELS.pt;

    const [showVideoModal, setShowVideoModal] = useState(false);
    const [videoLang, setVideoLang] = useState<VideoLang>(() => getActiveVideoLang(activeLang));

    const openVideo = (l?: GuideLang) => {
        setVideoLang(getActiveVideoLang(l || activeLang));
        setShowVideoModal(true);
    };

    const videoModal = showVideoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-4 sm:p-5 text-white shadow-2xl space-y-3 max-h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <h3 className="text-xs sm:text-sm font-black text-emerald-300 truncate">
                        {copy.modalTitle}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowVideoModal(false)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Seletor de Idioma do Vídeo */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    {VIDEO_LANGUAGES.map((vl) => (
                        <button
                            key={vl.code}
                            type="button"
                            onClick={() => setVideoLang(vl.code)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                                videoLang === vl.code
                                    ? 'bg-emerald-500 text-slate-950 shadow'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            {vl.flag} {vl.code.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Player Vertical 9:16 */}
                <div className="w-full max-w-[270px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-700 bg-black shadow-xl">
                    <video
                        key={videoLang}
                        src={`/videos/tutorial-${videoLang}.mp4`}
                        controls
                        autoPlay
                        playsInline
                        className="w-full aspect-[9/16] bg-black"
                    />
                </div>

                {/* Ações Inferiores: Download MP4 + Guia Completo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                        href={`/videos/tutorial-${videoLang}.mp4`}
                        download={`Tutorial-Portal-MCS-${videoLang.toUpperCase()}.mp4`}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{copy.downloadMp4}</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            setShowVideoModal(false);
                            openTrainingGuide(activeLang);
                        }}
                        className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                        <span>{copy.openFullGuide}</span>
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    if (variant === 'header') {
        return (
            <>
                <div className="inline-flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => openVideo(activeLang)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-2xs cursor-pointer"
                        title={copy.videoBtn}
                    >
                        <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">{copy.videoBtn.replace('🎬 ', '')}</span>
                        <span className="sm:hidden">🎬 Vídeo</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => openTrainingGuide(activeLang)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        title={copy.button}
                    >
                        <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="hidden md:inline">{copy.button.replace('📖 ', '')}</span>
                        <span className="md:hidden">📖 Guia</span>
                    </button>
                </div>
                {videoModal}
            </>
        );
    }

    if (variant === 'login') {
        return (
            <>
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-center">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <button
                            type="button"
                            onClick={() => openVideo(activeLang)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                            <span>{copy.videoBtn}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openTrainingGuide(activeLang)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                            <span>{copy.button}</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {LANGUAGES.map((l) => (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => openVideo(l.code)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                    activeLang === l.code
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                title={`${copy.videoBtn} (${l.name})`}
                            >
                                {l.flag} {l.short}
                            </button>
                        ))}
                    </div>
                </div>
                {videoModal}
            </>
        );
    }

    // Variant 'card' (Para o Dashboard Principal do Trabalhador)
    return (
        <>
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                            <PlayCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                                {copy.button}
                            </h4>
                            <p className="text-[11px] text-slate-300 truncate mt-0.5">
                                {copy.subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => openVideo(activeLang)}
                            className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 shadow-xs transition-all cursor-pointer"
                        >
                            {copy.videoBtn}
                        </button>
                        <button
                            type="button"
                            onClick={() => openTrainingGuide(activeLang)}
                            className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 border border-white/15 transition-all cursor-pointer"
                        >
                            📖 PDF
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400">
                        {copy.chooseLang}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {LANGUAGES.map((l) => (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => openVideo(l.code)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    activeLang === l.code
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                                }`}
                                title={l.name}
                            >
                                {l.flag} {l.short}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {videoModal}
        </>
    );
};

