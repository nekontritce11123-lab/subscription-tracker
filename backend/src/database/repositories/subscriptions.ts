import { v4 as uuidv4 } from 'uuid';
import { db } from '../index.js';
import { Subscription, CreateSubscriptionData, UpdateSubscriptionData } from '../../types.js';

export async function getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
  await db.read();
  return db.data.subscriptions.filter(sub => sub.userId === userId);
}

export async function getSubscriptionById(id: string): Promise<Subscription | undefined> {
  await db.read();
  return db.data.subscriptions.find(sub => sub.id === id);
}

export async function createSubscription(
  userId: number,
  data: CreateSubscriptionData
): Promise<Subscription> {
  await db.read();

  const now = new Date().toISOString();
  const newSubscription: Subscription = {
    id: uuidv4(),
    userId,
    name: data.name,
    icon: data.icon,
    color: data.color,
    amount: data.amount,
    currency: data.currency,
    periodMonths: data.periodMonths,
    billingDay: data.billingDay,
    startDate: data.startDate,
    isTrial: data.isTrial,
    emoji: data.emoji,
    createdAt: now,
    updatedAt: now,
  };

  db.data.subscriptions.push(newSubscription);
  await db.write();

  return newSubscription;
}

export async function updateSubscription(
  id: string,
  userId: number,
  data: UpdateSubscriptionData
): Promise<Subscription | null> {
  await db.read();

  const index = db.data.subscriptions.findIndex(
    sub => sub.id === id && sub.userId === userId
  );

  if (index === -1) {
    return null;
  }

  const subscription = db.data.subscriptions[index];
  const updatedSubscription: Subscription = {
    ...subscription,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  db.data.subscriptions[index] = updatedSubscription;
  await db.write();

  return updatedSubscription;
}

export async function deleteSubscription(id: string, userId: number): Promise<boolean> {
  await db.read();

  const index = db.data.subscriptions.findIndex(
    sub => sub.id === id && sub.userId === userId
  );

  if (index === -1) {
    return false;
  }

  db.data.subscriptions.splice(index, 1);
  await db.write();

  return true;
}

export async function markAsPaid(id: string, userId: number, paidDate?: string): Promise<Subscription | null> {
  await db.read();

  const index = db.data.subscriptions.findIndex(
    sub => sub.id === id && sub.userId === userId
  );

  if (index === -1) {
    return null;
  }

  const subscription = db.data.subscriptions[index];
  const paymentDateStr = paidDate || new Date().toISOString().split('T')[0];
  const paymentDate = new Date(paymentDateStr);

  // Update startDate to move billing cycle forward
  subscription.startDate = paymentDateStr;

  // Update billingDay to match the payment date (limited to 28 to avoid month-end issues)
  const paymentDay = paymentDate.getDate();
  subscription.billingDay = Math.min(paymentDay, 28);

  subscription.isTrial = false; // No longer trial after payment
  subscription.updatedAt = new Date().toISOString();

  await db.write();

  return subscription;
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  await db.read();
  return db.data.subscriptions;
}

/**
 * Sync subscriptions from CloudStorage
 * Uses merge-based approach: compares updatedAt timestamps
 * Does NOT delete subscriptions that exist on server but not in incoming data
 */
export async function syncSubscriptions(
  userId: number,
  subscriptions: Array<{
    id: string;
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
    createdAt: string;
    updatedAt?: string;
  }>
): Promise<Subscription[]> {
  await db.read();

  const result: Subscription[] = [];
  const now = new Date().toISOString();

  // Process incoming subscriptions (update existing or add new)
  for (const incoming of subscriptions) {
    const existingIndex = db.data.subscriptions.findIndex(
      s => s.id === incoming.id && s.userId === userId
    );

    if (existingIndex >= 0) {
      const existing = db.data.subscriptions[existingIndex];
      // Compare timestamps - take the newer version
      const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

      if (incomingTime >= existingTime) {
        // Incoming is newer - update
        db.data.subscriptions[existingIndex] = {
          id: incoming.id,
          userId,
          name: incoming.name,
          icon: incoming.icon || incoming.name.charAt(0).toUpperCase(),
          color: incoming.color || '#007AFF',
          amount: incoming.amount,
          currency: incoming.currency || 'RUB',
          periodMonths: incoming.periodMonths || 1,
          billingDay: incoming.billingDay,
          startDate: incoming.startDate,
          isTrial: incoming.isTrial || false,
          emoji: incoming.emoji,
          createdAt: incoming.createdAt || now,
          updatedAt: now,
        };
      }
      result.push(db.data.subscriptions[existingIndex]);
    } else {
      // New subscription - add it
      const newSub: Subscription = {
        id: incoming.id,
        userId,
        name: incoming.name,
        icon: incoming.icon || incoming.name.charAt(0).toUpperCase(),
        color: incoming.color || '#007AFF',
        amount: incoming.amount,
        currency: incoming.currency || 'RUB',
        periodMonths: incoming.periodMonths || 1,
        billingDay: incoming.billingDay,
        startDate: incoming.startDate,
        isTrial: incoming.isTrial || false,
        emoji: incoming.emoji,
        createdAt: incoming.createdAt || now,
        updatedAt: now,
      };
      db.data.subscriptions.push(newSub);
      result.push(newSub);
    }
  }

  // Add subscriptions that exist on server but not in incoming data
  // (e.g., created via Telegram bot callbacks)
  const incomingIds = new Set(subscriptions.map(s => s.id));
  const serverOnlySubs = db.data.subscriptions.filter(
    s => s.userId === userId && !incomingIds.has(s.id)
  );
  result.push(...serverOnlySubs);

  await db.write();

  console.log(`[Subscriptions] Merged ${subscriptions.length} incoming, ${serverOnlySubs.length} server-only for user ${userId}`);
  return result;
}
