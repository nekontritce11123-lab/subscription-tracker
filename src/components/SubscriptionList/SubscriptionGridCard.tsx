import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { getDaysUntil, isOverdue, isDueToday, getOverdueDays } from '../../hooks/useStats';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './SubscriptionGridCard.module.css';

interface SubscriptionGridCardProps {
  subscription: Subscription;
  isHighlighted?: boolean;
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

// Рассчитать сумму потраченного с момента первой оплаты
function calculateTotalSpent(subscription: Subscription): number {
  const { startDate, amount, periodMonths = 1, isTrial, billingDay } = subscription;

  if (isTrial) return 0;

  const start = new Date(startDate);
  const now = new Date();

  // Если дата старта в будущем — ещё ничего не потрачено
  if (start > now) return 0;

  // Считаем количество месяцев с момента старта
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  // Проверяем, прошёл ли уже день оплаты в текущем месяце
  const effectiveBillingDay = billingDay || start.getDate();
  const billingDayPassed = now.getDate() >= effectiveBillingDay;

  // Количество полных периодов
  const fullPeriods = Math.floor(monthsDiff / periodMonths);

  // Добавляем текущий период только если день оплаты уже прошёл
  const payments = billingDayPassed ? fullPeriods + 1 : Math.max(1, fullPeriods);

  return payments * amount;
}

export function SubscriptionGridCard({ subscription, isHighlighted, onTap, onLongPress }: SubscriptionGridCardProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const longPressTimer = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const daysLeft = getDaysUntil(subscription.billingDay, subscription.startDate);
  const overdueDays = getOverdueDays(subscription.billingDay);
  const status = getPaymentStatus(subscription);
  const statusText = getStatusText(status, daysLeft, overdueDays, t);
  const totalSpent = calculateTotalSpent(subscription);

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
    isHighlighted && styles.highlighted,
  ].filter(Boolean).join(' ');

  // Используем emoji если есть, иначе icon
  const displayIcon = subscription.emoji || subscription.icon;

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {status === 'trial' && <span className={styles.freeBadge}>FREE</span>}

      {/* Верх: иконка + название */}
      <div className={styles.header}>
        <div className={styles.iconWrapper} style={{ backgroundColor: subscription.color }}>
          <span className={styles.icon}>{displayIcon}</span>
        </div>
        <span className={styles.name}>{subscription.name}</span>
      </div>

      {/* Центр: цена + потрачено */}
      <div className={styles.priceBlock}>
        <span className={styles.price}>
          {subscription.amount.toLocaleString('ru-RU')} {t('currency')}
        </span>
        {totalSpent > 0 && (
          <span className={styles.totalSpent}>
            ~{totalSpent.toLocaleString('ru-RU')} {t('currency')}
          </span>
        )}
      </div>

      {/* Низ: статус */}
      <span className={styles.status}>{statusText}</span>
    </div>
  );
}

// Export helper for App.tsx to determine if payment sheet should open
export { getPaymentStatus };
