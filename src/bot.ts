import { Bot, webhookCallback, type Context } from "grammy";

import express from "express";
import { guard, isPrivateChat, reply, isUserHasId, and } from "grammy-guard";

// мой tg id -----\/
const WHITELIST = [1039326679];

import { type ConversationFlavor, conversations } from "@grammyjs/conversations";
export const bot = new Bot<ConversationFlavor<Context>>(process.env.TELEGRAM_TOKEN || "");
bot.use(conversations());
bot.command("start", guard(and(isPrivateChat, isUserHasId(...WHITELIST)), reply("/start is only available in private chat!")), ctx =>
  ctx.reply(replies.botIntro)
);

import { botProxy } from "./types/data";
const devBotProxy = botProxy();

import topicWrapper, { commands as topicCommands } from "./routes/topic";
import { replies } from "./types/replies";
topicWrapper(bot, devBotProxy);
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
