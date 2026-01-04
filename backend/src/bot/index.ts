import { Bot } from 'grammy';
import { config } from '../config.js';
import { handleStart } from './commands/start.js';
import { handlePaidCallback, handlePaidTodayCallback, handleOpenCallback } from './callbacks/paid.js';

export const bot = new Bot(config.botToken);

// Commands
bot.command('start', handleStart);

// Callbacks - paid_today must be before paid to match first
bot.callbackQuery(/^paid_today:/, handlePaidTodayCallback);
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
