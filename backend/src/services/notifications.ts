import { Subscription, OverdueSubscription } from '../types.js';

/**
 * Calculate days until next billing
 * Returns 0 if due today, negative if overdue
 */
export function getDaysUntilBilling(subscription: Subscription): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(subscription.startDate);
  startDate.setHours(0, 0, 0, 0);

  // Find next billing date based on periodMonths
  const nextBilling = new Date(startDate);

  // Keep adding periodMonths until we're past today
  while (nextBilling <= today) {
    nextBilling.setMonth(nextBilling.getMonth() + subscription.periodMonths);
  }

  // Calculate difference in days
  const diffTime = nextBilling.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get subscriptions due tomorrow (for reminder notifications)
 */
export function getDueTomorrowSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return subscriptions.filter(sub => {
    if (sub.isTrial) return false;
    return getDaysUntilBilling(sub) === 1;
  });
}

/**
 * Get overdue and due-today subscriptions for notifications
 */
export function getOverdueSubscriptions(subscriptions: Subscription[]): OverdueSubscription[] {
  const result: OverdueSubscription[] = [];

  for (const subscription of subscriptions) {
    if (subscription.isTrial) continue;

    const daysUntil = getDaysUntilBilling(subscription);

    // Due today (daysUntil === 0) - but with our logic daysUntil is always >= 1 after billing
    // So we need to check if billing was yesterday or earlier
    // Actually, let's recalculate: check if next billing is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(subscription.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Find the billing date we should have paid
    const checkDate = new Date(startDate);
    while (checkDate < today) {
      checkDate.setMonth(checkDate.getMonth() + subscription.periodMonths);
    }

    // checkDate is now the next billing date (today or future)
    const diffTime = checkDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Due today
      result.push({
        subscription,
        overdueDays: 0,
        isDueToday: true,
      });
    } else if (diffDays < 0) {
      // Overdue (shouldn't happen with while loop, but safety check)
      result.push({
        subscription,
        overdueDays: Math.abs(diffDays),
        isDueToday: false,
      });
    }
  }

  // Sort: due today first, then by overdue days
  result.sort((a, b) => {
    if (a.isDueToday && !b.isDueToday) return -1;
    if (!a.isDueToday && b.isDueToday) return 1;
    return b.overdueDays - a.overdueDays;
  });

  return result;
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
  };

  const symbol = symbols[currency] || currency;
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

/**
 * Calculate next billing date after a payment
 */
export function getNextBillingDate(subscription: Subscription, fromDate?: Date): Date {
  const from = fromDate || new Date();
  from.setHours(0, 0, 0, 0);

  const nextBilling = new Date(from);
  nextBilling.setMonth(nextBilling.getMonth() + subscription.periodMonths);

  return nextBilling;
}
