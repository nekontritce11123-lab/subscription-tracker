import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subscription, Currency, Period } from '../types/subscription';
import { apiClient } from '../api/client';

const STORAGE_KEY = 'subscription_tracker_data';

// Flag to track if API client has been initialized with initData
let apiInitDataSet = false;

export function setApiInitData(initData: string): void {
  if (initData && !apiInitDataSet) {
    apiClient.setInitData(initData);
    apiInitDataSet = true;
  }
}

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
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const migrated = parsed
      .filter(validateSubscription)
      .map((sub: unknown) => migrateSubscription(sub as Record<string, unknown>));

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
    targetDate = new Date(currentYear, currentMonth, billingDay);
  } else {
    targetDate = new Date(currentYear, currentMonth + 1, billingDay);
  }

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
  const [useApi, setUseApi] = useState(false);
  const initAttempted = useRef(false);

  // Initialize: try API first, fallback to localStorage
  // Wait a tick for initData to be set from App.tsx
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    async function init() {
      // Small delay to ensure initData is set from useTelegram
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const { subscriptions: apiSubs } = await apiClient.init();
        setSubscriptions(apiSubs);
        setUseApi(true);
        // Sync localStorage as backup
        saveToStorage(apiSubs);
        console.log('[Subscriptions] API connected, loaded', apiSubs.length, 'subscriptions');
      } catch (error) {
        // Fallback to localStorage
        console.log('[Subscriptions] API unavailable, using localStorage:', error);
        const saved = loadFromStorage();
        setSubscriptions(saved);
        setUseApi(false);
      }
      setIsLoaded(true);
    }

    init();
  }, []);

  const addSubscription = useCallback(async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    // Optimistic update
    const tempSubscription: Subscription = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setSubscriptions((prev) => {
      const updated = [...prev, tempSubscription];
      saveToStorage(updated);
      return updated;
    });

    if (useApi) {
      try {
        const apiSubscription = await apiClient.createSubscription(data);
        // Replace temp with real API response
        setSubscriptions((prev) => {
          const updated = prev.map((sub) =>
            sub.id === tempSubscription.id ? apiSubscription : sub
          );
          saveToStorage(updated);
          return updated;
        });
        return apiSubscription;
      } catch (error) {
        console.error('[Subscriptions] API create failed:', error);
      }
    }

    return tempSubscription;
  }, [useApi]);

  const updateSubscription = useCallback(async (id: string, data: Partial<Subscription>) => {
    // Optimistic update
    setSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, ...data } : sub
      );
      saveToStorage(updated);
      return updated;
    });

    if (useApi) {
      try {
        await apiClient.updateSubscription(id, data);
      } catch (error) {
        console.error('[Subscriptions] API update failed:', error);
      }
    }
  }, [useApi]);

  const removeSubscription = useCallback(async (id: string) => {
    // Optimistic update
    setSubscriptions((prev) => {
      const updated = prev.filter((sub) => sub.id !== id);
      saveToStorage(updated);
      return updated;
    });

    if (useApi) {
      try {
        await apiClient.deleteSubscription(id);
      } catch (error) {
        console.error('[Subscriptions] API delete failed:', error);
      }
    }
  }, [useApi]);

  const restoreSubscription = useCallback((subscription: Subscription, index: number) => {
    setSubscriptions((prev) => {
      const updated = [...prev];
      const insertIndex = Math.min(index, updated.length);
      updated.splice(insertIndex, 0, subscription);
      saveToStorage(updated);
      return updated;
    });

    // Re-create on API if available
    if (useApi) {
      const { id, createdAt, ...data } = subscription;
      apiClient.createSubscription(data).catch(console.error);
    }
  }, [useApi]);

  const markAsPaid = useCallback(async (id: string, paidDate?: string) => {
    const date = paidDate || new Date().toISOString().split('T')[0];

    // Optimistic update
    setSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, startDate: date, isTrial: false } : sub
      );
      saveToStorage(updated);
      return updated;
    });

    if (useApi) {
      try {
        await apiClient.markAsPaid(id, paidDate);
      } catch (error) {
        console.error('[Subscriptions] API mark paid failed:', error);
      }
    }
  }, [useApi]);

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
    isApiConnected: useApi,
    addSubscription,
    updateSubscription,
    removeSubscription,
    restoreSubscription,
    markAsPaid,
    getSubscription,
  };
}
