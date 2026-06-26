export interface NotificationJobData {
  userTelegramId: number;
  userLocale: string;
  orderId: number;
  newStatus: string;
}

export const NOTIFICATION_QUEUE_NAME = "notification-queue";
