import { InlineKeyboardButton } from "grammy/types";
import { env } from "../../config/env.js";
import { BotContext } from "../types/index.js";
import { orderRepository } from "../../repositories/order.repository.js";
import { Order } from "../../database/schema.js";
import { googleSheetsService } from "../../services/google-sheets.service.js";
import { addNotificationJob } from "../../queue/notification.queue.js";
import { adminIds, availableLocales } from "../constants/index.js";

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
  recentOrderUpdated: { orderId: number } = { orderId: 0 },
) {
  await ctx.answerCallbackQuery();
  ctx.session.paginationOffset = paginationOffset;

  let haveToReply: boolean = false;

  if (ctx.callbackQuery?.data?.startsWith("admin_view_")) {
    haveToReply = true;
  }
  const totalPendingCount: number = await orderRepository.countTotalPending();

  const activeOrder = await orderRepository.findPendingOrder(paginationOffset);

  renderOrders(
    ctx,
    activeOrder,
    paginationOffset,
    totalPendingCount,
    haveToReply,
    recentOrderUpdated,
  );
}

function renderOrders(
  ctx: BotContext,
  order: Order | null,
  paginationOffset: number,
  totalPendingCount: number,
  haveToReply: boolean,
  recentOrderUpdated: { orderId: number },
) {
  if (!order) {
    ctx.reply("No pending orders.");
    return;
  }

  let updatedString: string = "";

  if (recentOrderUpdated.orderId != 0) {
    updatedString = `Updated order with id: ${recentOrderUpdated.orderId}\n\n`;
  }
  const orderDescription = `${updatedString}Service: ${order.serviceType}\nDescription: ${order.description}\n,Created At: ${order.createdAt}`;
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
  await handleOrderStatusUpdate(ctx, "confirmed", "CONFIRMED");

  await handleAddNotificationJob(ctx, "confirmed");
}

export async function adminCancelOrder(ctx: BotContext) {
  await handleOrderStatusUpdate(ctx, "cancelled", "CANCELLED");

  await handleAddNotificationJob(ctx, "cancelled");
}

async function handleOrderStatusUpdate(
  ctx: BotContext,
  dbStatus: "confirmed" | "cancelled",
  status: "CONFIRMED" | "CANCELLED",
): Promise<void> {
  await ctx.answerCallbackQuery();

  const orderId = parseInt(ctx.match![1]);

  await orderRepository.updateStatus(orderId, dbStatus);

  const newTotal = await orderRepository.countTotalPending();
  const offset = Math.max(
    0,
    Math.min(ctx.session.paginationOffset ?? 0, newTotal - 1),
  );
  newTotal === 0
    ? await ctx.editMessageText(
        `Order #${orderId} status updated to ${status}.`,
      )
    : await adminViewOrders(ctx, offset, { orderId });
}

async function handleAddNotificationJob(
  ctx: BotContext,
  newStatus: "confirmed" | "cancelled",
) {
  const orderId = parseInt(ctx.match![1]);

  const orderWithUser = await orderRepository.getOrderWithUser(orderId);
  const userTelegramId = Number(orderWithUser.user.telegramId);
  const userLocale = availableLocales.includes(
    orderWithUser.user.languageCode!,
  )!
    ? orderWithUser.user.languageCode!
    : "en";

  await addNotificationJob({
    userTelegramId,
    orderId,
    newStatus,
    userLocale,
  });
}

export async function adminOrderPagination(ctx: BotContext) {
  const offset = parseInt(ctx.match![1]);
  adminViewOrders(ctx, offset);
}
