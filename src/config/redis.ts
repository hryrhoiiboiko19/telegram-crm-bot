import { Redis } from "ioredis";
import { env } from "./env.js";
import { Logger } from "../utils/logger/index.js";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS);
    redisInstance.on("error", (error) =>
      Logger.error(["Redis client error", error as Error]),
    );
    Logger.info("Redis connection established");
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    Logger.info("Redis connection closed");
  }
}

export function resetRedisForTesting(): void {
  redisInstance = null;
}