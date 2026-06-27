import { InlineKeyboardButton } from "grammy/types";
import { BotContext } from "../types/index.js";
import { orderRepository } from "../../repositories/order.repository.js";
import { userRepository } from "../../repositories/user.repository.js";
import { googleSheetsService } from "../../services/google-sheets.service.js";
import { isAdmin } from "../helpers/index.js";
import { Logger } from "../../utils/logger/index.js";

export async function admin(ctx: BotContext) {
  if (!(await isAdmin(ctx))) return;

  Logger.info(`Admin panel opened by user ${ctx.from?.id}`);

  const inline_keyboard: InlineKeyboardButton[][] = [
    [
      {
        text: ctx.t("admin_export"),
        callback_data: "admin_export_sheets",
      },
    ],
    [
      {
        text: ctx.t("admin_view_active_orders"),
        callback_data: "admin_view_orders",
      },
    ],
  ];

  await ctx.reply(ctx.t("admin_greetings"), {
    reply_markup: {
      inline_keyboard,
    },
  });
}

export async function adminExportSheets(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(ctx.t("admin_fetching_orders"));

  Logger.info(`Admin ${ctx.from?.id} triggered Google Sheets export`);

  const allOrders = await orderRepository.findAll();
  const success = await googleSheetsService.exportOrders(allOrders);

  if (success) {
    Logger.info("Google Sheets export completed successfully");
    await ctx.reply(ctx.t("admin_successful_export"));
  } else {
    Logger.warn("Google Sheets export failed");
    await ctx.reply(ctx.t("admin_failed_export"));
  }
}

export async function adminStats(ctx: BotContext) {
  if (!(await isAdmin(ctx))) return;

  Logger.info(`Admin ${ctx.from?.id} requested stats`);

  const stats = await orderRepository.getStats();

  await ctx.reply(
    ctx.t("admin_get_stats", {
      pending: stats.pending,
      confirmed: stats.confirmed,
      completed: stats.completed,
      cancelled: stats.cancelled,
      conversionRate: stats.conversionRate,
      mostPopularService: stats.mostPopularService ?? "—",
    }),
  );
}

const BROADCAST_DELAY_MS = 50;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function adminBroadcast(ctx: BotContext) {
  if (!(await isAdmin(ctx))) return;

  const message = typeof ctx.match === "string" ? ctx.match : "";

  if (message.trim().length === 0) {
    await ctx.reply(ctx.t("admin_broadcast_missing_message"));
    return;
  }

  Logger.info(`Admin ${ctx.from?.id} started broadcast`);

  const users = await userRepository.findAll();

  if (users.length === 0) {
    Logger.warn("Broadcast attempted but no users found in database");
    await ctx.reply(ctx.t("admin_broadcast_started", { count: 0 }));
    await ctx.reply(ctx.t("admin_broadcast_success", { success: 0, failed: 0 }));
    return;
  }

  await ctx.reply(ctx.t("admin_broadcast_started", { count: users.length }));

  let success = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await ctx.api.sendMessage(Number(user.telegramId), message);
      success++;
    } catch (error) {
      failed++;
      Logger.warn([
        `Broadcast failed for telegramId ${user.telegramId}`,
        error as Error,
      ]);
    }

    await sleep(BROADCAST_DELAY_MS);
  }

  Logger.info(
    `Broadcast finished: ${success} delivered, ${failed} failed out of ${users.length} users`,
  );

  await ctx.reply(
    ctx.t("admin_broadcast_success", { success, failed }),
  );
}