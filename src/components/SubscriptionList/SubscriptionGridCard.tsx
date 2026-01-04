import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { getDaysUntil } from '../../hooks/useStats';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './SubscriptionGridCard.module.css';

interface SubscriptionGridCardProps {
  subscription: Subscription;
  onTap: () => void;
  onLongPress: () => void;
}

type StatusType = 'urgent' | 'trial' | 'normal';

function getStatus(daysLeft: number, isTrial: boolean): StatusType {
  if (isTrial) return 'trial';
  if (daysLeft <= 1) return 'urgent';
  return 'normal';
}

function getStatusText(daysLeft: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (daysLeft === 0) return t('card.billingToday');
  if (daysLeft === 1) return t('card.billingTomorrow');
  return t('card.billingIn', { count: daysLeft });
}

export function SubscriptionGridCard({ subscription, onTap, onLongPress }: SubscriptionGridCardProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const daysLeft = getDaysUntil(subscription.billingDay);
  const status = getStatus(daysLeft, subscription.isTrial || false);
  const statusText = getStatusText(daysLeft, t);

  const handleTouchStart = () => {
    isLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
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
    if (!isLongPress.current) {
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
