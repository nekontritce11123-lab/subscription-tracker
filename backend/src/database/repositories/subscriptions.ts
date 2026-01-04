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

  // Update startDate to move billing cycle forward
  subscription.startDate = paidDate || new Date().toISOString().split('T')[0];
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
 * Replaces all subscriptions for a user with the provided list
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
  }>
): Promise<void> {
  await db.read();

  // Remove all existing subscriptions for this user
  db.data.subscriptions = db.data.subscriptions.filter(sub => sub.userId !== userId);

  // Add new subscriptions
  const now = new Date().toISOString();
  const newSubscriptions: Subscription[] = subscriptions.map(sub => ({
    id: sub.id,
    userId,
    name: sub.name,
    icon: sub.icon || sub.name.charAt(0).toUpperCase(),
    color: sub.color || '#007AFF',
    amount: sub.amount,
    currency: sub.currency || 'RUB',
    periodMonths: sub.periodMonths || 1,
    billingDay: sub.billingDay,
    startDate: sub.startDate,
    isTrial: sub.isTrial || false,
    emoji: sub.emoji,
    createdAt: sub.createdAt || now,
    updatedAt: now,
  }));

  db.data.subscriptions.push(...newSubscriptions);
  await db.write();

  console.log(`[Subscriptions] Synced ${subscriptions.length} subscriptions for user ${userId}`);
}
