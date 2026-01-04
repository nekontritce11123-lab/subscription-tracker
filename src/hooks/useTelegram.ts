import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme: 'light' | 'dark';
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    setText: (text: string) => void;
    enable: () => void;
    disable: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      setIsReady(true);
    } else {
      // Development fallback
      setIsReady(true);
    }
  }, []);

  const hapticFeedback = {
    light: () => webApp?.HapticFeedback.impactOccurred('light'),
    medium: () => webApp?.HapticFeedback.impactOccurred('medium'),
    heavy: () => webApp?.HapticFeedback.impactOccurred('heavy'),
    success: () => webApp?.HapticFeedback.notificationOccurred('success'),
    error: () => webApp?.HapticFeedback.notificationOccurred('error'),
    warning: () => webApp?.HapticFeedback.notificationOccurred('warning'),
    selection: () => webApp?.HapticFeedback.selectionChanged(),
  };

  const getUserLanguage = (): 'ru' | 'en' => {
    const langCode = webApp?.initDataUnsafe.user?.language_code;
    if (langCode?.startsWith('ru')) return 'ru';
    return 'en';
  };

  const colorScheme = webApp?.colorScheme || 'light';

  const getInitData = (): string => {
    // Read directly from window to get initData before useEffect runs
    return window.Telegram?.WebApp?.initData || '';
  };

  const getStartParam = (): string | undefined => {
    return webApp?.initDataUnsafe.start_param;
  };

  return {
    webApp,
    isReady,
    user: webApp?.initDataUnsafe.user,
    colorScheme,
    hapticFeedback,
    getUserLanguage,
    getInitData,
    getStartParam,
  };
}
