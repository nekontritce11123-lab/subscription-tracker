import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MonthData, Subscription } from '../../types/subscription';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './TopBar.module.css';

interface TopBarProps {
  data: MonthData;
  subscriptions: Subscription[];
}

interface Stats {
  totalSpent: number;
  yearlyProjection: number;
  avgPerDay: number;
  subscriptionCount: number;
  oldestSubscriptionMonths: number;
}

function calculateStats(subscriptions: Subscription[], monthlyTotal: number): Stats {
  let totalSpent = 0;
  let oldestMonths = 0;

  const now = new Date();

  for (const sub of subscriptions) {
    const { startDate, amount, periodMonths = 1, isTrial } = sub;

    if (isTrial) continue;

    const start = new Date(startDate);
    if (start > now) continue;

    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

    // Если день оплаты ещё не наступил в текущем месяце — не считать текущий период
    const billingDay = sub.billingDay || start.getDate();
    const billingDayPassed = now.getDate() >= billingDay;
    const fullPeriods = Math.floor(monthsDiff / periodMonths);
    const payments = billingDayPassed ? fullPeriods + 1 : Math.max(1, fullPeriods);

    console.log(`[Stats] ${sub.name}: monthsDiff=${monthsDiff}, billingDay=${billingDay}, today=${now.getDate()}, billingDayPassed=${billingDayPassed}, fullPeriods=${fullPeriods}, payments=${payments}`);
    totalSpent += payments * amount;

    if (monthsDiff > oldestMonths) {
      oldestMonths = monthsDiff;
    }
  }

  return {
    totalSpent,
    yearlyProjection: Math.round(monthlyTotal * 12),
    avgPerDay: Math.round(monthlyTotal / 30),
    subscriptionCount: subscriptions.length,
    oldestSubscriptionMonths: oldestMonths,
  };
}

export function TopBar({ data, subscriptions }: TopBarProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const monthlyTotal = Math.round(data.totalAmount);
  const stats = useMemo(() => calculateStats(subscriptions, monthlyTotal), [subscriptions, monthlyTotal]);

  const handleTotalClick = () => {
    hapticFeedback.light();
    if (isVisible) {
      // Закрытие с анимацией
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 150);
    } else {
      setIsVisible(true);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <span className={styles.company}>FactChain</span>
        <span className={styles.divider}>/</span>
        <span className={styles.productName}>Tracker</span>
      </div>
      <button className={styles.totalButton} onClick={handleTotalClick}>
        {monthlyTotal.toLocaleString('ru-RU')} {t('currency')}
      </button>

      {/* Stats popup */}
      {isVisible && (
        <div
          className={`${styles.statsPopup} ${isClosing ? styles.closing : ''}`}
          onClick={handleTotalClick}
        >
          <div className={styles.statsArrow} />

          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>{t('stats.totalSpent')}</span>
            <span className={styles.statsValuePrimary}>
              {stats.totalSpent.toLocaleString('ru-RU')} {t('currency')}
            </span>
          </div>

          <div className={styles.statsDivider} />

          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>{t('stats.perDay')}</span>
            <span className={styles.statsValue}>
              {stats.avgPerDay.toLocaleString('ru-RU')} {t('currency')}
            </span>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>{t('stats.monthly')}</span>
            <span className={styles.statsValue}>
              {monthlyTotal.toLocaleString('ru-RU')} {t('currency')}
            </span>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>{t('stats.yearly')}</span>
            <span className={styles.statsValue}>
              {stats.yearlyProjection.toLocaleString('ru-RU')} {t('currency')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
