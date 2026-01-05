import { useMemo } from 'react';
import { Subscription, TimelineEvent, TimelineSubscription, MonthData } from '../types/subscription';
import { getDaysUntil } from './useStats';

export function useTimelineData(subscriptions: Subscription[]): MonthData {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const today = now.getDate();

    // Get localized month name
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Group subscriptions by billing day
    const subscriptionsByDay = new Map<number, TimelineSubscription[]>();
    let totalAmount = 0;
    let paidAmount = 0;
    let remainingAmount = 0;
    let lastPaymentDay = 0;
    let nextPayment: MonthData['nextPayment'] = null;

    for (const sub of subscriptions) {
      // Adjust billing day if month has fewer days
      const billingDay = Math.min(sub.billingDay, daysInMonth);
      const daysUntil = getDaysUntil(sub.billingDay, sub.startDate);

      // isPast: billing day passed OR it's today but subscription started today (already paid)
      const isPast = billingDay < today && daysUntil > 0;

      // Calculate monthly equivalent (divide by period for yearly/quarterly subs)
      const periodMonths = sub.periodMonths || 1;
      const monthlyAmount = sub.isTrial ? 0 : sub.amount / periodMonths;
      totalAmount += monthlyAmount;

      if (isPast) {
        paidAmount += sub.amount;
      } else {
        remainingAmount += sub.amount;

        // Track next payment (closest upcoming)
        if (!nextPayment || daysUntil < nextPayment.daysUntil) {
          nextPayment = {
            name: sub.name,
            daysUntil,
            amount: sub.amount,
          };
        }
      }

      // Track last payment day for daysToSurvive
      if (!isPast && billingDay > lastPaymentDay) {
        lastPaymentDay = billingDay;
      }

      const timelineSub: TimelineSubscription = {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        amount: sub.amount,
        currency: sub.currency,
        isTrial: sub.isTrial ?? false,
        isPaid: isPast,
        daysUntil,
      };

      const existing = subscriptionsByDay.get(billingDay) || [];
      existing.push(timelineSub);
      subscriptionsByDay.set(billingDay, existing);
    }

    // Generate timeline events for all days
    const events: TimelineEvent[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const subs = subscriptionsByDay.get(day) || [];
      const isPast = day < today;
      const isToday = day === today;
      const daysFromToday = day - today;

      events.push({
        day,
        subscriptions: subs,
        isPast,
        isToday,
        isUrgent: !isPast && daysFromToday >= 0 && daysFromToday <= 3 && subs.length > 0,
        date: new Date(currentYear, currentMonth, day),
      });
    }

    // Calculate days to survive (until last payment)
    const daysToSurvive = lastPaymentDay > today ? lastPaymentDay - today : 0;

    return {
      name: capitalizedMonth,
      year: currentYear,
      daysInMonth,
      today,
      events,
      totalAmount,
      paidAmount,
      remainingAmount,
      subscriptionCount: subscriptions.length,
      daysToSurvive,
      nextPayment,
    };
  }, [subscriptions]);
}
