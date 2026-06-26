import { BotContext } from "../types/index.js";
import { Order } from "../../database/schema.js";
import { orderRepository } from "../../repositories/order.repository.js";
import { addNotificationJob } from "../../queue/notification.queue.js";
import { availableLocales } from "../constants/index.js";
import { Logger } from "../../utils/logger/index.js";
import { buildOrderKeyboard } from "./admin-keyboard.js";

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
    ctx.reply(ctx.t("admin_no_pending_orders"));
    return;
  }

  let updatedString: string = "";

  if (recentOrderUpdated.orderId != 0) {
    updatedString = ctx.t("admin_order_updated", {
      orderId: recentOrderUpdated.orderId,
    });
  }
  const orderDescription = ctx.t("admin_update_order", {
    updatedString,
    serviceType: order.serviceType,
    description: order.description ?? "",
    createdAt: order.createdAt,
  });
  const msgMarkup = {
    reply_markup: {
      inline_keyboard: buildOrderKeyboard(
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
  Logger.info(`Admin updating order #${orderId} to status: ${dbStatus}`);

  await orderRepository.updateStatus(orderId, dbStatus);

  const newTotal = await orderRepository.countTotalPending();
  const offset = Math.max(
    0,
    Math.min(ctx.session.paginationOffset ?? 0, newTotal - 1),
  );

  if (newTotal === 0) {
    Logger.info(`No pending orders left after order #${orderId} update`);
    await ctx.editMessageText(
      ctx.t("admin_order_status_updated", { orderId, status }),
    );
    return;
  }

  await adminViewOrders(ctx, offset, { orderId });
}

async function handleAddNotificationJob(
  ctx: BotContext,
  newStatus: "confirmed" | "cancelled",
) {
  const orderId = parseInt(ctx.match![1]);

  const orderWithUser = await orderRepository.getOrderWithUser(orderId);
  const userTelegramId = Number(orderWithUser.user.telegramId);
  const userLocale = availableLocales.includes(orderWithUser.user.languageCode!)
    ? orderWithUser.user.languageCode!
    : "en";

  Logger.info(
    `Adding notification job for order #${orderId}, user ${userTelegramId}, status ${newStatus}`,
  );

  await addNotificationJob({
    userTelegramId,
    orderId,
    newStatus,
    userLocale,
  });
}

export async function adminOrderPagination(ctx: BotContext) {
  const offset = parseInt(ctx.match![1]);
  Logger.info(`Admin paginating orders, offset: ${offset}`);
  adminViewOrders(ctx, offset);
}