import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription, Currency } from '../../types/subscription';
import { useTelegram } from '../../hooks/useTelegram';
import { useStatsByCurrency } from '../../hooks/useStats';
import { getCurrencySymbol } from '../../utils/currency';
import styles from './TopBar.module.css';

interface TopBarProps {
  subscriptions: Subscription[];
}

// Order of currencies for display
const CURRENCY_ORDER: Currency[] = ['RUB', 'USD', 'EUR', 'UAH', 'BYN'];
const MAX_DISPLAYED_CURRENCIES = 3;

// Format number with K/M suffixes for compact display
const formatCompact = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'м';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(0) + 'к';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'к';
  }
  return Math.round(num).toLocaleString('ru-RU');
};

// Load selected currencies from localStorage
const loadSelectedCurrencies = (): Currency[] => {
  try {
    const saved = localStorage.getItem('selectedCurrencies');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return [];
};

// Save selected currencies to localStorage
const saveSelectedCurrencies = (currencies: Currency[]) => {
  try {
    localStorage.setItem('selectedCurrencies', JSON.stringify(currencies));
  } catch {}
};

export function TopBar({ subscriptions }: TopBarProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Currency[]>(loadSelectedCurrencies);

  const statsByCurrency = useStatsByCurrency(subscriptions);

  // Get currencies that have subscriptions, in order
  const activeCurrencies = CURRENCY_ORDER.filter(c => statsByCurrency[c]);

  // Filter selected currencies to only those that are active (have subscriptions)
  const displayedCurrencies = selectedCurrencies.filter(c => activeCurrencies.includes(c));

  // If no currencies selected yet, auto-select first available (up to 2)
  useEffect(() => {
    if (displayedCurrencies.length === 0 && activeCurrencies.length > 0) {
      const initial = activeCurrencies.slice(0, MAX_DISPLAYED_CURRENCIES);
      setSelectedCurrencies(initial);
      saveSelectedCurrencies(initial);
    }
  }, [activeCurrencies, displayedCurrencies.length]);

  const toggleCurrency = (currency: Currency) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(currency)) {
        // Can't remove if it's the last one
        if (prev.length <= 1) {
          return prev;
        }
        // Remove currency
        hapticFeedback.light();
        const newSelected = prev.filter(c => c !== currency);
        saveSelectedCurrencies(newSelected);
        return newSelected;
      } else {
        // Add currency (max 2)
        if (prev.length >= MAX_DISPLAYED_CURRENCIES) {
          // Already at max - can't add more
          hapticFeedback.error();
          return prev;
        }
        hapticFeedback.light();
        const newSelected = [...prev, currency];
        saveSelectedCurrencies(newSelected);
        return newSelected;
      }
    });
  };


  const closePopup = useCallback(() => {
    if (isVisible && !isClosing) {
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 150);
    }
  }, [isVisible, isClosing]);

  const handleTotalClick = () => {
    hapticFeedback.light();
    if (isVisible) {
      closePopup();
    } else {
      setIsVisible(true);
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`.${styles.statsPopup}`) || target.closest(`.${styles.totalButton}`)) {
        return;
      }
      closePopup();
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isVisible, closePopup]);

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <span className={styles.company}>FactChain</span>
        <span className={styles.divider}>/</span>
        <span className={styles.productName}>Tracker</span>
      </div>
      <button className={styles.totalButton} onClick={handleTotalClick}>
        {displayedCurrencies.length > 0 ? (
          displayedCurrencies.map((currency, index) => {
            const stats = statsByCurrency[currency];
            if (!stats) return null;
            return (
              <span key={currency} className={styles.currencyItem}>
                {index > 0 && <span className={styles.currencySep}>·</span>}
                <span className={styles.totalAmount}>
                  {formatCompact(stats.monthlyTotal)}
                </span>
                <span className={styles.totalSymbol}>{getCurrencySymbol(currency)}</span>
              </span>
            );
          })
        ) : (
          <span className={styles.totalAmount}>0 ₽</span>
        )}
      </button>

      {/* Stats popup */}
      {isVisible && (
        <div className={`${styles.statsPopup} ${isClosing ? styles.closing : ''}`}>
          <div className={styles.statsArrow} />

          {/* Stats for each currency */}
          {activeCurrencies.map((currency, index) => {
            const stats = statsByCurrency[currency];
            if (!stats) return null;
            const symbol = getCurrencySymbol(currency);
            const isSelected = selectedCurrencies.includes(currency);
            const canSelect = isSelected || selectedCurrencies.length < MAX_DISPLAYED_CURRENCIES;

            return (
              <div key={currency}>
                {index > 0 && <div className={styles.statsDivider} />}
                <div
                  className={`${styles.currencyBlock} ${isSelected ? styles.currencyBlockSelected : ''} ${!canSelect ? styles.currencyBlockDisabled : ''}`}
                  onClick={() => toggleCurrency(currency)}
                >
                  <div className={styles.statsRow}>
                    <span className={styles.statsLabel}>{t('stats.totalSpent')}</span>
                    <span className={styles.statsValuePrimary}>
                      {Math.round(stats.totalSpent).toLocaleString('ru-RU')} {symbol}
                    </span>
                  </div>
                  <div className={styles.statsRowCompact}>
                    <span>{t('stats.perDay')}: {Math.round(stats.avgPerDay).toLocaleString('ru-RU')} {symbol}</span>
                    <span>{t('stats.monthly')}: {Math.round(stats.monthlyTotal).toLocaleString('ru-RU')} {symbol}</span>
                    <span>{t('stats.yearly')}: {Math.round(stats.yearlyProjection).toLocaleString('ru-RU')} {symbol}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
