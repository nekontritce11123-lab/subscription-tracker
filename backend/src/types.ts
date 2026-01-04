// Database types

export interface User {
  id: number; // Telegram user ID
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: 'ru' | 'en';
  createdAt: string;
  lastActiveAt: string;
}

export interface Subscription {
  id: string; // UUID
  userId: number; // Foreign key to User
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  periodMonths: number; // 1, 2, 3, 6, 12
  billingDay: number; // 1-31
  startDate: string; // ISO date
  isTrial: boolean;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  users: User[];
  subscriptions: Subscription[];
}

// API types

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface CreateSubscriptionData {
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  periodMonths: number;
  billingDay: number;
  startDate: string;
  isTrial: boolean;
  emoji?: string;
}

export interface UpdateSubscriptionData {
  name?: string;
  icon?: string;
  color?: string;
  amount?: number;
  currency?: 'RUB' | 'USD' | 'EUR';
  periodMonths?: number;
  billingDay?: number;
  startDate?: string;
  isTrial?: boolean;
  emoji?: string;
}

// Notification types

export interface OverdueSubscription {
  subscription: Subscription;
  overdueDays: number;
  isDueToday: boolean;
}
