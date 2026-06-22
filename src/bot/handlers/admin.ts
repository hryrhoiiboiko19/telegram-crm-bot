import { InlineKeyboardButton } from "grammy/types";
import { env } from "../../config/env.js";
import { BotContext } from "../types/index.js";
import { googleSheetsService } from "../bot.js";
import { orderRepository } from "../../repositories/order.repository.js";
import { Order } from "../../database/schema.js";

const adminIds = env.ADMIN_IDS.split(",");

export async function admin(ctx: BotContext) {
  if (!adminIds.includes(String(ctx.from?.id))) {
    await ctx.reply(ctx.t("admin_access_denied"));
    return;
  }

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

  const allOrders = await orderRepository.findAll();

  const success = await googleSheetsService.exportOrders(allOrders);

  if (success) {
    await ctx.reply(ctx.t("admin_successfull_export"));
  } else {
    await ctx.reply(ctx.t("admin_failed_export"));
  }
}

export async function adminViewOrders(
  ctx: BotContext,
  paginationOffset: number = 0,
) {
  await ctx.answerCallbackQuery();

  let haveToReply: boolean = false;

  if (ctx.callbackQuery?.data?.startsWith("admin_view_")) {
    haveToReply = true;
  }
  const totalPendingCount: number =
    ctx.session.pendingOrderCount ??
    (await orderRepository.countTotalPending());

  const activeOrder = await orderRepository.findPendingOrder(paginationOffset);

  renderOrders(
    ctx,
    activeOrder,
    paginationOffset,
    totalPendingCount,
    haveToReply,
  );
}

function renderOrders(
  ctx: BotContext,
  order: Order | null,
  paginationOffset: number,
  totalPendingCount: number,
  haveToReply: boolean,
) {
  if (!order) {
    ctx.reply("No pending orders.");
    return;
  }
  const orderDescription = `Service: ${order.serviceType}\nDescription: ${order.description}\n,Created At: ${order.createdAt}`;
  const msgMarkup = {
    reply_markup: {
      inline_keyboard: keyboardTemplate(
        ctx,
        order.id,
        paginationOffset,
        totalPendingCount,
      ),
    },
  };
  if (haveToReply) {
    ctx.reply(orderDescription, msgMarkup);
  } else {
    ctx.editMessageText(orderDescription, msgMarkup);
  }
}

function leftPaginationArrow(
  paginationOffset: number,
  _totalPendingCount: number,
): InlineKeyboardButton {
  const text: string = paginationOffset === 0 ? "⬛" : "⬅️";
  const callback_data: string =
    paginationOffset === 0
      ? "noop"
      : `admin_order_pagination_offset_${paginationOffset - 1}`;

  return {
    text,
    callback_data,
  };
}

function rightPaginationArrow(
  paginationOffset: number,
  totalPendingCount: number,
): InlineKeyboardButton {
  const text: string =
    totalPendingCount - paginationOffset <= 1 // we are counting the last remaining order, that's why 1
      ? "⬛"
      : "➡️";
  const callback_data: string =
    totalPendingCount - paginationOffset <= 1
      ? "noop"
      : `admin_order_pagination_offset_${paginationOffset + 1}`;

  return {
    text,
    callback_data,
  };
}

const keyboardTemplate = (
  ctx: BotContext,
  orderId: number,
  paginationOffset: number,
  totalPendingCount: number,
): InlineKeyboardButton[][] => {
  return [
    [
      {
        text: ctx.t("admin_order_approve"),
        callback_data: `admin_confirm_order_${orderId}`,
      },
    ],
    [
      {
        text: ctx.t("admin_order_cancel"),
        callback_data: `admin_cancel_order_${orderId}`,
      },
    ],
    [
      leftPaginationArrow(paginationOffset, totalPendingCount),
      { text: "⬛", callback_data: "noop" },
      rightPaginationArrow(paginationOffset, totalPendingCount),
    ],
  ];
};

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

export async function adminOrderPagination(ctx: BotContext) {
  const offset = parseInt(ctx.match![1]);
  adminViewOrders(ctx, offset);
}
