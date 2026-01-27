import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { Button, DatePicker } from '../UI';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './PaymentContent.module.css';

interface PaymentContentProps {
  subscription: Subscription;
  overdueDays: number;
  isDueToday: boolean;
  onPaidOnDate: (date: Date) => void;
  onCancel: () => void;
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getBillingDateString(billingDay: number): string {
  const today = new Date();
  // Если billingDay > сегодня, значит это прошлый месяц
  if (billingDay > today.getDate()) {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
    const yyyy = lastMonth.getFullYear();
    const mm = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(billingDay).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Иначе это текущий месяц
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(billingDay).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMinDate(): Date {
  const today = new Date();
  // Разрешаем выбор дат за последние 60 дней
  return new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
}

export function PaymentContent({
  subscription,
  overdueDays,
  isDueToday,
  onPaidOnDate,
  onCancel,
}: PaymentContentProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  // По умолчанию выбран день оплаты (не сегодня)
  const [selectedDate, setSelectedDate] = useState(() =>
    isDueToday ? getTodayString() : getBillingDateString(subscription.billingDay)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const minDate = getMinDate();

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleConfirm = () => {
    if (isSubmitting) return; // Prevent double click
    setIsSubmitting(true);

    hapticFeedback.success();
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    onPaidOnDate(date);
  };

  const handleCancel = () => {
    hapticFeedback.warning();
    onCancel();
  };

  // Status text
  const statusText = isDueToday
    ? t('payment.dueToday')
    : t('payment.overdue', { count: overdueDays });

  return (
    <div className={styles.form}>
      {/* Header row with icon, name and status */}
      <div className={styles.headerRow}>
        <div className={styles.iconWrapper} style={{ backgroundColor: subscription.color }}>
          <span className={styles.icon}>{subscription.icon}</span>
        </div>
        <div className={styles.info}>
          <span className={styles.name}>{subscription.name}</span>
          <span className={styles.status}>{statusText}</span>
        </div>
        <span className={styles.amount}>
          {subscription.amount.toLocaleString('ru-RU')} {t('currency')}
        </span>
      </div>

      {/* Date picker section */}
      <div className={styles.dateSection}>
        <span className={styles.dateLabel}>{t('payment.whenPaid')}</span>
        <DatePicker
          value={selectedDate}
          onChange={handleDateChange}
          minDate={minDate}
          maxDate={new Date()}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
          {t('payment.cancelled')}
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting}>
          {t('payment.confirm')}
        </Button>
      </div>
    </div>
  );
}
