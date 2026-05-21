
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Wrapper para manter a compatibilidade com os componentes do Operações
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  
  return {
    language: i18n.language,
    setLanguage: (lang: string) => i18n.changeLanguage(lang),
    t
  };
};
