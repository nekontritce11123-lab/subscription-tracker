import { useState, useRef, TouchEvent, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { getDaysUntil, calculateTotalPaid } from '../../hooks/useStats';
import { getCurrencySymbol } from '../../utils/currency';
import { IconBadge, DatePicker, Input, Button } from '../UI';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './SubscriptionCard.module.css';
import formStyles from './AddForm.module.css';

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (data: Omit<Subscription, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  index?: number;
}

function getStatusInfo(daysLeft: number, isTrial: boolean, t: (key: string, options?: Record<string, unknown>) => string): { emoji: string; text: string; className: string } {
  if (isTrial) {
    return { emoji: '⚠️', text: t('card.trial'), className: 'trial' };
  }
  if (daysLeft === 0) {
    return { emoji: '🔴', text: t('card.billingToday'), className: 'urgent' };
  }
  if (daysLeft === 1) {
    return { emoji: '🔴', text: t('card.billingTomorrow'), className: 'urgent' };
  }
  if (daysLeft <= 3) {
    return { emoji: '🟡', text: t('card.billingIn', { count: daysLeft }), className: 'warning' };
  }
  return { emoji: '🟢', text: t('card.billingIn', { count: daysLeft }), className: 'normal' };
}

const DELETE_THRESHOLD = 150; // Pixels to swipe for delete

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  index = 0
}: SubscriptionCardProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();

  const [swipeX, setSwipeX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const hapticTriggered = useRef(false);

  const daysLeft = getDaysUntil(subscription.billingDay, subscription.startDate);
  const statusInfo = getStatusInfo(daysLeft, subscription.isTrial || false, t);
  const totalPaid = calculateTotalPaid(subscription.startDate, subscription.amount);

  useEffect(() => {
    if (isEditing) {
      setSwipeX(0);
    }
  }, [isEditing]);

  const handleTouchStart = (e: TouchEvent) => {
    if (isEditing) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    hapticTriggered.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isEditing) return;

    const deltaX = touchStartX.current - e.touches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY);

    // Determine direction on first movement
    if (!isDragging.current && Math.abs(deltaX) > 10) {
      isDragging.current = Math.abs(deltaX) > deltaY;
    }

    if (isDragging.current && deltaX > 0) {
      // Apply resistance after threshold
      let newSwipeX = deltaX;
      if (deltaX > DELETE_THRESHOLD) {
        newSwipeX = DELETE_THRESHOLD + (deltaX - DELETE_THRESHOLD) * 0.3;
      }
      setSwipeX(newSwipeX);

      // Haptic at delete threshold
      if (deltaX >= DELETE_THRESHOLD && !hapticTriggered.current) {
        hapticFeedback.warning();
        hapticTriggered.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    if (isEditing) return;

    if (swipeX >= DELETE_THRESHOLD) {
      // Delete
      hapticFeedback.success();
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(subscription.id);
      }, 200);
    } else {
      // Snap back
      setSwipeX(0);
    }
    isDragging.current = false;
  };

  const handleCardClick = () => {
    if (swipeX > 10) {
      setSwipeX(0);
      return;
    }
    if (isDragging.current) return;

    hapticFeedback.light();

    if (isEditing) {
      // Повторный клик — закрыть редактирование
      onCancelEdit();
    } else {
      // Первый клик — открыть редактирование
      onStartEdit();
    }
  };

  const wrapperClasses = [
    styles.cardWrapper,
    isDeleting && styles.deleting,
    isEditing && styles.editing,
  ].filter(Boolean).join(' ');

  // Calculate delete indicator opacity
  const deleteOpacity = Math.min(1, swipeX / DELETE_THRESHOLD);

  return (
    <div
      className={wrapperClasses}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Delete background */}
      {!isEditing && swipeX > 0 && (
        <div
          className={styles.deleteBackground}
          style={{ opacity: deleteOpacity }}
        >
          <span className={styles.deleteText}>
            {swipeX >= DELETE_THRESHOLD ? '✓' : '×'}
          </span>
        </div>
      )}

      {/* Main card */}
      <div
        ref={cardRef}
        className={styles.card}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeX > 0 ? `translateX(-${swipeX}px)` : undefined,
          transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <div className={styles.mainContent}>
          <IconBadge icon={subscription.icon} color={subscription.color} size="md" />

          <div className={styles.info}>
            <span className={styles.name}>{subscription.name}</span>
            <span className={`${styles.status} ${styles[statusInfo.className]}`}>
              {statusInfo.emoji} {statusInfo.text}
            </span>
          </div>

          <div className={styles.priceSection}>
            <span className={styles.price}>
              {subscription.amount.toLocaleString()} {getCurrencySymbol(subscription.currency || 'RUB')}
            </span>
            <span className={styles.ltv}>
              {t('card.ltv')}: {totalPaid.amount.toLocaleString()} {getCurrencySymbol(subscription.currency || 'RUB')}
            </span>
          </div>
        </div>

        {/* Inline edit form */}
        {isEditing && (
          <InlineEditForm
            subscription={subscription}
            onSave={onEdit}
          />
        )}
      </div>
    </div>
  );
}

