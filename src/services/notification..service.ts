import { bot } from "../bot/bot.js";
import { i18nMiddleware } from "../bot/middlewares/i18n.middleware.js";
import { Logger } from "../utils/logger/index.js";

export interface INotificationSerivce {
  sendStatusUpdate: (
    userId: number,
    orderId: number,
    userLocale: string,
    status: string,
  ) => Promise<void>;
}

export class NotificationService implements INotificationSerivce {
  async sendStatusUpdate(
    userId: number,
    orderId: number,
    userLocale: string,
    status: string,
  ): Promise<void> {
    const i18n = i18nMiddleware; // can be replaced with other provider

    try {
      const message = `${i18n.translate(userLocale, "order_update_notification", { orderId, status })}`;

      await bot.api.sendMessage(userId, message, { parse_mode: "Markdown" });
      Logger.info(`Notification sent to user ${userId} for order ${orderId}`);
    } catch (error) {
      Logger.error([
        `Failed to send telegram message to ${userId}:`,
        error as Error,
      ]);

      throw error;
    }
  }
}

export const notificationService: INotificationSerivce =
  new NotificationService();
