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

const PERIOD_OPTIONS = [
  { value: 1, label: '1 мес' },
  { value: 2, label: '2 мес' },
  { value: 3, label: '3 мес' },
  { value: 6, label: '6 мес' },
  { value: 12, label: '1 год' },
];

const POPULAR_EMOJI = [
  '🎬', '🎵', '🎮', '☁️', '📱', '💪', '📚', '🍿',
  '🎧', '📺', '🛒', '🚗', '🏠', '💼', '🎨', '🔒',
  '💰', '🎯', '🚀', '⭐', '🔥', '💎', '🎁', '🌈',
  '🍕', '☕', '🍺', '🎲', '🎪', '🎭', '🎤', '📸',
  '✈️', '🏋️', '🧘', '🎾', '⚽', '🏀', '🎱', '🎳',
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
  const [billingDay, setBillingDay] = useState(editingSubscription?.billingDay?.toString() || new Date().getDate().toString());
  const [periodMonths, setPeriodMonths] = useState(editingSubscription?.periodMonths || 1);
  const [isTrial, setIsTrial] = useState(editingSubscription?.isTrial || false);
  const [startDate, setStartDate] = useState(getTodayString());
  const [emoji, setEmoji] = useState(editingSubscription?.emoji || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEmojiClosing, setIsEmojiClosing] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

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
      icon: emoji || autoIcon,
      color: autoColor,
      amount: amountNum,
      currency: 'RUB',
      periodMonths,
      billingDay: dayNum,
      startDate: new Date(startDate).toISOString(),
      isTrial,
      emoji: emoji || undefined,
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

  // Sync billing day when start date changes
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    // Auto-update billing day from selected date
    const date = new Date(newDate);
    setBillingDay(date.getDate().toString());
  };

  // Закрытие emoji picker с анимацией
  const closeEmojiPicker = () => {
    setIsEmojiClosing(true);
    setTimeout(() => {
      setShowEmojiPicker(false);
      setIsEmojiClosing(false);
    }, 150);
  };

  const isValid = useMemo(() => {
    const amountNum = parseInt(amount, 10);
    const dayNum = parseInt(billingDay, 10);
    return name.trim().length > 0 && !isNaN(amountNum) && amountNum > 0 && !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && startDate;
  }, [name, amount, billingDay, startDate]);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fields}>
        {/* Название с иконкой слева */}
        <div className={styles.nameRow}>
          <div
            className={styles.iconButton}
            style={{ backgroundColor: autoColor }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            {emoji || autoIcon}
          </div>
          <Input
            ref={nameInputRef}
            label={t('form.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('form.namePlaceholder')}
            autoComplete="off"
          />
        </div>

        {/* Emoji picker - overlay поверх других элементов */}
        {showEmojiPicker && (
          <>
            <div
              className={`${styles.emojiBackdrop} ${isEmojiClosing ? styles.closing : ''}`}
              onClick={closeEmojiPicker}
            />
            <div className={`${styles.emojiPickerOverlay} ${isEmojiClosing ? styles.closing : ''}`}>
              <div className={styles.emojiPicker}>
                <button
                  type="button"
                  className={`${styles.emojiItem} ${!emoji ? styles.emojiItemActive : ''}`}
                  onClick={() => {
                    hapticFeedback.light();
                    setEmoji('');
                    closeEmojiPicker();
                  }}
                >
                  {autoIcon}
                </button>
                {POPULAR_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`${styles.emojiItem} ${emoji === e ? styles.emojiItemActive : ''}`}
                    onClick={() => {
                      hapticFeedback.light();
                      setEmoji(e);
                      closeEmojiPicker();
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Сумма, Период, День */}
        <div className={styles.rowThree}>
          <Input
            label={t('form.amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            inputMode="numeric"
            suffix={t('currency')}
          />
          <div className={styles.periodWrapper}>
            <span className={styles.periodLabel}>Период</span>
            <div
              className={styles.periodButton}
              onClick={() => {
                hapticFeedback.light();
                setShowPeriodPicker(!showPeriodPicker);
              }}
            >
              {PERIOD_OPTIONS.find(o => o.value === periodMonths)?.label}
            </div>
          </div>
          <Input
            label="День списания"
            value={billingDay}
            onChange={(e) => handleDayChange(e.target.value)}
            placeholder="1-31"
            inputMode="numeric"
          />
        </div>

        {/* Period picker popup */}
        {showPeriodPicker && (
          <div className={styles.periodPicker}>
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.periodOption} ${periodMonths === option.value ? styles.periodOptionActive : ''}`}
                onClick={() => {
                  hapticFeedback.light();
                  setPeriodMonths(option.value);
                  setShowPeriodPicker(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Секция выбора даты первой оплаты */}
        <div className={styles.dateSection}>
          <span className={styles.dateLabel}>{t('form.startDate')}</span>
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
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
