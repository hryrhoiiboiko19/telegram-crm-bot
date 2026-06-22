import { Logger } from "../../utils/logger/index.js";
import type { Middleware } from "grammy";

export const loggerMiddleware: Middleware = async (ctx, next) => {
  const startedAt = Date.now();
  await next();
  const elapsedMs = Date.now() - startedAt;

  const from = ctx.from?.username ?? ctx.from?.id ?? "unknown";
  const text = ctx.message?.text ?? ctx.channelPost?.text ?? "(non-text)";
  Logger.info([`${from}: ${text}`, `(${elapsedMs}ms)`]);
};
