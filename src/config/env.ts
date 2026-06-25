import "dotenv";

const redisConfig = {
  PASSWORD: process.env.REDIS_PASSWORD!,
  HOST: process.env.REDIS_HOST || "redis",
  PORT: Number(process.env.REDIS_PORT) || 6379,
};

export const env = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  DATABASE_URL: process.env.DATABASE_URL!,
  GOOGLE_SHEETS_WEBHOOK_URL: process.env.GOOGLE_SHEETS_WEBHOOK_URL!,
  ADMIN_IDS: process.env.ADMIN_IDS!,
  REDIS: redisConfig,
};
