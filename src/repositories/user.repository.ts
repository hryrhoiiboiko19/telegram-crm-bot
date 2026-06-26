import { eq } from "drizzle-orm";
import { users, type NewUser, type User } from "../database/schema.js";
import { Logger } from "../utils/logger/index.js";
import { db } from "../config/database.js";

export const userRepository = {
  /**
   * Find a user by their Telegram ID
   */
  async findByTelegramId(telegramId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      if (user) {
        Logger.info(`User found with telegramId: ${telegramId}`);
      } else {
        Logger.info(`User not found with telegramId: ${telegramId}`);
      }

      return user || null;
    } catch (error) {
      Logger.error(["Failed to find user by telegramId", error as Error]);
      throw error;
    }
  },

  /**
   * Create a new user during the first bot interaction (/start)
   */
  async create(userData: NewUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(userData).returning();

      Logger.info(
        `Successfully created new user with ID: ${newUser.id} (Telegram ID: ${newUser.telegramId})`,
      );
      return newUser;
    } catch (error) {
      Logger.error(["Failed to create new user in database", error as Error]);
      throw error;
    }
  },

  /**
   * Update user's phone number when shared via Telegram contact button
   */
  async updatePhone(telegramId: string, phone: string): Promise<User | null> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ phone })
        .where(eq(users.telegramId, telegramId))
        .returning();

      if (updatedUser) {
        Logger.info(
          `Successfully updated phone number for telegramId: ${telegramId}`,
        );
      } else {
        Logger.warn(
          `Attempted to update phone for non-existent telegramId: ${telegramId}`,
        );
      }

      return updatedUser || null;
    } catch (error) {
      Logger.error(["Failed to update user phone number", error as Error]);
      throw error;
    }
  },

  /**
   * Fetch all users in the system (used for /broadcast)
   */
  async findAll(): Promise<User[]> {
    try {
      const results = await db.select().from(users);

      Logger.info(`Fetched all users from database. Total count: ${results.length}`);
      return results;
    } catch (error) {
      Logger.error(["Failed to fetch all users from database", error as Error]);
      throw error;
    }
  },
};
