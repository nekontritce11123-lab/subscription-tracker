import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subscription, Currency, Period } from '../types/subscription';
import { apiClient } from '../api/client';

const STORAGE_KEY = 'subscriptions';
const LOCAL_STORAGE_KEY = 'subscription_tracker_data';

// Flag to track if API client has been initialized with initData
let apiInitDataSet = false;

export function setApiInitData(initData: string): void {
  if (initData && !apiInitDataSet) {
    apiClient.setInitData(initData);
    apiInitDataSet = true;
  }
}

// CloudStorage wrapper with Promise API
const cloudStorage = {
  isAvailable(): boolean {
    return !!window.Telegram?.WebApp?.CloudStorage;
  },

  getItem(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        reject(new Error('CloudStorage not available'));
        return;
      }
      cs.getItem(key, (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  },

  setItem(key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        reject(new Error('CloudStorage not available'));
        return;
      }
      cs.setItem(key, value, (error, stored) => {
        if (error) reject(error);
        else resolve(stored);
      });
    });
  },

  removeItem(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        reject(new Error('CloudStorage not available'));
        return;
      }
      cs.removeItem(key, (error, removed) => {
        if (error) reject(error);
        else resolve(removed);
      });
    });
  }
};

// Миграция старых данных к новому формату
function migrateSubscription(sub: Record<string, unknown>): Subscription {
  // Конвертация старого period в periodMonths
  let periodMonths = sub.periodMonths as number | undefined;
  if (!periodMonths) {
    const oldPeriod = sub.period as Period | undefined;
    periodMonths = oldPeriod === 'year' ? 12 : 1;
  }

  return {
    id: sub.id as string,
    name: sub.name as string,
    icon: (sub.icon as string) || (sub.name as string).charAt(0).toUpperCase(),
    color: (sub.color as string) || '#007AFF',
    amount: sub.amount as number,
    currency: (sub.currency as Currency) || 'RUB',
    periodMonths,
    billingDay: sub.billingDay as number,
    startDate: (sub.startDate as string) || (sub.createdAt as string) || new Date().toISOString(),
    isTrial: (sub.isTrial as boolean) || false,
    emoji: sub.emoji as string | undefined,
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

/**
 * Merge local and server subscriptions
 * Server subscriptions with newer updatedAt take precedence
 */
function mergeSubscriptions(local: Subscription[], server: Subscription[]): Subscription[] {
  const result = new Map<string, Subscription>();

  // First add all local subscriptions
  for (const sub of local) {
    result.set(sub.id, sub);
  }

  // Then merge server subscriptions (newer wins)
  for (const sub of server) {
    const existing = result.get(sub.id);
    const serverTime = sub.updatedAt ? new Date(sub.updatedAt).getTime() : 0;
    const localTime = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

    // Server wins if: no local version OR server is newer
    if (!existing || serverTime > localTime) {
      result.set(sub.id, sub);
    }
  }

  return Array.from(result.values());
}

function loadFromLocalStorage(): Subscription[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(validateSubscription)
      .map((sub: unknown) => migrateSubscription(sub as Record<string, unknown>));
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return [];
  }
}

function saveToLocalStorage(subscriptions: Subscription[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subscriptions));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

async function loadFromCloudStorage(): Promise<Subscription[]> {
  try {
    const data = await cloudStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(validateSubscription)
      .map((sub: unknown) => migrateSubscription(sub as Record<string, unknown>));
  } catch (error) {
    console.error('Failed to load from CloudStorage:', error);
    return [];
  }
}

async function saveToCloudStorage(subscriptions: Subscription[]): Promise<void> {
  try {
    await cloudStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  } catch (error) {
    console.error('Failed to save to CloudStorage:', error);
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

// Sync subscriptions to backend for notifications
async function syncToBackend(subscriptions: Subscription[]): Promise<void> {
  try {
    await apiClient.syncSubscriptions(subscriptions);
    console.log('[Subscriptions] Synced to backend for notifications');
  } catch (error) {
    console.error('[Subscriptions] Failed to sync to backend:', error);
  }
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useCloudStorage, setUseCloudStorage] = useState(false);
  const initAttempted = useRef(false);

  // Save function that saves to appropriate storage
  // skipSync: set to true when merging from server to avoid infinite loop
  const save = useCallback(async (subs: Subscription[], skipSync = false) => {
    // Always save to localStorage as backup
    saveToLocalStorage(subs);

    // Save to CloudStorage if available
    if (useCloudStorage) {
      await saveToCloudStorage(subs);
    }

    // Sync to backend for notifications (with await, skip if merging from server)
    if (!skipSync) {
      await syncToBackend(subs);
    }
  }, [useCloudStorage]);

  // Initialize: try CloudStorage first, fallback to localStorage
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    async function init() {
      // Small delay to ensure Telegram WebApp is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      let loaded: Subscription[] = [];

      if (cloudStorage.isAvailable()) {
        console.log('[Subscriptions] CloudStorage available, loading...');
        loaded = await loadFromCloudStorage();
        setUseCloudStorage(true);

        // If CloudStorage is empty, try to migrate from localStorage
        if (loaded.length === 0) {
          const localData = loadFromLocalStorage();
          if (localData.length > 0) {
            console.log('[Subscriptions] Migrating', localData.length, 'subscriptions from localStorage to CloudStorage');
            loaded = localData;
            await saveToCloudStorage(loaded);
          }
        }

        console.log('[Subscriptions] Loaded', loaded.length, 'subscriptions from CloudStorage');
      } else {
        // Fallback to localStorage (development mode)
        console.log('[Subscriptions] CloudStorage not available, using localStorage');
        loaded = loadFromLocalStorage();
        setUseCloudStorage(false);
      }

      // Pull from backend to get any updates made via Telegram bot
      try {
        const serverData = await apiClient.getSubscriptions();
        if (serverData && serverData.length > 0) {
          console.log('[Subscriptions] Pulled', serverData.length, 'subscriptions from backend');
          const merged = mergeSubscriptions(loaded, serverData);

          // Save merged data locally WITHOUT syncing back to backend
          saveToLocalStorage(merged);
          if (cloudStorage.isAvailable()) {
            await saveToCloudStorage(merged);
          }

          loaded = merged;
          console.log('[Subscriptions] Merged to', merged.length, 'subscriptions');
        }
      } catch (error) {
        console.error('[Subscriptions] Failed to pull from backend:', error);
      }

      setSubscriptions(loaded);
      setIsLoaded(true);

      // Sync to backend for notifications (send our data)
      if (loaded.length > 0) {
        await syncToBackend(loaded);
      }
    }

    init();
  }, []);

  const addSubscription = useCallback(async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSubscription: Subscription = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setSubscriptions((prev) => {
      const updated = [...prev, newSubscription];
      save(updated);
      return updated;
    });

    return newSubscription;
  }, [save]);

  const updateSubscription = useCallback(async (id: string, data: Partial<Subscription>) => {
    setSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, ...data } : sub
      );
      save(updated);
      return updated;
    });
  }, [save]);

  const removeSubscription = useCallback(async (id: string) => {
    setSubscriptions((prev) => {
      const updated = prev.filter((sub) => sub.id !== id);
      save(updated);
      return updated;
    });
  }, [save]);

  const restoreSubscription = useCallback((subscription: Subscription, index: number) => {
    setSubscriptions((prev) => {
      const updated = [...prev];
      const insertIndex = Math.min(index, updated.length);
      updated.splice(insertIndex, 0, subscription);
      save(updated);
      return updated;
    });
  }, [save]);

  const markAsPaid = useCallback(async (id: string, paidDate?: string) => {
    const date = paidDate || new Date().toISOString().split('T')[0];

    setSubscriptions((prev) => {
      const updated = prev.map((sub) =>
        sub.id === id ? { ...sub, startDate: date, isTrial: false } : sub
      );
      save(updated);
      return updated;
    });
  }, [save]);

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
    isCloudStorageEnabled: useCloudStorage,
    addSubscription,
    updateSubscription,
    removeSubscription,
    restoreSubscription,
    markAsPaid,
    getSubscription,
  };
}
