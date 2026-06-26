import { ConversationFlavor } from "@grammyjs/conversations";
import { BotContext } from "../types/index.js";
import { Logger } from "../../utils/logger/index.js";

export async function order(ctx: ConversationFlavor<BotContext>) {
  Logger.info(`User ${ctx.from?.id} started order conversation`);
  return ctx.conversation.enter("orderConversation");
}