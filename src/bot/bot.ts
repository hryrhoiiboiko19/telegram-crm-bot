import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { BotContext } from "./types/index.js";
import {
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { orderConversation } from "../conversations.ts/index.js";
import { i18nMiddleware, loggerMiddleware } from "./middlewares/index.js";
import { start } from "./handlers/commands.js";

const bot = new Bot<ConversationFlavor<BotContext>>(env.BOT_TOKEN);

bot.use(session({ initial: () => ({}) }));
bot.use(loggerMiddleware);
bot.use(i18nMiddleware);
bot.use(conversations());
bot.use(createConversation(orderConversation));

bot.command("start", (ctx) => start(ctx));
bot.command("order", (ctx) => ctx.conversation.enter("orderConversation"));
bot.on("message", (ctx) => ctx.reply(ctx.t("unknown_command")));

bot.start();
