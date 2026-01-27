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

  // Update message with clean design
  await ctx.editMessageText(
    `✓ *${subscription.name}*\nОплачено · Следующий: ${nextDateStr}`,
    { parse_mode: 'Markdown', reply_markup: undefined }
  );

  await ctx.answerCallbackQuery({ text: 'Оплата подтверждена!' });
}

/**
 * Handle "Оплатил вчера" callback
 * Format: paid_yesterday:<subscription_id>
 */
export async function handlePaidYesterdayCallback(ctx: Context): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;

  if (!callbackData || !callbackData.startsWith('paid_yesterday:')) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: неверные данные' });
    return;
  }

  const subscriptionId = callbackData.replace('paid_yesterday:', '');
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.answerCallbackQuery({ text: 'Ошибка: пользователь не определен' });
    return;
  }

  const subscription = await getSubscriptionById(subscriptionId);

  if (!subscription || subscription.userId !== userId) {
    await ctx.answerCallbackQuery({ text: 'Подписка не найдена' });
    return;
  }

  // Mark as paid with yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  await markAsPaid(subscriptionId, userId, yesterdayStr);

  const nextBilling = getNextBillingDate(subscription);
  const nextDateStr = nextBilling.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  await ctx.editMessageText(
    `✓ *${subscription.name}*\nОплачено · Следующий: ${nextDateStr}`,
    { parse_mode: 'Markdown', reply_markup: undefined }
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
  const url = `${config.webAppUrl}?subscription=${subscriptionId}`;

  // For HTTPS - open Mini App directly
  if (config.webAppUrl.startsWith('https://')) {
    await ctx.answerCallbackQuery({ url });
  } else {
    // For dev (HTTP) - show instruction popup
    await ctx.answerCallbackQuery({
      text: 'Откройте приложение через кнопку меню',
      show_alert: true,
    });
  }
}
