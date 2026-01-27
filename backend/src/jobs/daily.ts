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
  const message =
    `◆ Напоминание\n\n` +
    `*${sub.name}*\n` +
    `Завтра · ${formatAmount(sub.amount, sub.currency)}`;

  try {
    await bot.api.sendMessage(userId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error(`[Notifications] Failed to send reminder to user ${userId}:`, error);
  }
}

/**
 * Build inline keyboard for overdue message
 * Shows quick date options + link to app for custom date
 */
function buildOverdueKeyboard(subId: string) {
  const isHttps = config.webAppUrl.startsWith('https://');
  const webAppUrl = `${config.webAppUrl}?subscription=${subId}`;
  // Deep link to Mini App via t.me (works for both HTTP and HTTPS)
  const deepLink = `https://t.me/${config.botUsername}?startapp=${subId}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buttons: any[][] = [
    [
      { text: 'Сегодня', callback_data: `paid_today:${subId}` },
      { text: 'Вчера', callback_data: `paid_yesterday:${subId}` },
    ],
  ];

  // Add "Other date" button
  if (isHttps) {
    buttons.push([{ text: 'Другая дата', web_app: { url: webAppUrl } }]);
  } else {
    buttons.push([{ text: 'Другая дата', url: deepLink }]);
  }

  return { inline_keyboard: buttons };
}

/**
 * Send notification for overdue or due-today subscription (with buttons)
 */
async function sendOverdueMessage(
  userId: number,
  item: OverdueSubscription
): Promise<void> {
  const { subscription: sub, overdueDays, isDueToday } = item;

  let message: string;

  if (isDueToday) {
    message =
      `● Сегодня\n\n` +
      `*${sub.name}*\n` +
      `${formatAmount(sub.amount, sub.currency)}`;
  } else {
    const daysText =
      overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней';
    message =
      `○ Просрочено\n\n` +
      `*${sub.name}*\n` +
      `${formatAmount(sub.amount, sub.currency)} · ${overdueDays} ${daysText}`;
  }

  try {
    await bot.api.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      reply_markup: buildOverdueKeyboard(sub.id),
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
