import { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { setLanguage as persistLanguage } from '@frontend/i18n';
import enTranslations from '@frontend/i18n/locales/en.json';
import viTranslations from '@frontend/i18n/locales/vi.json';

const LanguageContext = createContext(undefined);

const AVAILABLE_LANGUAGES = Object.freeze({
    en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
    },
    vi: {
        code: 'vi',
        name: 'Vietnamese',
        nativeName: 'Tiếng Việt',
    },
});

const TRANSLATIONS_BY_LANGUAGE = Object.freeze({
    en: enTranslations,
    vi: viTranslations,
});

function normalizeLanguage(language) {
    return String(language || 'vi').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const value = useMemo(() => ({
    currentLanguage,
    translations: TRANSLATIONS_BY_LANGUAGE[currentLanguage] || enTranslations,
    setLanguage: async (language) => persistLanguage(normalizeLanguage(language)),
    isTranslating: false,
    availableLanguages: AVAILABLE_LANGUAGES,
    forceUpdateKey: currentLanguage,
  }), [currentLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
