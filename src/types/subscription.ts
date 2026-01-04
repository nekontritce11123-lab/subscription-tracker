export type Currency = 'RUB' | 'USD' | 'EUR';
export type Period = 'month' | 'year';

export interface Subscription {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: Currency;
  period: Period;
  billingDay: number;
  startDate: string;      // Обязательное - дата первой оплаты
  isTrial?: boolean;      // Пробный период
  createdAt: string;
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

// Timeline types
export interface TimelineSubscription {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
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
