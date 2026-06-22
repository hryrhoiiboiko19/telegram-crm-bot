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
        return {
          id: order.id,
          userId: order.userId,
          serviceType: order.serviceType,
          description: order.description || "N/A",
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        };
      });

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedRows),
      });

      if (response.status != 200) {
        new Error("Failed to push data to Google Sheets");
      }
      Logger.info("Google Sheets export finished successfully!");
      return true;
    } catch (err) {
      Logger.error(["Google Sheets export service failed", err as Error]);
      return false;
    }
  }
}
