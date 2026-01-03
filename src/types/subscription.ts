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
