import cron from 'node-cron';
import { bot } from '../bot/index.js';
import { config } from '../config.js';
import { getAllUsers } from '../database/repositories/users.js';
import { getSubscriptionsByUserId } from '../database/repositories/subscriptions.js';
import { getOverdueSubscriptions, formatAmount } from '../services/notifications.js';

/**
 * Send notification for a single overdue subscription
 */
async function sendNotification(
  userId: number,
  subscription: { subscription: any; overdueDays: number; isDueToday: boolean }
): Promise<void> {
  const { subscription: sub, overdueDays, isDueToday } = subscription;

  let message: string;
  let emoji: string;

  if (isDueToday) {
    emoji = '🔔';
    message = `${emoji} Сегодня оплата!\n\n`;
    message += `📦 ${sub.name}\n`;
    message += `💰 ${formatAmount(sub.amount, sub.currency)}\n\n`;
    message += `Не забудь оплатить подписку!`;
  } else {
    emoji = '⚠️';
    const daysText = overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней';
    message = `${emoji} Просрочен платеж!\n\n`;
    message += `📦 ${sub.name}\n`;
    message += `💰 ${formatAmount(sub.amount, sub.currency)}\n`;
    message += `📅 Просрочено на ${overdueDays} ${daysText}\n\n`;
    message += `Оплати как можно скорее!`;
  }

  try {
    await bot.api.sendMessage(userId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Оплатил', callback_data: `paid:${sub.id}` },
            { text: '📱 Открыть', web_app: { url: `${config.webAppUrl}?subscription=${sub.id}` } },
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
    let totalNotifications = 0;

    for (const user of users) {
      const subscriptions = await getSubscriptionsByUserId(user.id);
      const overdueItems = getOverdueSubscriptions(subscriptions);

      for (const item of overdueItems) {
        await sendNotification(user.id, item);
        totalNotifications++;

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[Notifications] Sent ${totalNotifications} notifications to ${users.length} users`);
  } catch (error) {
    console.error('[Notifications] Error:', error);
  }
}

/**
 * Start daily cron job at 12:00 Moscow time (MSK = UTC+3)
 */
export function startDailyJob(): void {
  // Schedule for 12:00 Moscow time
  cron.schedule('0 12 * * *', sendDailyNotifications, {
    scheduled: true,
    timezone: 'Europe/Moscow',
  });

  console.log('[Jobs] Daily notification job scheduled for 12:00 MSK');
}

// Export for manual triggering (testing)
export { sendDailyNotifications };
