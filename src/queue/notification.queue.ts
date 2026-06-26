import { Queue } from "bullmq";
import { NotificationJobData, NOTIFICATION_QUEUE_NAME } from "./types.js";
import { env } from "../config/env.js";
import { Logger } from "../utils/logger/index.js";

export const notificationQueue = new Queue<NotificationJobData>(
  NOTIFICATION_QUEUE_NAME,
  {
    connection: env.REDIS,
  },
);

export async function addNotificationJob(data: NotificationJobData) {
  try {
    const jobName = `status_update_order_${data.orderId}`;
    await notificationQueue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    Logger.info(`Job ${jobName} successfully added to the queue.`);
  } catch (error) {
    Logger.error(["Failed to add job to notification queue:", error as Error]);
  }
}
