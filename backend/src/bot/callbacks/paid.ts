import { Context } from 'grammy';
import { config } from '../../config.js';
import { getSubscriptionById, markAsPaid } from '../../database/repositories/subscriptions.js';
import { getNextBillingDate } from '../../services/notifications.js';

/**
 * Handle "Оплатил сегодня" callback
 * Format: paid_today:<subscription_id>
 */
export async function handlePaidTodayCallback(ctx: Context): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;

  if (!callbackData || !callbackData.startsWith('paid_today:')) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: неверные данные' });
    return;
  }

  const subscriptionId = callbackData.replace('paid_today:', '');
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: пользователь не определен' });
    return;
  }

  // Get subscription to verify ownership
  const subscription = await getSubscriptionById(subscriptionId);

  if (!subscription || subscription.userId !== userId) {
    await ctx.answerCallbackQuery({ text: 'Подписка не найдена' });
    return;
  }

  // Mark as paid with today's date
  const today = new Date().toISOString().split('T')[0];
  await markAsPaid(subscriptionId, userId, today);

  // Calculate next billing date with periodMonths
  const nextBilling = getNextBillingDate(subscription);

  const nextDateStr = nextBilling.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  // Update message
  const icon = subscription.emoji || subscription.icon;
  await ctx.editMessageText(
    `✅ ${icon} ${subscription.name} оплачена!\n\n📅 Следующий платеж: ${nextDateStr}`,
    { reply_markup: undefined }
  );

  await ctx.answerCallbackQuery({ text: 'Оплата подтверждена!' });
}

/**
 * Handle legacy "Оплатил" callback (backward compatibility)
 * Format: paid:<subscription_id>
 */
export async function handlePaidCallback(ctx: Context): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;

  if (!callbackData || !callbackData.startsWith('paid:')) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: неверные данные' });
    return;
  }

  const subscriptionId = callbackData.replace('paid:', '');
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: пользователь не определен' });
    return;
  }

  // Get subscription to verify ownership
  const subscription = await getSubscriptionById(subscriptionId);

  if (!subscription || subscription.userId !== userId) {
    await ctx.answerCallbackQuery({ text: 'Подписка не найдена' });
    return;
  }

  // Mark as paid with today's date
  const today = new Date().toISOString().split('T')[0];
  await markAsPaid(subscriptionId, userId, today);

  // Calculate next billing date with periodMonths
  const nextBilling = getNextBillingDate(subscription);

  const nextDateStr = nextBilling.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  // Update message
  const icon = subscription.emoji || subscription.icon;
  await ctx.editMessageText(
    `✅ ${icon} ${subscription.name} оплачена!\n\n📅 Следующий платеж: ${nextDateStr}`,
    { reply_markup: undefined }
  );

  await ctx.answerCallbackQuery({ text: 'Оплата подтверждена!' });
}

/**
 * Handle "Открыть" callback
 * Format: open:<subscription_id>
 */
export async function handleOpenCallback(ctx: Context): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;

  if (!callbackData || !callbackData.startsWith('open:')) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: неверные данные' });
    return;
  }

  const subscriptionId = callbackData.replace('open:', '');

  // Open Mini App with subscription parameter
  const url = `${config.webAppUrl}?subscription=${subscriptionId}`;

  await ctx.answerCallbackQuery({
    url,
  });
}
