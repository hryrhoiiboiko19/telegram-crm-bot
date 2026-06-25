export interface NotificationJobData {
  userId: number;
  userLocale: string; // From session
  orderId: number;
  oldStatus?: string;
  newStatus: string;
}

export const NOTIFICATION_QUEUE_NAME = "notification-queue";
