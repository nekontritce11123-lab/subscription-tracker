import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../../types/subscription';
import { Button, Input, DatePicker } from '../UI';
import { useTelegram } from '../../hooks/useTelegram';
import styles from './AddForm.module.css';

interface AddFormProps {
  onAdd: (data: Omit<Subscription, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingSubscription?: Subscription;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

function getColorFromName(name: string): string {
  if (!name) return '#8E8E93';
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function getIconFromName(name: string): string {
  if (!name) return '●';
  return name.charAt(0).toUpperCase();
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function AddForm({ onAdd, onCancel, editingSubscription }: AddFormProps) {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editingSubscription?.name || '');
  const [amount, setAmount] = useState(editingSubscription?.amount?.toString() || '');
  const [billingDay, setBillingDay] = useState(editingSubscription?.billingDay?.toString() || '');
  const [isTrial, setIsTrial] = useState(editingSubscription?.isTrial || false);
  const [startDate, setStartDate] = useState(getTodayString());

  const autoIcon = useMemo(() => editingSubscription?.icon || getIconFromName(name), [name, editingSubscription?.icon]);
  const autoColor = useMemo(() => editingSubscription?.color || getColorFromName(name), [name, editingSubscription?.color]);

  useEffect(() => {
    if (!editingSubscription) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [editingSubscription]);

  // Инициализация при редактировании
  useEffect(() => {
    if (editingSubscription?.startDate) {
      const date = new Date(editingSubscription.startDate);
      setStartDate(date.toISOString().split('T')[0]);
    }
  }, [editingSubscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseInt(amount, 10);
    const dayNum = parseInt(billingDay, 10);

    if (!name.trim() || isNaN(amountNum) || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      hapticFeedback.error();
      return;
    }

    hapticFeedback.success();

    onAdd({
      name: name.trim(),
      icon: autoIcon,
      color: autoColor,
      amount: amountNum,
      currency: 'RUB',
      period: 'month',
      billingDay: dayNum,
      startDate: new Date(startDate).toISOString(),
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fields}>
        <Input
          ref={nameInputRef}
          label={t('form.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          autoComplete="off"
        />

        <div className={styles.row}>
          <Input
            label={t('form.amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            inputMode="numeric"
            suffix={t('currency')}
          />
          <Input
            label={t('form.day')}
            value={billingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder="1-31"
            inputMode="numeric"
          />
        </div>

        {/* Секция выбора даты первой оплаты */}
        <div className={styles.dateSection}>
          <span className={styles.dateLabel}>{t('form.startDate')}</span>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            maxDate={new Date()}
          />
        </div>

        {/* Чекбокс триала */}
        <div className={styles.checkbox} onClick={toggleTrial}>
          <div className={`${styles.checkboxBox} ${isTrial ? styles.checked : ''}`}>
            {isTrial && <span className={styles.checkboxIcon}>✓</span>}
          </div>
          <span className={styles.checkboxLabel}>{t('form.isTrial')}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={!isValid}>
          {editingSubscription ? t('form.update') : t('form.save')}
        </Button>
      </div>
    </form>
  );
}