// Inline edit form component
interface InlineEditFormProps {
  subscription: Subscription;
  onSave: (data: Omit<Subscription, 'id' | 'createdAt'>) => void;
}

function InlineEditForm({ subscription, onSave }: InlineEditFormProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();

  const [name, setName] = useState(subscription.name);
  const [amount, setAmount] = useState(subscription.amount.toString());
  const [billingDay, setBillingDay] = useState(subscription.billingDay.toString());
  const [isTrial, setIsTrial] = useState(subscription.isTrial || false);
  const [startDate, setStartDate] = useState(() => {
    if (subscription.startDate) {
      const d = new Date(subscription.startDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseInt(amount, 10);
    const dayNum = parseInt(billingDay, 10);

    if (!name.trim() || isNaN(amountNum) || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      hapticFeedback.error();
      return;
    }

    hapticFeedback.success();

    // Parse date properly
    const [year, month, day] = startDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    onSave({
      name: name.trim(),
      icon: subscription.icon,
      color: subscription.color,
      amount: amountNum,
      currency: subscription.currency || 'RUB',
      periodMonths: 1,
      billingDay: dayNum,
      startDate: dateObj.toISOString(),
      isTrial,
    });
  };

  const handleDayChange = (value: string) => {
    const val = value.replace(/\D/g, '');
    const num = parseInt(val, 10);
    if (!val || (num >= 1 && num <= 31)) {
      setBillingDay(val);
    }
  };

  const toggleTrial = () => {
    hapticFeedback.light();
    setIsTrial(!isTrial);
  };

  const isValid = useMemo(() => {
    const amountNum = parseInt(amount, 10);
    const dayNum = parseInt(billingDay, 10);
    return name.trim().length > 0 && !isNaN(amountNum) && amountNum > 0 && !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && startDate;
  }, [name, amount, billingDay, startDate]);

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
      <div className={formStyles.fields}>
        <Input
          label={t('form.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          autoComplete="off"
        />

        <div className={formStyles.row}>
          <Input
            label={t('form.amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            inputMode="numeric"
            suffix={getCurrencySymbol(subscription.currency || 'RUB')}
          />
          <Input
            label={t('form.day')}
            value={billingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder="1-31"
            inputMode="numeric"
          />
        </div>

        <div className={formStyles.dateSection}>
          <span className={formStyles.dateLabel}>{t('form.startDate')}</span>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            maxDate={new Date()}
          />
        </div>

        <div className={formStyles.checkbox} onClick={toggleTrial}>
          <div className={`${formStyles.checkboxBox} ${isTrial ? formStyles.checked : ''}`}>
            {isTrial && <span className={formStyles.checkboxIcon}>✓</span>}
          </div>
          <span className={formStyles.checkboxLabel}>{t('form.isTrial')}</span>
        </div>
      </div>

      <div className={formStyles.actions}>
        <Button type="submit" disabled={!isValid} fullWidth>
          {t('form.update')}
        </Button>
      </div>
    </form>
  );
}
