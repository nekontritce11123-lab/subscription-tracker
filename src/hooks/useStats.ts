import { useMemo } from 'react';
import { Subscription, Stats } from '../types/subscription';

/**
 * Calculate days until the next billing date
 * Handles edge cases like short months (Feb 28/29, months with 30 days)
 * @param billingDay - Day of month when billing occurs
 * @param startDate - Optional start date to check if first payment was today
 */
export function getDaysUntil(billingDay: number, startDate?: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetDate: Date;

  if (billingDay > currentDay) {
    // Billing day is later this month
    targetDate = new Date(currentYear, currentMonth, billingDay);
  } else if (billingDay === currentDay) {
    // Today is the billing day
    // Check if this is the first payment (subscription started today)
    if (startDate) {
      const start = new Date(startDate);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (startDay.getTime() === today.getTime()) {
        // First payment was today, next is in ~1 month
        targetDate = new Date(currentYear, currentMonth + 1, billingDay);
      } else {
        return 0; // Payment is due today
      }
    } else {
      return 0;
    }
  } else {
    // Billing day has passed, calculate for next month
    targetDate = new Date(currentYear, currentMonth + 1, billingDay);
  }

  // Handle months with fewer days than the billing day
  // e.g., if billing day is 31 and next month has 30 days
  const lastDayOfTargetMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  ).getDate();

  if (billingDay > lastDayOfTargetMonth) {
    targetDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      lastDayOfTargetMonth
    );
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Calculate the number of months since a start date
 * Includes the current month if we've passed the start day
 */
function calculateMonthsSince(startDateStr: string): number {
  const startDate = new Date(startDateStr);
  const now = new Date();

  // Calculate full months difference
  let months =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth());

  // If we haven't reached the start day this month, subtract one
  if (now.getDate() < startDate.getDate()) {
    months -= 1;
  }

  // Add 1 because we count from the first payment
  return Math.max(1, months + 1);
}

export function getUrgencyLevel(daysLeft: number): 'urgent' | 'warning' | 'normal' {
  if (daysLeft <= 2) return 'urgent';
  if (daysLeft <= 7) return 'warning';
  return 'normal';
}

/**
 * Check if a subscription payment is overdue
 * Overdue means: billing day has passed this month AND we haven't paid yet this month
 */
export function isOverdue(billingDay: number, startDate: string): boolean {
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // If billing day hasn't passed yet this month, not overdue
  if (billingDay >= today) return false;

  // Check if payment was made this month (startDate is in current month)
  const start = new Date(startDate);
  const paidThisMonth =
    start.getMonth() === currentMonth &&
    start.getFullYear() === currentYear;

  // If paid this month, not overdue
  if (paidThisMonth) return false;

  // Billing day passed and no payment this month = overdue
  return true;
}

/**
 * Check if a subscription payment is due today
 */
export function isDueToday(billingDay: number, startDate: string): boolean {
  const daysUntil = getDaysUntil(billingDay, startDate);
  return daysUntil === 0;
}

/**
 * Get number of days a payment is overdue
 */
export function getOverdueDays(billingDay: number): number {
  const today = new Date().getDate();
  return Math.max(0, today - billingDay);
}

export function formatDaysLeft(
  daysLeft: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (daysLeft === 0) return t('card.today');
  if (daysLeft === 1) return t('card.tomorrow');
  return t('card.daysLeft', { count: daysLeft });
}

export function calculateTotalPaid(
  startDate: string,
  monthlyAmount: number
): { amount: number; months: number } {
  const months = calculateMonthsSince(startDate);
  return {
    amount: months * monthlyAmount,
    months,
  };
}

export function useStats(subscriptions: Subscription[]): Stats {
  return useMemo(() => {
    // Monthly total - sum of all subscription amounts
    const monthlyTotal = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    // Total spent - calculated from subscriptions with start dates
    const totalSpent = subscriptions.reduce((sum, sub) => {
      if (sub.startDate) {
        const months = calculateMonthsSince(sub.startDate);
        return sum + sub.amount * months;
      }
      return sum;
    }, 0);

    // Find the next upcoming payment
    let nextPayment: Stats['nextPayment'] = undefined;

    if (subscriptions.length > 0) {
      let minDays = Infinity;
      let nextSub: Subscription | null = null;

      for (const sub of subscriptions) {
        const days = getDaysUntil(sub.billingDay, sub.startDate);
        if (days < minDays) {
          minDays = days;
          nextSub = sub;
        }
      }

      if (nextSub) {
        nextPayment = {
          name: nextSub.name,
          daysLeft: minDays,
          amount: nextSub.amount,
        };
      }
    }

    return {
      monthlyTotal,
      totalSpent,
      subscriptionCount: subscriptions.length,
      nextPayment,
    };
  }, [subscriptions]);
}
