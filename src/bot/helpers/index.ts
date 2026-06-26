import { Logger } from "../../utils/logger/index.js";
import { adminIds } from "../constants/index.js";
import { BotContext } from "../types/index.js";

export async function isAdmin(ctx: BotContext): Promise<boolean> {
  if (!adminIds.includes(String(ctx.from?.id))) {
    Logger.warn(
      `User with telegramId: ${ctx.from?.id} tried to access as admin!`,
    );
    await ctx.reply(ctx.t("admin_access_denied"));
    return false;
  }
  return true;
}
