import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { BotContext } from "./types/index.js";
import {
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { i18nMiddleware, loggerMiddleware, setupErrorBoundary } from "./middlewares/index.js";
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
import { Redis } from "ioredis";

export const bot = new Bot<ConversationFlavor<BotContext>>(env.BOT_TOKEN);

function initial(): SessionData {
  return { paginationOffset: null };
}

const redis = new Redis(env.REDIS);

const redisAdapter = new RedisAdapter({ instance: redis });

bot.use(session({ initial, storage: redisAdapter }));
bot.use(loggerMiddleware);
bot.use(i18nMiddleware);
bot.use(conversations());
bot.use(createConversation(orderConversation));

setupErrorBoundary(bot);

bot.command("start", (ctx) => start(ctx));
bot.command("admin", (ctx) => admin(ctx));
bot.command("stats", (ctx) => adminStats(ctx));
bot.command("broadcast", (ctx) => adminBroadcast(ctx));
bot.command("order", (ctx) => order(ctx));

bot.on("message", (ctx) => ctx.reply(ctx.t("unknown_command")));

bot.callbackQuery("admin_export_sheets", async (ctx) => adminExportSheets(ctx));
bot.callbackQuery("admin_view_orders", async (ctx) => adminViewOrders(ctx));
bot.callbackQuery(/^admin_confirm_order_(\d+)$/, async (ctx) =>
  adminConfirmOrder(ctx),
);
bot.callbackQuery(/^admin_cancel_order_(\d+)$/, async (ctx) =>
  adminCancelOrder(ctx),
);
bot.callbackQuery(/^admin_order_pagination_offset_(\d+)$/, async (ctx) =>
  adminOrderPagination(ctx),
);
bot.callbackQuery("noop", async (ctx) => ctx.answerCallbackQuery());
