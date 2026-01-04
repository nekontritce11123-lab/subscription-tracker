import { Subscription, OverdueSubscription } from '../types.js';

/**
 * Calculate days until next billing
 * Returns negative number if overdue
 */
export function getDaysUntilBilling(subscription: Subscription): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(subscription.startDate);
  startDate.setHours(0, 0, 0, 0);

  // Calculate next billing date based on subscription period
  const nextBilling = new Date(startDate);

  if (subscription.period === 'year') {
    // For yearly, add years until we're past today
    while (nextBilling <= today) {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }
    // Go back one year if we just added and it's not due yet
    if (nextBilling > today) {
      const prevBilling = new Date(nextBilling);
      prevBilling.setFullYear(prevBilling.getFullYear() - 1);
      if (prevBilling.getTime() === startDate.getTime()) {
        // First billing hasn't happened yet
      } else {
        nextBilling.setFullYear(nextBilling.getFullYear() - 1);
      }
    }
  } else {
    // For monthly subscriptions
    // Set to billing day of current month
    nextBilling.setDate(subscription.billingDay);
    nextBilling.setMonth(today.getMonth());
    nextBilling.setFullYear(today.getFullYear());

    // Handle months with fewer days
    if (nextBilling.getDate() !== subscription.billingDay) {
      // Billing day doesn't exist in this month, use last day
      nextBilling.setDate(0);
    }

    // If billing date is before startDate, move to next month
    if (nextBilling < startDate) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      nextBilling.setDate(subscription.billingDay);
      if (nextBilling.getDate() !== subscription.billingDay) {
        nextBilling.setDate(0);
      }
    }
  }

  // Calculate difference in days
  const diffTime = nextBilling.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get overdue and due-today subscriptions for notifications
 */
export function getOverdueSubscriptions(subscriptions: Subscription[]): OverdueSubscription[] {
  const result: OverdueSubscription[] = [];

  for (const subscription of subscriptions) {
    const daysUntil = getDaysUntilBilling(subscription);

    // Due today or overdue
    if (daysUntil <= 0) {
      result.push({
        subscription,
        overdueDays: Math.abs(daysUntil),
        isDueToday: daysUntil === 0,
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
