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
  period: 'month' | 'year';
  billingDay: number; // 1-31
  startDate: string; // ISO date
  isTrial: boolean;
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
  period: 'month' | 'year';
  billingDay: number;
  startDate: string;
  isTrial: boolean;
}

export interface UpdateSubscriptionData {
  name?: string;
  icon?: string;
  color?: string;
  amount?: number;
  currency?: 'RUB' | 'USD' | 'EUR';
  period?: 'month' | 'year';
  billingDay?: number;
  startDate?: string;
  isTrial?: boolean;
}

// Notification types

export interface OverdueSubscription {
  subscription: Subscription;
  overdueDays: number;
  isDueToday: boolean;
}
