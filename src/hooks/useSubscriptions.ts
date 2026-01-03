import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription, Currency, Period } from '../types/subscription';

const STORAGE_KEY = 'subscription_tracker_data';

// Миграция старых данных к новому формату
function migrateSubscription(sub: Record<string, unknown>): Subscription {
  return {
    id: sub.id as string,
    name: sub.name as string,
    icon: (sub.icon as string) || (sub.name as string).charAt(0).toUpperCase(),
    color: (sub.color as string) || '#007AFF',
    amount: sub.amount as number,
    currency: (sub.currency as Currency) || 'RUB',
    period: (sub.period as Period) || 'month',
    billingDay: sub.billingDay as number,
    startDate: (sub.startDate as string) || (sub.createdAt as string) || new Date().toISOString(),
    isTrial: (sub.isTrial as boolean) || false,
    createdAt: (sub.createdAt as string) || new Date().toISOString(),
  };
}

function generateId(): string {
  // Use crypto.randomUUID if available, fallback to custom generator
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function validateSubscription(sub: unknown): sub is Subscription {
  if (!sub || typeof sub !== 'object') return false;
  const s = sub as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.amount === 'number' &&
    typeof s.billingDay === 'number' &&
    s.billingDay >= 1 &&
    s.billingDay <= 31
  );
}

function loadFromStorage(): Subscription[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Validate, migrate and filter out invalid entries
    const migrated = parsed
      .filter(validateSubscription)
      .map((sub: unknown) => migrateSubscription(sub as Record<string, unknown>));

    // Сохраняем мигрированные данные обратно
    if (migrated.length > 0) {
      saveToStorage(migrated);
    }

    return migrated;
  } catch (error) {
    console.error('Failed to load subscriptions:', error);
    return [];
  }
}

function saveToStorage(subscriptions: Subscription[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  } catch (error) {
    console.error('Failed to save subscriptions:', error);
  }
}

function getDaysUntilPayment(billingDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetDate: Date;

  if (billingDay >= currentDay) {
    // Payment is later this month
    targetDate = new Date(currentYear, currentMonth, billingDay);
  } else {
    // Payment is next month
    targetDate = new Date(currentYear, currentMonth + 1, billingDay);
  }

  // Handle months with fewer days
  const lastDayOfTargetMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  ).getDate();

  if (billingDay > lastDayOfTargetMonth) {
    targetDate.setDate(lastDayOfTargetMonth);
  }

  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    setSubscriptions(saved);
    setIsLoaded(true);
  }, []);

  // Use functional updates to prevent race conditions
  const addSubscription = useCallback((data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSubscription: Subscription = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setSubscriptions((prev) => {
      const updated = [...prev, newSubscription];
      // Save immediately with the new state
      saveToStorage(updated);
      return updated;
    });

    return newSubscription;
  }, []);

  const updateSubscription = useCallback((id: string, data: Partial<Subscription>) => {
    setSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, ...data } : sub
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => {
      const updated = prev.filter((sub) => sub.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const restoreSubscription = useCallback((subscription: Subscription, index: number) => {
    setSubscriptions((prev) => {
      const updated = [...prev];
      // Insert at original position or end if index is out of bounds
      const insertIndex = Math.min(index, updated.length);
      updated.splice(insertIndex, 0, subscription);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const getSubscription = useCallback(
    (id: string) => subscriptions.find((sub) => sub.id === id),
    [subscriptions]
  );

  // Sort by days until next payment (memoized)
  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      const daysToA = getDaysUntilPayment(a.billingDay);
      const daysToB = getDaysUntilPayment(b.billingDay);
      return daysToA - daysToB;
    });
  }, [subscriptions]);

  return {
    subscriptions: sortedSubscriptions,
    isLoaded,
    addSubscription,
    updateSubscription,
    removeSubscription,
    restoreSubscription,
    getSubscription,
  };
}
