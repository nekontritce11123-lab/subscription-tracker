import { Context } from 'grammy';
import { config } from '../../config.js';
import { upsertUser } from '../../database/repositories/users.js';

export async function handleStart(ctx: Context): Promise<void> {
  const user = ctx.from;

  if (!user) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  // Save/update user in database
  await upsertUser({
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    language_code: user.language_code,
  });

  const isRussian = user.language_code === 'ru';

  const welcomeMessage = isRussian
    ? `👋 Привет, ${user.first_name}!\n\nЯ помогу отслеживать твои подписки и напоминать об оплате.\n\n📱 Нажми кнопку ниже, чтобы открыть трекер:`
    : `👋 Hello, ${user.first_name}!\n\nI'll help you track your subscriptions and remind you about payments.\n\n📱 Press the button below to open the tracker:`;

  const buttonText = isRussian ? '📱 Открыть трекер' : '📱 Open tracker';

  await ctx.reply(welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: buttonText,
            web_app: { url: config.webAppUrl },
          },
        ],
      ],
    },
  });
}
