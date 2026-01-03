import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Stats } from '../../types/subscription';
import styles from './StatsSummary.module.css';

interface StatsSummaryProps {
  stats: Stats;
}

function useAnimatedValue(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    // Skip animation if target hasn't changed significantly
    if (Math.abs(prevTarget.current - target) < 1) {
      setValue(target);
      return;
    }

    prevTarget.current = target;
    const startValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutExpo
      const easeProgress = 1 - Math.pow(2, -10 * progress);
      const currentValue = Math.floor(startValue + (target - startValue) * easeProgress);

      setValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return num.toLocaleString('ru-RU');
  }
  if (num >= 1000) {
    return num.toLocaleString('ru-RU');
  }
  return num.toString();
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const { t } = useTranslation();

  const animatedMonthly = useAnimatedValue(stats.monthlyTotal);
  const animatedTotal = useAnimatedValue(stats.totalSpent);

  return (
    <header className={styles.header}>
      <div className={styles.mainStats}>
        <span className={styles.mainLabel}>{t('header.perMonth')}</span>
        <span className={styles.mainValue}>
          {formatNumber(animatedMonthly)}
          <span className={styles.currency}>{t('currency')}</span>
        </span>
      </div>

      <div className={styles.secondaryStats}>
        <span className={styles.secondaryLabel}>{t('header.totalSpent')}:</span>
        <span className={styles.secondaryValue}>
          {formatNumber(animatedTotal)} {t('currency')}
        </span>
      </div>

      {stats.subscriptionCount > 0 && (
        <div className={styles.subscriptionCount}>
          {stats.subscriptionCount}{' '}
          {t('header.subscriptions', { count: stats.subscriptionCount })}
        </div>
      )}
    </header>
  );
}
