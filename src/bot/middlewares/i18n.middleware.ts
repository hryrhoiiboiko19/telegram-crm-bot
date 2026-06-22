import { I18n } from "@grammyjs/i18n";
import { BotContext } from "../types/index.js";

export const i18nMiddleware = new I18n<BotContext>({
  defaultLocale: "en",
  directory: "src/bot/locales",
});
