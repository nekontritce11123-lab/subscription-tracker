import { Subscription, OverdueSubscription } from '../types.js';

/**
 * Calculate days until next billing
 * Takes into account startDate and billingDay logic
 */
export function getDaysUntilBilling(subscription: Subscription): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(subscription.startDate);
  startDate.setHours(0, 0, 0, 0);

  const { billingDay, periodMonths } = subscription;
  const startDay = startDate.getDate();

  // Handle months with fewer days
  const adjustDate = (d: Date, targetDay: number): Date => {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return new Date(d.getFullYear(), d.getMonth(), Math.min(targetDay, lastDay));
  };

  // Determine the first billing date based on creation logic
  let firstBilling: Date;

  if (billingDay <= startDay) {
    // billingDay passed or is today when created → paid
    // First unpaid billing is next period
    firstBilling = new Date(startDate.getFullYear(), startDate.getMonth() + periodMonths, billingDay);
  } else {
    // billingDay in future when created → not paid yet
    firstBilling = new Date(startDate.getFullYear(), startDate.getMonth(), billingDay);
  }
  firstBilling = adjustDate(firstBilling, billingDay);

  // Find the next billing date from today
  let nextBilling = new Date(firstBilling);
  while (nextBilling < today) {
    nextBilling.setMonth(nextBilling.getMonth() + periodMonths);
    nextBilling = adjustDate(nextBilling, billingDay);
  }

  const diffTime = nextBilling.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
 *
 * Logic:
 * - startDate is when user created/last paid the subscription
 * - billingDay is the day of month when payment is due
 * - At creation: if billingDay <= startDate.day → paid, if billingDay > startDate.day → not paid yet
 * - After that: if billingDay passed and user didn't mark as paid → overdue
 */
export function getOverdueSubscriptions(subscriptions: Subscription[]): OverdueSubscription[] {
  const result: OverdueSubscription[] = [];

  for (const subscription of subscriptions) {
    if (subscription.isTrial) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(subscription.startDate);
    startDate.setHours(0, 0, 0, 0);

    const { billingDay, periodMonths } = subscription;
    const startDay = startDate.getDate();

    // Handle months with fewer days
    const adjustDate = (d: Date, targetDay: number): Date => {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return new Date(d.getFullYear(), d.getMonth(), Math.min(targetDay, lastDay));
    };

    // Determine the first billing date that needs to be paid
    // If billingDay <= startDay at creation → considered paid, first billing is next period
    // If billingDay > startDay at creation → first billing is this month (not paid yet)
    let firstBilling: Date;

    if (billingDay <= startDay) {
      // billingDay already passed or is today when created → paid
      // First unpaid billing is next period
      firstBilling = new Date(startDate.getFullYear(), startDate.getMonth() + periodMonths, billingDay);
    } else {
      // billingDay is in the future when created → not paid yet
      // First unpaid billing is this month
      firstBilling = new Date(startDate.getFullYear(), startDate.getMonth(), billingDay);
    }
    firstBilling = adjustDate(firstBilling, billingDay);

    // Find the most recent billing date that should have been paid (up to today)
    let lastDueBilling: Date | null = null;
    let checkDate = new Date(firstBilling);

    while (checkDate <= today) {
      lastDueBilling = new Date(checkDate);
      checkDate.setMonth(checkDate.getMonth() + periodMonths);
      checkDate = adjustDate(checkDate, billingDay);
    }

    // If there's a billing date that should have been paid
    if (lastDueBilling) {
      const overdueDays = Math.round((today.getTime() - lastDueBilling.getTime()) / (1000 * 60 * 60 * 24));

      if (overdueDays === 0) {
        // Due today
        result.push({
          subscription,
          overdueDays: 0,
          isDueToday: true,
        });
      } else if (overdueDays > 0) {
        // Overdue
        result.push({
          subscription,
          overdueDays,
          isDueToday: false,
        });
      }
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
 * Uses billingDay to determine the correct day of month
 */
export function getNextBillingDate(subscription: Subscription, fromDate?: Date): Date {
  // Create copy to avoid mutating input
  const from = new Date(fromDate || new Date());
  from.setHours(0, 0, 0, 0);

  // Calculate target month based on periodMonths
  let targetMonth = from.getMonth();
  let targetYear = from.getFullYear();

  // If billingDay already passed in current month, add periodMonths
  if (from.getDate() > subscription.billingDay) {
    targetMonth += subscription.periodMonths;
  }

  // Handle year overflow
  targetYear += Math.floor(targetMonth / 12);
  targetMonth = targetMonth % 12;

  // Get last day of target month to handle edge cases (e.g., billingDay=31 in February)
  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(subscription.billingDay, lastDayOfMonth);

  return new Date(targetYear, targetMonth, day);
}
