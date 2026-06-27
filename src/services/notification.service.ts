import { bot } from "../bot/bot.js";
import { i18nMiddleware } from "../bot/middlewares/i18n.middleware.js";
import { Logger } from "../utils/logger/index.js";
import { botNotificationsTotal } from "../metrics/index.js";

export interface INotificationService {
  sendStatusUpdate: (
    userTelegramId: number,
    orderId: number,
    userLocale: string,
    status: string,
  ) => Promise<void>;
}

export class NotificationService implements INotificationService {
  async sendStatusUpdate(
    userTelegramId: number,
    orderId: number,
    userLocale: string,
    status: string,
  ): Promise<void> {
    const i18n = i18nMiddleware; // can be replaced with other provider

    try {
      const message = `${i18n.translate(userLocale, "order_update_notification", { orderId, status })}`;

      await bot.api.sendMessage(userTelegramId, message);
      Logger.info(
        `Notification sent to user ${userTelegramId} for order ${orderId}`,
      );
      botNotificationsTotal.inc({ result: "success" });
    } catch (error) {
      Logger.error([
        `Failed to send telegram message to ${userTelegramId}:`,
        error as Error,
      ]);
      botNotificationsTotal.inc({ result: "failure" });

      throw error;
    }
  }
}

export const notificationService: INotificationService =
  new NotificationService();
