import "dotenv";
import { z } from "zod";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GOOGLE_SHEETS_WEBHOOK_URL: z
    .string()
    .min(1, "GOOGLE_SHEETS_WEBHOOK_URL is required"),
  ADMIN_IDS: z
    .string()
    .min(1, "ADMIN_IDS is required (comma-separated Telegram user IDs)"),
  REDIS_HOST: z.string().default("redis"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().default(""),
  // Optional: webhook mode (when set, bot runs in webhook mode via HTTP server)
  WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  WEBHOOK_SECRET: z.string().default(""),
  PORT: z.coerce.number().int().positive().default(3000),
  METRICS_PORT: z.coerce.number().int().positive().default(9100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

const envValues = parsed.data;

export const env = {
  BOT_TOKEN: envValues.BOT_TOKEN,
  DATABASE_URL: envValues.DATABASE_URL,
  GOOGLE_SHEETS_WEBHOOK_URL: envValues.GOOGLE_SHEETS_WEBHOOK_URL,
  ADMIN_IDS: envValues.ADMIN_IDS,
  REDIS: {
    host: envValues.REDIS_HOST,
    port: envValues.REDIS_PORT,
    password: envValues.REDIS_PASSWORD,
  },
  WEBHOOK_URL: envValues.WEBHOOK_URL || undefined,
  WEBHOOK_SECRET: envValues.WEBHOOK_SECRET,
  PORT: envValues.PORT,
  METRICS_PORT: envValues.METRICS_PORT,
};

export type Env = typeof env;