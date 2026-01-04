import { initDatabase } from './database/index.js';
import { startApi } from './api/index.js';
import { startBot, stopBot } from './bot/index.js';
import { startDailyJob } from './jobs/daily.js';

async function main(): Promise<void> {
  console.log('🚀 Starting Subscription Tracker Backend...\n');

  try {
    // Initialize database
    await initDatabase();

    // Start API server
    await startApi();

    // Start Telegram bot
    await startBot();

    // Start daily notification job
    startDailyJob();

    console.log('\n✅ All systems running!\n');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await stopBot();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down...');
  await stopBot();
  process.exit(0);
});

main();
