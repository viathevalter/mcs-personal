import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type SupportedComercialLang = 'pt' | 'es' | 'fr' | 'en';

export function resolveComercialLang(rawLang?: string): SupportedComercialLang {
  const l = (rawLang || 'es').toLowerCase();
  if (l.startsWith('es')) return 'es';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('en')) return 'en';
  return 'pt';
}

export function useComercialLanguage() {
  const { i18n, t } = useTranslation();
  const lang = resolveComercialLang(i18n.resolvedLanguage || i18n.language);

  const tr = useCallback(
    (pt: string, es: string, fr?: string, en?: string): string => {
      if (lang === 'es') return es;
      if (lang === 'fr') return fr || es;
      if (lang === 'en') return en || es;
      return pt;
    },
    [lang]
  );

  return { lang, tr, t, i18n };
}
