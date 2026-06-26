import { Conversation } from "@grammyjs/conversations";
import { orderRepository } from "../../repositories/order.repository.js";
import { userRepository } from "../../repositories/user.repository.js";
import { Logger } from "../../utils/logger/index.js";
import { i18nMiddleware } from "../middlewares/i18n.middleware.js";
import { BotContext } from "../types/index.js";
import { Context } from "grammy";
import { OrderInsertSchema, UserInsertSchema } from "../../database/validation.js";

export async function orderConversation(
  conversation: Conversation<Context, BotContext>,
  ctx: BotContext,
) {
  const locale = ctx.from?.language_code ?? "en";
  const t = (key: string) => i18nMiddleware.translate(locale, key);

  ctx.reply(t("service_request"));

  let serviceType: string;
  while (true) {
    const pending = await conversation.wait();
    const text = pending.message?.text ?? "";
    const result = OrderInsertSchema.shape.serviceType.safeParse(text);

    if (result.success) {
      serviceType = result.data;
      break;
    }

    Logger.warn([
      "Invalid serviceType entered",
      `raw: "${text}"`,
      `user: ${ctx.from?.id}`,
    ]);
    ctx.reply(t("invalid_service_type"));
  }

  ctx.reply(t("serivce_problem_description"));

  let description: string | null;
  while (true) {
    const pending = await conversation.wait();
    const text = pending.message?.text ?? "";
    const result = OrderInsertSchema.shape.description.safeParse(text);

    if (result.success) {
      description = result.data ?? null;
      break;
    }

    Logger.warn([
      "Invalid description entered",
      `raw: "${text}"`,
      `user: ${ctx.from?.id}`,
    ]);
    ctx.reply(t("invalid_description"));
  }

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

  let contact: string;
  while (true) {
    const pending = await conversation.wait();
    const message = pending.message!;
    const candidate = message.contact?.phone_number ?? message.text ?? "";

    const phoneResult = UserInsertSchema.shape.phone.safeParse(candidate);

    if (phoneResult.success) {
      contact = phoneResult.data as string;
      break;
    }

    Logger.warn([
      "Invalid phone entered",
      `raw: "${candidate}"`,
      `user: ${ctx.from?.id}`,
    ]);
    ctx.reply(t("invalid_phone_format"));
  }

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