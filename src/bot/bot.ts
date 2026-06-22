import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { BotContext } from "./types/index.js";
import {
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { i18nMiddleware, loggerMiddleware } from "./middlewares/index.js";
import { orderConversation } from "./conversations/index.js";
import {
  GoogleSheetsService,
  IGoogleSheetsService,
} from "../services/google-sheets.service.js";
import {
  admin,
  adminCancelOrder,
  adminConfirmOrder,
  adminExportSheets,
  adminOrderPagination,
  adminViewOrders,
  order,
  start,
} from "./handlers/index.js";
import { SessionData } from "./interfaces/index.js";

export const bot = new Bot<ConversationFlavor<BotContext>>(env.BOT_TOKEN);

export const googleSheetsService: IGoogleSheetsService =
  new GoogleSheetsService();

function initial(): SessionData {
  return { pendingOrderCount: null };
}

bot.use(session({ initial }));
bot.use(loggerMiddleware);
bot.use(i18nMiddleware);
bot.use(conversations());
bot.use(createConversation(orderConversation));

bot.command("start", (ctx) => start(ctx));
bot.command("admin", (ctx) => admin(ctx));
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

bot.start();
