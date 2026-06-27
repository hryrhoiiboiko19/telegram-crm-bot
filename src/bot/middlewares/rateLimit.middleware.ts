import type { Redis } from "ioredis";
import type { Middleware } from "grammy";
import { Logger } from "../../utils/logger/index.js";
import { i18nMiddleware } from "./i18n.middleware.js";
import { botRateLimitRejectionsTotal } from "../../metrics/index.js";

const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export function createRateLimitMiddleware(redis: Redis): Middleware {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    const redisKey = `ratelimit:${userId}`;

    try {
      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.expire(redisKey, RATE_LIMIT_WINDOW_SECONDS);
      }

      if (count > RATE_LIMIT_MAX_REQUESTS) {
        Logger.warn(`User ${userId} is rate-limited.`);
        botRateLimitRejectionsTotal.inc();

        const locale = ctx.from?.language_code ?? "en";
        const message = i18nMiddleware.translate(
          locale,
          "rate_limit_exceeded",
        );

        await ctx.reply(message);
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery();
        }
        return;
      }
    } catch (error) {
      Logger.error(["Rate limit check failed, allowing request", error as Error]);
    }

    return next();
  };
}