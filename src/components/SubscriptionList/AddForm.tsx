import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription, Currency } from '../../types/subscription';
import { Button, Input, DatePicker } from '../UI';
import { useTelegram } from '../../hooks/useTelegram';
import { CURRENCY_LIST, DEFAULT_CURRENCY, getCurrencySymbol } from '../../utils/currency';
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

// Эмодзи для подписок по категориям
const EMOJI_CATEGORIES = [
  {
    id: 'streaming',
    icon: '🎬',
    emoji: ['🎬', '📺', '🎵', '🎧', '🍿', '📽️', '🎞️', '📻', '🎤', '🎹', '🎼', '🎶', '📀', '📹', '🎥', '📡', '🔊', '🎙️'],
  },
  {
    id: 'games',
    icon: '🎮',
    emoji: ['🎮', '🕹️', '👾', '🎯', '🏆', '⚔️', '🎰', '🃏', '♟️', '🎲', '🎴', '🀄', '🧩', '🤖', '👻', '🐉', '🏹', '🔫', '💣', '🛸'],
  },
  {
    id: 'work',
    icon: '💼',
    emoji: ['💼', '📊', '📈', '💻', '🖥️', '📝', '✏️', '📁', '📧', '💡', '📋', '📌', '📎', '✂️', '📐', '📏', '🗂️', '📑', '🖨️', '⌨️', '🖱️', '💾', '📱', '🔧', '⚙️'],
  },
  {
    id: 'cloud',
    icon: '☁️',
    emoji: ['☁️', '📦', '💾', '🔐', '🔒', '🛡️', '📤', '📥', '🗄️', '💿', '🔑', '🔓', '📂', '🗃️', '💽', '🖴', '🔗', '🌐'],
  },
  {
    id: 'education',
    icon: '📚',
    emoji: ['📚', '📖', '📕', '📗', '📘', '📙', '📓', '📒', '📔', '🎓', '🏫', '✍️', '🔬', '🔭', '🧪', '🧬', '🧮', '📐', '🌡️', '🧠', '💭', '🗣️', '🌍', '🗺️'],
  },
  {
    id: 'fitness',
    icon: '💪',
    emoji: ['💪', '🏋️', '🧘', '🚴', '🏃', '⚽', '🎾', '🏀', '🏊', '🥊', '🏈', '⚾', '🏐', '🏓', '🏸', '🥋', '⛷️', '🏂', '🧗', '🤸', '🚵', '🏇', '⛳', '🎿', '🛹', '🛼', '🥅', '🏒'],
  },
  {
    id: 'health',
    icon: '❤️',
    emoji: ['❤️', '💊', '🏥', '🩺', '🩹', '💉', '🧬', '🧘', '😴', '🛏️', '🧴', '🦷', '👁️', '🧠', '💆', '💇', '🧖', '🌿', '🍃', '🥦', '🥕', '🍎'],
  },
  {
    id: 'food',
    icon: '🍕',
    emoji: ['🍕', '☕', '🍔', '🥗', '🍺', '🍷', '🧁', '🍣', '🍜', '🥤', '🍱', '🍳', '🥘', '🍝', '🍛', '🌮', '🌯', '🥙', '🧆', '🍲', '🥡', '🍿', '🧇', '🥞', '🍩', '🍪', '🎂', '🍰', '🧀', '🥩', '🍗', '🥪'],
  },
  {
    id: 'shopping',
    icon: '🛒',
    emoji: ['🛒', '🛍️', '💳', '💰', '💵', '🏷️', '🎁', '📦', '🏪', '🏬', '💎', '👗', '👠', '👟', '👜', '🧥', '👔', '👕', '👖', '🧢', '🎩', '👒', '💄', '💅', '👓', '🕶️', '⌚', '💍'],
  },
  {
    id: 'travel',
    icon: '✈️',
    emoji: ['✈️', '🚗', '🏨', '🗺️', '🌍', '🚀', '🛳️', '🎒', '⛺', '🏖️', '🚂', '🚌', '🚕', '🛫', '🛬', '🚁', '⛵', '🏝️', '🗼', '🗽', '🏰', '⛩️', '🎡', '🎢', '🎠', '⛱️', '🧳', '🌄', '🌅'],
  },
  {
    id: 'finance',
    icon: '💰',
    emoji: ['💰', '💵', '💴', '💶', '💷', '💳', '🏦', '📈', '📉', '💹', '🪙', '💸', '💲', '🧾', '📊', '🏧'],
  },
  {
    id: 'communication',
    icon: '💬',
    emoji: ['💬', '📱', '📞', '☎️', '📲', '📧', '✉️', '📨', '📩', '💌', '📮', '📪', '📫', '🗨️', '💭', '🗯️', '📢', '📣', '🔔', '🔕'],
  },
  {
    id: 'creative',
    icon: '🎨',
    emoji: ['🎨', '🖌️', '🖍️', '✏️', '🖊️', '🖋️', '📷', '📸', '🎭', '🎪', '🎨', '🖼️', '🎻', '🎺', '🥁', '🎷', '🪕', '🎸', '🪘', '🎯', '🧵', '🧶', '🪡', '📐', '✂️'],
  },
  {
    id: 'pets',
    icon: '🐱',
    emoji: ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈'],
  },
  {
    id: 'home',
    icon: '🏠',
    emoji: ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '🛋️', '🪑', '🚪', '🛏️', '🛁', '🚿', '🪥', '🧹', '🧺', '🧻', '🪣', '🧽', '🪴', '🌱', '🌷', '🌻', '💐'],
  },
  {
    id: 'transport',
    icon: '🚗',
    emoji: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚁', '🛸', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '✈️', '🛫', '🛬', '🛩️', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢'],
  },
  {
    id: 'nature',
    icon: '🌿',
    emoji: ['🌿', '🍃', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '💐', '🍄', '🌰', '🎋', '🎍', '☀️', '🌙', '⭐', '🌟', '✨', '⚡', '🔥', '🌈', '☁️', '🌧️', '⛈️', '❄️', '💨', '💧', '🌊'],
  },
  {
    id: 'symbols',
    icon: '⭐',
    emoji: ['⭐', '🌟', '✨', '💫', '🔥', '💎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌', '⭕', '❗', '❓', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '🔀', '🔁', '🔂'],
  },
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
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [currency, setCurrency] = useState<Currency>(editingSubscription?.currency || DEFAULT_CURRENCY);

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
      currency,
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
    const currentDate = new Date(startDate);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Calculate max allowed day (can't be in the future)
    const today = new Date();
    const isCurrentMonth = currentDate.getFullYear() === today.getFullYear() &&
                           currentDate.getMonth() === today.getMonth();
    const maxDay = isCurrentMonth ? Math.min(daysInMonth, today.getDate()) : daysInMonth;

    if (!val || (num >= 1 && num <= maxDay)) {
      setBillingDay(val);
      // Sync with calendar date
      if (num >= 1 && num <= maxDay) {
        currentDate.setDate(num);
        setStartDate(currentDate.toISOString().split('T')[0]);
      }
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
            className={`${styles.iconButton} ${showEmojiPicker ? styles.iconButtonActive : ''}`}
            style={{ backgroundColor: autoColor }}
            onClick={() => {
              hapticFeedback.light();
              setShowEmojiPicker(!showEmojiPicker);
            }}
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

        {/* Emoji picker — inline expansion with categories */}
        <div className={`${styles.emojiSection} ${showEmojiPicker ? styles.emojiSectionOpen : ''}`}>
          {/* Category tabs */}
          <div className={styles.categoryTabs}>
            {EMOJI_CATEGORIES.map((cat, index) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryTab} ${selectedCategory === index ? styles.categoryTabActive : ''}`}
                onClick={() => {
                  hapticFeedback.light();
                  setSelectedCategory(index);
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji grid for selected category */}
          <div className={styles.emojiGrid}>
            <button
              type="button"
              className={`${styles.emojiItem} ${styles.emojiReset} ${!emoji ? styles.emojiItemActive : ''}`}
              onClick={() => {
                hapticFeedback.light();
                setEmoji('');
                setShowEmojiPicker(false);
              }}
            >
              {autoIcon}
            </button>
            {EMOJI_CATEGORIES[selectedCategory].emoji.map((e) => (
              <button
                key={e}
                type="button"
                className={`${styles.emojiItem} ${emoji === e ? styles.emojiItemActive : ''}`}
                onClick={() => {
                  hapticFeedback.light();
                  setEmoji(e);
                  setShowEmojiPicker(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Сумма, Период, День */}
        <div className={styles.rowThree}>
          <div className={styles.amountWrapper}>
            <Input
              label={t('form.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
              suffix={
                <span
                  className={styles.currencySuffix}
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticFeedback.light();
                    setShowCurrencyPicker(!showCurrencyPicker);
                  }}
                >
                  {getCurrencySymbol(currency)}
                </span>
              }
            />
          </div>
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
          <div className={styles.dayWrapper}>
            <span className={styles.dayLabel}>{t('form.day')}</span>
            <div className={styles.dayInputRow}>
              <input
                type="text"
                className={styles.dayInput}
                value={billingDay}
                onChange={(e) => handleDayChange(e.target.value)}
                placeholder="1"
                inputMode="numeric"
              />
              <span className={styles.monthBadge}>
                {(t('months.short', { returnObjects: true }) as string[])[new Date(startDate).getMonth()]}
              </span>
            </div>
          </div>
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

        {/* Currency picker popup */}
        {showCurrencyPicker && (
          <div className={styles.currencyPicker}>
            {CURRENCY_LIST.map((cur) => (
              <button
                key={cur.code}
                type="button"
                className={`${styles.currencyOption} ${currency === cur.code ? styles.currencyOptionActive : ''}`}
                onClick={() => {
                  hapticFeedback.light();
                  setCurrency(cur.code);
                  setShowCurrencyPicker(false);
                }}
              >
                {cur.symbol}
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
