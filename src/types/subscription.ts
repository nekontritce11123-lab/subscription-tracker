export type Currency = 'RUB' | 'USD' | 'EUR' | 'UAH' | 'BYN';
export type Period = 'month' | 'year';  // Legacy, kept for migration

export interface Subscription {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: Currency;
  period?: Period;          // Legacy field, kept for migration
  periodMonths: number;     // Периодичность в месяцах (1, 2, 3, 6, 12)
  billingDay: number;
  startDate: string;        // Дата первой оплаты
  isTrial?: boolean;        // Пробный период
  emoji?: string;           // Эмодзи вместо первой буквы
  createdAt: string;
  updatedAt?: string;       // Время последнего обновления (для синхронизации)
}

export interface Stats {
  monthlyTotal: number;
  totalSpent: number;
  subscriptionCount: number;
  nextPayment?: {
    name: string;
    daysLeft: number;
    amount: number;
  };
}

// Статистика по валютам
export interface CurrencyStats {
  monthlyTotal: number;
  totalSpent: number;
  subscriptionCount: number;
  yearlyProjection: number;
  avgPerDay: number;
}

export type StatsByCurrency = Partial<Record<Currency, CurrencyStats>>;

// Timeline types
export interface TimelineSubscription {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: Currency;
  isTrial: boolean;
  isPaid: boolean;
  daysUntil: number;
}

export interface TimelineEvent {
  day: number;
  subscriptions: TimelineSubscription[];
  isPast: boolean;
  isToday: boolean;
  isUrgent: boolean;  // 0-3 days
  date: Date;
}

export interface MonthData {
  name: string;
  year: number;
  daysInMonth: number;
  today: number;
  events: TimelineEvent[];
  totalAmount: number;
  paidAmount: number;        // сумма уже прошедших платежей
  remainingAmount: number;   // сумма будущих платежей
  subscriptionCount: number;
  daysToSurvive: number;     // days until last payment this month
  nextPayment: {
    name: string;
    daysUntil: number;
    amount: number;
  } | null;
}
