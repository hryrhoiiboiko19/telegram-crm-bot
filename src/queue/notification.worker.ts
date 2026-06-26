import { Job, Worker } from "bullmq";
import { NOTIFICATION_QUEUE_NAME, NotificationJobData } from "./types.js";
import { Logger } from "../utils/logger/index.js";
import { notificationService } from "../services/notification..service.js";
import { env } from "../config/env.js";

export function startNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const { userId, orderId, userLocale, newStatus } = job.data;
      Logger.info(`Processing job ${job.id} for user ${userId}`);

      await notificationService.sendStatusUpdate(
        userId,
        orderId,
        userLocale,
        newStatus,
      );
    },
    {
      connection: env.REDIS,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    Logger.info(`Job ${job.id} has been completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    Logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  Logger.info("🚀 Notification Background Worker started successfully.");
  return worker;
}
