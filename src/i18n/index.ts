import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';

// Get language from Telegram or browser
function getInitialLanguage(): string {
  // Try Telegram language
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang?.startsWith('ru')) return 'ru';
  if (tgLang) return 'en';

  // Fallback to browser language
  const browserLang = navigator.language;
  if (browserLang.startsWith('ru')) return 'ru';
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
