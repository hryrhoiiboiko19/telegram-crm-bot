import { Bot } from "grammy";
import { env } from "../config/env.js";
import { loggerMiddleware } from "../middlewares/logger.middleware.js";

const bot = new Bot(env.BOT_TOKEN);

bot.use(loggerMiddleware);

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));
bot.on("message", (ctx) => ctx.reply("Got another message!"));

bot.start();
