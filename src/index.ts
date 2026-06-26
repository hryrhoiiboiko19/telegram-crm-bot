import { bot } from "./bot/bot.js";
import { startNotificationWorker } from "./queue/notification.worker.js";
import { Logger } from "./utils/logger/index.js";

async function bootstrap() {
  startNotificationWorker();

  bot.start();
  Logger.info("Bot is running...");
}

bootstrap();
