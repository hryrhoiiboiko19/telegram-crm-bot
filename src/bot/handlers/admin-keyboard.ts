import { InlineKeyboardButton } from "grammy/types";
import { BotContext } from "../types/index.js";

export function leftPaginationArrow(
  paginationOffset: number,
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

export function rightPaginationArrow(
  paginationOffset: number,
  totalPendingCount: number,
): InlineKeyboardButton {
  const isLastPage = totalPendingCount - paginationOffset <= 1;
  const text: string = isLastPage ? "⬛" : "➡️";
  const callback_data: string = isLastPage
    ? "noop"
    : `admin_order_pagination_offset_${paginationOffset + 1}`;

  return {
    text,
    callback_data,
  };
}

export function buildOrderKeyboard(
  ctx: BotContext,
  orderId: number,
  paginationOffset: number,
  totalPendingCount: number,
): InlineKeyboardButton[][] {
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
      leftPaginationArrow(paginationOffset),
      { text: "⬛", callback_data: "noop" },
      rightPaginationArrow(paginationOffset, totalPendingCount),
    ],
  ];
}