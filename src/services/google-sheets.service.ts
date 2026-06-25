import { env } from "../config/env.js";
import { Order } from "../database/schema.js";
import { Logger } from "../utils/logger/index.js";

export interface IGoogleSheetsService {
  exportOrders(ordersMatrix: Order[]): Promise<boolean>;
}

export class GoogleSheetsService implements IGoogleSheetsService {
  async exportOrders(ordersMatrix: Order[]): Promise<boolean> {
    try {
      Logger.info("Starting Google Sheets export process...");

      const webhookUrl = env.GOOGLE_SHEETS_WEBHOOK_URL;

      const formattedRows = ordersMatrix.map((order) => {
        return [
          order.id.toString(),
          order.userId.toString(),
          order.serviceType,
          order.description || "N/A",
          order.status,
        ];
      });

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formattedRows }),
      });

      if (!response.ok) {
        throw new Error(
          `Google Sheets Webhook returned status: ${response.status}`,
        );
      }
      Logger.info("Google Sheets export finished successfully!");
      return true;
    } catch (err) {
      Logger.error(["Google Sheets export service failed", err as Error]);
      return false;
    }
  }
}

export const googleSheetsService: IGoogleSheetsService =
  new GoogleSheetsService();
