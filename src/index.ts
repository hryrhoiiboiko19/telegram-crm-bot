import { bot } from "./bot/bot.js";
import { startNotificationWorker } from "./queue/notification.worker.js";
import { startMetricsServer, stopMetricsServer } from "./metrics/server.js";
import { startWebhookServer } from "./webhook.js";
import { startQueueMetricsPoller, stopQueueMetricsPoller, instrumentWorker } from "./metrics/queue.js";
import { closeRedis } from "./config/redis.js";
import { pool } from "./config/database.js";
import { env } from "./config/env.js";
import { Logger } from "./utils/logger/index.js";

async function bootstrap() {
  const worker = startNotificationWorker();
  instrumentWorker(worker);
  startQueueMetricsPoller();

  startMetricsServer();

  if (env.WEBHOOK_URL) {
    const webhookUrl = `${env.WEBHOOK_URL}/${env.WEBHOOK_SECRET}`;
    await bot.api.setWebhook(webhookUrl);
    Logger.info(`Webhook registered: ${webhookUrl}`);
    const webhookServer = startWebhookServer();
    registerShutdown(async () => {
      await new Promise<void>((resolve) =>
        webhookServer.close(() => resolve()),
      );
      await bot.api.deleteWebhook();
    });
  } else {
    bot.start({
      onStart: () => Logger.info(`Bot started in long-polling mode`),
    });
    registerShutdown(async () => {
      bot.stop();
    });
  }

  registerShutdown(async () => {
    stopQueueMetricsPoller();
    await worker.close();
    stopMetricsServer();
    await pool.end();
    await closeRedis();
    Logger.info("Graceful shutdown completed");
  });

  Logger.info("Telegram CRM Bot is running...");
}

function registerShutdown(fn: () => Promise<void>): void {
  shutdownHandlers.push(fn);
}

const shutdownHandlers: (() => Promise<void>)[] = [];
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  Logger.info(`Received ${signal}, shutting down gracefully...`);
  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error) {
      Logger.error(["Error during shutdown handler", error as Error]);
    }
  }
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

bootstrap().catch((error) => {
  Logger.error(["Fatal error during bootstrap", error as Error]);
  process.exit(1);
});