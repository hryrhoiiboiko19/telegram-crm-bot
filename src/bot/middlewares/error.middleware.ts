import type { Bot } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { Logger } from "../../utils/logger/index.js";
import { i18nMiddleware } from "./i18n.middleware.js";
import { BotContext } from "../types/index.js";
import { availableLocales } from "../constants/index.js";
import { botErrorsTotal } from "../../metrics/index.js";

const FALLBACK_MESSAGE =
  "Internal server error. Please try again later or contact support.";

export function setupErrorBoundary(
  bot: Bot<ConversationFlavor<BotContext>>,
): void {
  bot.catch(async (err) => {
    const { error, ctx } = err;

    Logger.error(["Critical crash intercepted:", error as Error]);
    botErrorsTotal.inc({ type: error instanceof Error ? error.name : "Unknown" });

    if (error instanceof Error && error.stack) {
      Logger.error([`Stack trace:\n${error.stack}`]);
    }

    try {
      const locale = ctx.from?.language_code ?? "en";
      const safeLocale = availableLocales.includes(locale) ? locale : "en";
      const message = i18nMiddleware.translate(safeLocale, "internal_server_error");

      await ctx.reply(message || FALLBACK_MESSAGE);
    } catch (replyError) {
      Logger.warn([
        "Failed to send error reply to user",
        replyError as Error,
      ]);
    }
  });
}