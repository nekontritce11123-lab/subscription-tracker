import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { getDaysUntil, isOverdue, isDueToday, getOverdueDays } from '../../hooks/useStats';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './SubscriptionGridCard.module.css';

interface SubscriptionGridCardProps {
  subscription: Subscription;
  onTap: () => void;
  onLongPress: () => void;
}

export type PaymentStatus = 'overdue' | 'dueToday' | 'urgent' | 'trial' | 'normal';

function getPaymentStatus(subscription: Subscription): PaymentStatus {
  const { billingDay, startDate, isTrial } = subscription;

  // Check overdue first (highest priority)
  if (isOverdue(billingDay, startDate)) return 'overdue';

  // Check if due today
  if (isDueToday(billingDay, startDate)) return 'dueToday';

  // Trial period
  if (isTrial) return 'trial';

  // Check urgent (1 day left)
  const daysLeft = getDaysUntil(billingDay, startDate);
  if (daysLeft <= 1) return 'urgent';

  return 'normal';
}

function getStatusText(
  status: PaymentStatus,
  daysLeft: number,
  overdueDays: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (status === 'overdue') {
    return t('card.overdue', { count: overdueDays });
  }
  if (status === 'dueToday') {
    return t('card.billingToday');
  }
  if (daysLeft === 1) return t('card.billingTomorrow');
  return t('card.billingIn', { count: daysLeft });
}

export function SubscriptionGridCard({ subscription, onTap, onLongPress }: SubscriptionGridCardProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const longPressTimer = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const daysLeft = getDaysUntil(subscription.billingDay, subscription.startDate);
  const overdueDays = getOverdueDays(subscription.billingDay);
  const status = getPaymentStatus(subscription);
  const statusText = getStatusText(status, daysLeft, overdueDays, t);

  const handleTouchStart = () => {
    isLongPressRef.current = false;
    longPressTimer.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      hapticFeedback.warning();
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (!isLongPressRef.current) {
      hapticFeedback.light();
      onTap();
    }
  };

  const cardClasses = [
    styles.card,
    styles[status],
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {status === 'trial' && <span className={styles.freeBadge}>FREE</span>}
      <div className={styles.iconWrapper} style={{ backgroundColor: subscription.color }}>
        <span className={styles.icon}>{subscription.icon}</span>
      </div>
      <span className={styles.name}>{subscription.name}</span>
      <span className={styles.status}>{statusText}</span>
      <span className={styles.price}>
        {subscription.amount.toLocaleString('ru-RU')} {t('currency')}
      </span>
    </div>
  );
}

// Export helper for App.tsx to determine if payment sheet should open
export { getPaymentStatus };
