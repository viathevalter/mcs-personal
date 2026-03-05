import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptTranslation from './locales/pt.json';
import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

const resources = {
    pt: {
        translation: ptTranslation,
    },
    es: {
        translation: esTranslation,
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
        fallbackLng: 'pt', // fallback to Portuguese
        supportedLngs: ['pt', 'es', 'en'],
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        detection: {
            order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage', 'cookie'],
        }
    });

export default i18n;
