import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";
import { BotContext } from "../bot/types/index.js";
import { i18nMiddleware } from "../bot/middlewares/i18n.middleware.js";
import { Logger } from "../utils/logger/index.js";
import { userRepository } from "../repositories/user.repository.js";
import { orderRepository } from "../repositories/order.repository.js";

export async function orderConversation(
  conversation: Conversation<Context, BotContext>,
  ctx: BotContext,
) {
  const locale = ctx.from?.language_code ?? "en";
  const t = (key: string) => i18nMiddleware.translate(locale, key);

  ctx.reply(t("service_request"));
  let pending = await conversation.waitFor("message:text");
  const serviceType = pending.message.text;

  ctx.reply(t("serivce_problem_description"));
  pending = await conversation.waitFor("message:text");
  const description = pending.message.text;

  ctx.reply(t("contact_request"), {
    reply_markup: {
      keyboard: [
        [
          {
            text: t("send_contact"),
            request_contact: true,
          },
        ],
      ],
      one_time_keyboard: true,
    },
  });
  const pendingContact = await conversation.waitFor(":contact");
  const contact = pendingContact.message!.contact.phone_number;

  Logger.info("Conversation data collect is end, saving to Database...");

  const userFromDb = await userRepository.findByTelegramId(
    String(ctx.from!.id),
  );
  await userRepository.updatePhone(userFromDb!.telegramId, contact);

  await orderRepository.create({
    userId: userFromDb!.id,
    serviceType,
    description,
    status: "pending",
  });

  Logger.info("Successfully saved data to Database!");

  ctx.reply(t("order_recieved"));
}