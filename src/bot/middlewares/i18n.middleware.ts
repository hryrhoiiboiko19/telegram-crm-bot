import { I18n } from "@grammyjs/i18n";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BotContext } from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, "..", "locales");

export const i18nMiddleware = new I18n<BotContext>({
  defaultLocale: "en",
  directory: localesDir,
});