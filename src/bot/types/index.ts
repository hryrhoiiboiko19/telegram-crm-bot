import { Context, SessionFlavor } from "grammy";
import { I18nFlavor } from "@grammyjs/i18n";
import { SessionData } from "../interfaces/index.js";

export type BotContext = Context & I18nFlavor & SessionFlavor<SessionData>;
