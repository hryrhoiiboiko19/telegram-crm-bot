import { ConversationFlavor } from "@grammyjs/conversations";
import { BotContext } from "../types/index.js";

export async function order(ctx: ConversationFlavor<BotContext>) {
  return ctx.conversation.enter("orderConversation");
}
