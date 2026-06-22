import { userRepository } from "../../repositories/user.repository.js";
import { Logger } from "../../utils/logger/index.js";
import { BotContext } from "../types/index.js";

export async function start(ctx: BotContext) {
  const telegramId = String(ctx.from!.id);
  const existing = await userRepository.findByTelegramId(telegramId);
  if (existing) {
    Logger.info(`User already exists with telegramId: ${telegramId}`);
    ctx.reply(ctx.t("start"));
    return;
  }

  Logger.info(`Creating user with telegramId: ${telegramId}`);
  const user = await userRepository.create({
    telegramId,
    username: ctx.from?.username,
    firstName: ctx.from?.first_name,
  });
  Logger.info(
    `Successfully created user with telegramId: ${telegramId}, id: ${user.id}`,
  );
  ctx.reply(ctx.t("start"));
}
