import { Bot } from 'grammy';
import { config } from '../config.js';
import { handleStart } from './commands/start.js';
import { handlePaidCallback, handlePaidTodayCallback, handlePaidYesterdayCallback, handleOpenCallback } from './callbacks/paid.js';

export const bot = new Bot(config.botToken);

// Commands
bot.command('start', handleStart);

// Callbacks - specific patterns must be before generic ones
bot.callbackQuery(/^paid_today:/, handlePaidTodayCallback);
bot.callbackQuery(/^paid_yesterday:/, handlePaidYesterdayCallback);
bot.callbackQuery(/^paid:/, handlePaidCallback);
bot.callbackQuery(/^open:/, handleOpenCallback);

// Error handling
bot.catch((err) => {
  console.error('[Bot] Error:', err);
});

export async function startBot(): Promise<void> {
  // Set bot commands
  await bot.api.setMyCommands([
    { command: 'start', description: 'Открыть трекер подписок' },
  ]);

  // Set menu button to open Mini App
  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Открыть',
      web_app: { url: config.webAppUrl },
    },
  });

  // Start polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`[Bot] Started as @${botInfo.username}`);
    },
  });
}

export async function stopBot(): Promise<void> {
  await bot.stop();
  console.log('[Bot] Stopped');
}
