import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import { BotContext } from "./types/index.js";
import {
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import {
  i18nMiddleware,
  loggerMiddleware,
  setupErrorBoundary,
  createRateLimitMiddleware,
  adminGuardMiddleware,
} from "./middlewares/index.js";
import { orderConversation } from "./conversations/index.js";
import {
  admin,
  adminBroadcast,
  adminCancelOrder,
  adminConfirmOrder,
  adminExportSheets,
  adminOrderPagination,
  adminStats,
  adminViewOrders,
  order,
  start,
} from "./handlers/index.js";
import { SessionData } from "./interfaces/index.js";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { botCommandsTotal, botCallbacksTotal } from "../metrics/index.js";
import type { CommandContext, CallbackQueryContext } from "grammy";

type CmdCtx = CommandContext<ConversationFlavor<BotContext>>;

function withCommandMetric(command: string, handler: (ctx: CmdCtx) => unknown) {
  return async (ctx: CmdCtx) => {
    botCommandsTotal.inc({ command });
    return handler(ctx);
  };
}

type CbCtx = CallbackQueryContext<ConversationFlavor<BotContext>>;

function withCallbackMetric(action: string, handler: (ctx: CbCtx) => unknown) {
  return async (ctx: CbCtx) => {
    botCallbacksTotal.inc({ action });
    return handler(ctx);
  };
}

export const bot = new Bot<ConversationFlavor<BotContext>>(env.BOT_TOKEN);

function initial(): SessionData {
  return { paginationOffset: null };
}

const redis = getRedis();

const redisAdapter = new RedisAdapter({ instance: redis });

bot.use(session({ initial, storage: redisAdapter }));
bot.use(createRateLimitMiddleware(redis));
bot.use(loggerMiddleware);
bot.use(i18nMiddleware);
bot.use(conversations());
bot.use(createConversation(orderConversation));

setupErrorBoundary(bot);

bot.command("start", withCommandMetric("start", (ctx) => start(ctx)));
bot.command("admin", withCommandMetric("admin", (ctx) => admin(ctx)));
bot.command("stats", withCommandMetric("stats", (ctx) => adminStats(ctx)));
bot.command("broadcast", withCommandMetric("broadcast", (ctx) => adminBroadcast(ctx)));
bot.command("order", withCommandMetric("order", (ctx) => order(ctx)));

bot.on("message", async (ctx) => {
  await ctx.reply(ctx.t("unknown_command"));
});

bot.callbackQuery(
  "admin_export_sheets",
  adminGuardMiddleware,
  withCallbackMetric("admin_export_sheets", async (ctx) => adminExportSheets(ctx)),
);
bot.callbackQuery(
  "admin_view_orders",
  adminGuardMiddleware,
  withCallbackMetric("admin_view_orders", async (ctx) => adminViewOrders(ctx)),
);
bot.callbackQuery(
  /^admin_confirm_order_(\d+)$/,
  adminGuardMiddleware,
  withCallbackMetric("admin_confirm_order", async (ctx) => adminConfirmOrder(ctx)),
);
bot.callbackQuery(
  /^admin_cancel_order_(\d+)$/,
  adminGuardMiddleware,
  withCallbackMetric("admin_cancel_order", async (ctx) => adminCancelOrder(ctx)),
);
bot.callbackQuery(
  /^admin_order_pagination_offset_(\d+)$/,
  adminGuardMiddleware,
  withCallbackMetric("admin_order_pagination_offset", async (ctx) =>
    adminOrderPagination(ctx),
  ),
);
bot.callbackQuery("noop", async (ctx) => ctx.answerCallbackQuery());