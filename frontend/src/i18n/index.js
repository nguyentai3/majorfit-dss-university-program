import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';
const STORAGE_KEY = 'majorfit_language';
function getInitialLanguage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'vi' || saved === 'en')
            return saved;
    }
    catch {
    }
    return 'vi';
}
i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        vi: { translation: vi },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});
export function setLanguage(lang) {
    i18n.changeLanguage(lang);
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    }
    catch {
    }
}
export default i18n;
