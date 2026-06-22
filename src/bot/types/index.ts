import { Context, SessionFlavor } from "grammy";
import { I18nFlavor } from "@grammyjs/i18n";

export type SessionData = Record<string, unknown>;

export type BotContext = Context & I18nFlavor & SessionFlavor<SessionData>;
