import { eq, desc } from "drizzle-orm";
import {
  NewOrder,
  Order,
  orders,
  OrderStatus,
  users,
} from "../database/schema.js";
import { Logger } from "../utils/logger/index.js";
import { db } from "../config/database.js";

export const orderRepository = {
  /**
   * Create a new order/request by a client
   */
  async create(orderData: NewOrder): Promise<Order> {
    try {
      const [newOrder] = await db.insert(orders).values(orderData).returning();

      Logger.info(
        `Successfully created order ID: ${newOrder.id} for user ID: ${newOrder.userId}`,
      );
      return newOrder;
    } catch (error) {
      Logger.error(["Failed to create new order", error as Error]);
      throw error;
    }
  },

  /**
   * Fetch order history for a specific user
   */
  async findByUserId(userId: number): Promise<Order[]> {
    try {
      const results = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      Logger.info(`Fetched ${results.length} orders for user ID: ${userId}`);
      return results;
    } catch (error) {
      Logger.error([
        `Failed to fetch orders for user ID: ${userId}`,
        error as Error,
      ]);
      throw error;
    }
  },

  /**
   * Fetch all orders in the system
   */
  async findAll(): Promise<Order[]> {
    try {
      const results = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));

      Logger.info(
        `Fetched all orders from database. Total count: ${results.length}`,
      );
      return results;
    } catch (error) {
      Logger.error([
        "Failed to fetch all orders from database",
        error as Error,
      ]);
      throw error;
    }
  },

  /**
   * Fetch all orders in the system with status "pending"
   */
  async findPendingOrder(
    offset: number = 0,
    limit: number = 1,
  ): Promise<Order | null> {
    try {
      const results = await db
        .select()
        .from(orders)
        .where((order) => eq(order.status, "pending"))
        .offset(offset)
        .limit(limit)
        .orderBy(desc(orders.createdAt));

      Logger.info(
        `Fetched all orders from database with status "pending". Total count: ${results.length}`,
      );
      return results[0] ?? null;
    } catch (error) {
      Logger.error([
        "Failed to fetch all orders with status 'pending' from database",
        error as Error,
      ]);
      throw error;
    }
  },

  async countTotalPending(): Promise<number> {
    try {
      const results = await db
        .select()
        .from(orders)
        .where((order) => eq(order.status, "pending"));

      Logger.info(
        `Fetched count of orders from database with status "pending". Total count: ${results.length}`,
      );
      return results.length;
    } catch (error) {
      Logger.error([
        "Failed to fetch count of orders with status 'pending' from database",
        error as Error,
      ]);
      throw error;
    }
  },

  /**
   * Update order status by administrators (e.g., pending -> confirmed)
   */
  async updateStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<Order | null> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrder) {
        Logger.info(
          `Successfully updated status for order ID: ${orderId} to '${status}'`,
        );
      } else {
        Logger.warn(
          `Attempted to update status for non-existent order ID: ${orderId}`,
        );
      }

      return updatedOrder || null;
    } catch (error) {
      Logger.error([
        `Failed to update status for order ID: ${orderId}`,
        error as Error,
      ]);
      throw error;
    }
  },

  async getOrderWithUser(orderId: number) {
    try {
      const result = await db
        .select({
          orderId: orders.id,
          status: orders.id,
          user: {
            telegramId: users.telegramId,
            languageCode: users.languageCode,
          },
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.id, orderId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      throw error;
    }
  },
};
