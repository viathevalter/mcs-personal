import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptTranslation from './locales/pt.json';
import esTranslation from './locales/es.json';
import frTranslation from './locales/fr.json';
import enTranslation from './locales/en.json';

const resources = {
    pt: {
        translation: ptTranslation,
    },
    es: {
        translation: esTranslation,
    },
    fr: {
        translation: frTranslation,
    },
    en: {
        translation: enTranslation,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'es',
        supportedLngs: ['pt', 'es', 'fr', 'en'],
        load: 'languageOnly',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['queryString', 'localStorage', 'navigator', 'cookie', 'htmlTag'],
            lookupQuerystring: 'lang',
            caches: ['localStorage', 'cookie'],
        }
    });

export default i18n;
