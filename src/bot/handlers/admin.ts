import { InlineKeyboardButton } from "grammy/types";
import { env } from "../../config/env.js";
import { BotContext } from "../types/index.js";
import { googleSheetsService } from "../bot.js";
import { orderRepository } from "../../repositories/order.repository.js";

const adminIds = env.ADMIN_IDS.split(",");

export async function admin(ctx: BotContext) {
  if (!adminIds.includes(String(ctx.from?.id))) {
    await ctx.reply(ctx.t("admin_access_denied"));
    return;
  }

  const keyboard: InlineKeyboardButton[][] = [
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
      inline_keyboard: keyboard,
    },
  });
}

export async function adminExportSheets(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(ctx.t("admin_fetching_orders"));

  const allOrders = await orderRepository.findAll();

  const success = await googleSheetsService.exportOrders(allOrders);

  if (success) {
    await ctx.reply(ctx.t("admin_successfull_export"));
  } else {
    await ctx.reply(ctx.t("admin_failed_export"));
  }
}

export async function adminViewOrders(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const activeOrders = await orderRepository.findPending();

  // TODO: Add pagination

  const keyboardTemplate = (orderId: number): InlineKeyboardButton[][] => {
    return [
      [{ text: "✅ Confirm", callback_data: `admin_confirm_order_${orderId}` }],
      [{ text: "❌ Cancel", callback_data: `admin_cancel_order_${orderId}` }],
    ];
  };

  activeOrders.forEach((order) => {
    const orderDescription = `Service: ${order.serviceType}\nDescription: ${order.description}\n,Created At: ${order.createdAt}`;
    ctx.reply(orderDescription, {
      reply_markup: { inline_keyboard: keyboardTemplate(order.id) },
    });
  });
}

export async function adminConfirmOrder(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const orderId = parseInt(ctx.match![1]);

  await orderRepository.updateStatus(orderId, "confirmed");

  await ctx.editMessageText(`Order #${orderId} status updated to CONFIRMED.`);
}

export async function adminCancelOrder(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const orderId = parseInt(ctx.match![1]);

  await orderRepository.updateStatus(orderId, "cancelled");

  await ctx.editMessageText(`Order #${orderId} status updated to CANCELLED.`);
}
