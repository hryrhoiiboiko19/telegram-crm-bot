export interface NotificationJobData {
  userId: number;
  userLocale: string;
  orderId: number;
  newStatus: string;
}

export const NOTIFICATION_QUEUE_NAME = "notification-queue";
