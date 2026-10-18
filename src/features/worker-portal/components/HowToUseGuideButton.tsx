import React from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type GuideLang = 'pt' | 'es' | 'fr' | 'nl' | 'en';

const GUIDE_LABELS: Record<GuideLang, {
    button: string;
    subtitle: string;
    chooseLang: string;
}> = {
    pt: {
        button: '📖 Ver Guia de Como Usar',
        subtitle: 'Passo a passo ilustrado em PDF e telemóvel',
        chooseLang: 'Abrir no idioma:'
    },
    es: {
        button: '📖 Ver Guía de Cómo Usar',
        subtitle: 'Paso a paso ilustrado en PDF y móvil',
        chooseLang: 'Abrir en idioma:'
    },
    fr: {
        button: "📖 Voir le Guide d'Utilisation",
        subtitle: 'Guide illustré étape par étape (PDF & mobile)',
        chooseLang: 'Ouvrir en :'
    },
    nl: {
        button: '📖 Gebruikersgids Bekijken',
        subtitle: 'Geïllustreerde stapsgewijze handleiding (PDF & mobiel)',
        chooseLang: 'Openen in:'
    },
    en: {
        button: '📖 View How-To Guide',
        subtitle: 'Illustrated step-by-step manual (PDF & mobile)',
        chooseLang: 'Open in:'
    }
};

const LANGUAGES: Array<{ code: GuideLang; flag: string; short: string; name: string }> = [
    { code: 'pt', flag: '🇵🇹', short: 'PT', name: 'Português' },
    { code: 'es', flag: '🇪🇸', short: 'ES', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', short: 'FR', name: 'Français' },
    { code: 'nl', flag: '🇳🇱', short: 'NL', name: 'Nederlands' },
    { code: 'en', flag: '🇬🇧', short: 'EN', name: 'English' }
];

export function getActiveGuideLang(i18nLang?: string): GuideLang {
    const raw = (i18nLang || 'pt').toLowerCase();
    if (raw.startsWith('es')) return 'es';
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('nl')) return 'nl';
    if (raw.startsWith('en')) return 'en';
    return 'pt';
}

export function openTrainingGuide(lang: GuideLang) {
    const url = `/treinamento-portal-trabalhador.html?lang=${lang}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

interface HowToUseGuideButtonProps {
    variant?: 'header' | 'login' | 'card';
}

export const HowToUseGuideButton: React.FC<HowToUseGuideButtonProps> = ({ variant = 'card' }) => {
    const { i18n } = useTranslation();
    const activeLang = getActiveGuideLang(i18n.language);
    const copy = GUIDE_LABELS[activeLang] || GUIDE_LABELS.pt;

    if (variant === 'header') {
        return (
            <button
                type="button"
                onClick={() => openTrainingGuide(activeLang)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                title={copy.button}
            >
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">{copy.button.replace('📖 ', '')}</span>
                <span className="md:hidden">📖 Guia</span>
            </button>
        );
    }

    if (variant === 'login') {
        return (
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-center">
                <button
                    type="button"
                    onClick={() => openTrainingGuide(activeLang)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                    <span>{copy.button}</span>
                </button>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                    {LANGUAGES.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => openTrainingGuide(l.code)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                activeLang === l.code
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={`${copy.button} (${l.name})`}
                        >
                            {l.flag} {l.short}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Variant 'card' (Para o Dashboard Principal do Trabalhador)
    return (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5" />
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

                <button
                    type="button"
                    onClick={() => openTrainingGuide(activeLang)}
                    className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 shadow-xs transition-all cursor-pointer"
                >
                    {activeLang === 'es'
                        ? 'Abrir Guía'
                        : activeLang === 'fr'
                        ? 'Ouvrir'
                        : activeLang === 'nl'
                        ? 'Openen'
                        : activeLang === 'en'
                        ? 'Open Guide'
                        : 'Abrir Guia'}
                </button>
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
                            onClick={() => openTrainingGuide(l.code)}
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
    );
};
