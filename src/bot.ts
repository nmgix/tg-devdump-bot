import { Bot, webhookCallback, type Context } from "grammy";

import express from "express";
import { guard, isPrivateChat, reply, isUserHasId, and } from "grammy-guard";

// мой tg id -----\/
const WHITELIST = [1039326679];

// import topicMessagesHandlingWrapper from "./routes/topic.messages-handling";
import { handleMessage } from "./routes/topic.messages-handling";

import { botProxy } from "./types/data";
const devBotProxy = botProxy();
import { type ConversationFlavor, conversations } from "@grammyjs/conversations";

export type BotContext = ConversationFlavor<Context> & { session: { handled: boolean } };
export const bot = new Bot<BotContext>(process.env.TELEGRAM_TOKEN || "");
bot.use(guard(and(isPrivateChat, isUserHasId(...WHITELIST)))); //, reply("/start is only available in private chat!")

bot.use(conversations());
bot.use(async (ctx, next) => {
  ctx.session = { handled: false };
  const convosActive = Object.keys(ctx.conversation.active()).length > 0;
  await next();
  if (!ctx.session.handled && !convosActive && ctx.message) handleMessage(ctx, devBotProxy);
});
bot.command("start", ctx => ctx.reply(replies.botIntro));

import topicCrudWrapper, { commands as topicCommands } from "./routes/topic.crud";
import { replies } from "./types/replies";
topicCrudWrapper(bot, devBotProxy);

bot.api.setMyCommands([...topicCommands]);

if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
