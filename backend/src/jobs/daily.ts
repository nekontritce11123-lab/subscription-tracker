import cron from 'node-cron';
import { bot } from '../bot/index.js';
import { config } from '../config.js';
import { getAllUsers } from '../database/repositories/users.js';
import { getSubscriptionsByUserId } from '../database/repositories/subscriptions.js';
import {
  getOverdueSubscriptions,
  getDueTomorrowSubscriptions,
  formatAmount,
} from '../services/notifications.js';
import { Subscription, OverdueSubscription } from '../types.js';

/**
 * Send reminder for subscription due tomorrow (simple message, no buttons)
 */
async function sendReminderMessage(userId: number, sub: Subscription): Promise<void> {
  const icon = sub.emoji || sub.icon;
  const message =
    `📢 Напоминание!\n\n` +
    `Завтра оплата подписки:\n` +
    `${icon} ${sub.name}\n` +
    `💰 ${formatAmount(sub.amount, sub.currency)}`;

  try {
    await bot.api.sendMessage(userId, message);
  } catch (error) {
    console.error(`[Notifications] Failed to send reminder to user ${userId}:`, error);
  }
}

/**
 * Send notification for overdue or due-today subscription (with buttons)
 */
async function sendOverdueMessage(
  userId: number,
  item: OverdueSubscription
): Promise<void> {
  const { subscription: sub, overdueDays, isDueToday } = item;
  const icon = sub.emoji || sub.icon;

  let message: string;

  if (isDueToday) {
    message =
      `🔔 Сегодня оплата!\n\n` +
      `${icon} ${sub.name}\n` +
      `💰 ${formatAmount(sub.amount, sub.currency)}`;
  } else {
    const daysText =
      overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней';
    message =
      `⚠️ Просрочен платеж!\n\n` +
      `${icon} ${sub.name}\n` +
      `💰 ${formatAmount(sub.amount, sub.currency)}\n` +
      `📅 Просрочено на ${overdueDays} ${daysText}`;
  }

  try {
    await bot.api.sendMessage(userId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Оплатил сегодня', callback_data: `paid_today:${sub.id}` }],
          [
            {
              text: '📱 Укажу когда оплатил',
              web_app: { url: `${config.webAppUrl}?subscription=${sub.id}` },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error(`[Notifications] Failed to send to user ${userId}:`, error);
  }
}

/**
 * Process all users and send notifications
 */
async function sendDailyNotifications(): Promise<void> {
  console.log('[Notifications] Starting daily check...');

  try {
    const users = await getAllUsers();
    let reminders = 0;
    let overdueNotifications = 0;

    for (const user of users) {
      const subscriptions = await getSubscriptionsByUserId(user.id);

      // 1. Due tomorrow — simple reminder message (no buttons)
      const dueTomorrow = getDueTomorrowSubscriptions(subscriptions);
      for (const sub of dueTomorrow) {
        await sendReminderMessage(user.id, sub);
        reminders++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // 2. Due today or overdue — message with buttons
      const overdueItems = getOverdueSubscriptions(subscriptions);
      for (const item of overdueItems) {
        await sendOverdueMessage(user.id, item);
        overdueNotifications++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `[Notifications] Sent ${reminders} reminders, ${overdueNotifications} overdue notifications to ${users.length} users`
    );
  } catch (error) {
    console.error('[Notifications] Error:', error);
  }
}

/**
 * Start daily cron job at 10:00 Moscow time (MSK = UTC+3)
 */
export function startDailyJob(): void {
  // Schedule for 10:00 Moscow time
  cron.schedule('0 10 * * *', sendDailyNotifications, {
    scheduled: true,
    timezone: 'Europe/Moscow',
  });

  console.log('[Jobs] Daily notification job scheduled for 10:00 MSK');
}

// Export for manual triggering (testing)
export { sendDailyNotifications };
