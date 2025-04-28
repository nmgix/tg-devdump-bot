import { Conversation } from "@grammyjs/conversations/out/conversation";
import { createConversation } from "@grammyjs/conversations/out/plugin";
import { Context } from "grammy/out/context";
import { bot as botInstance } from "../bot";
import { MIN_DEVPOST_NAME_LENGTH, postsPath } from "../types/consts";
import { BotData } from "../types/data";
import { replies, TopicData } from "../types/replies";

import fs from "fs";
import path from "path";
import { InlineKeyboard } from "grammy";

const topicOptions = [
  { label: "Добавить топик", code: "add" },
  { label: "Посмотреть все топики", code: "view" },
  { label: "Изменить", code: "edit" }
] as const;

export const commands = [
  {
    command: "topic",
    description: "Выбрать/сменить/создать новый топик"
  }
];

export const renderInlineTopicKeyboard = () => {
  const inlineKeyboard = new InlineKeyboard();
  for (let option of topicOptions) {
    inlineKeyboard.text(option.label, option.code);
  }
  inlineKeyboard.row();

  return inlineKeyboard;
};

export default function (bot: typeof botInstance, botProxy: BotData) {
  bot.command("topic", async ctx => {
    const topic = ctx.message?.text.replace("/topic", "").trim();

    if (topic) {
      botProxy.currentTopic = topic;
      if (botProxy.existingTopics.includes(topic)) {
        await ctx.reply(replies.topicHeader(`\n${replies.topicExistsSelected}`));
      } else {
        botProxy.existingTopics.push(topic);
        await ctx.reply(replies.topicHeader(`\n${replies.topicAdded}`));
      }
    } else {
      await ctx.reply(replies.topicHeader(`\n${replies.topicDefault(botProxy.currentTopic)}`), {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    }
  });

  bot.callbackQuery(topicOptions[1].code, async ctx => {
    try {
      const posts: TopicData[] = fs
        .readdirSync(postsPath, { withFileTypes: true })
        .map(topic => ({ label: topic.name, postsAmount: fs.readdirSync(path.join(postsPath, topic.name)).length }))
        .sort((a, b) => b.postsAmount - a.postsAmount);
      const keyboard = renderInlineTopicKeyboard();
      for (let i = 0; i < posts.length; i++) {
        keyboard.text(`${i + 1}. ${posts[i].label} (${posts[i].postsAmount})\n`, `topic:${posts[i].label}`);
        keyboard.row();
      }
      await ctx.editMessageText(replies.topicHeader(`: Просмотр\n${replies.topicView(posts)}`), { reply_markup: keyboard, parse_mode: "Markdown" });
    } catch (error) {
      console.log(error);
      await ctx.reply(replies.topicHeader(`\n${replies.topicError}`));
    }
  });
  bot.callbackQuery(/^topic:(.+)$/, async ctx => {
    const topicLabel = ctx.match[1];
    await ctx.answerCallbackQuery();

    botProxy.currentTopic = topicLabel;

    await ctx.editMessageText(replies.topicHeader(`\n${`${replies.topicSelected}. Текущий: **${botProxy.currentTopic}**`}`), {
      reply_markup: renderInlineTopicKeyboard(),
      parse_mode: "Markdown"
    });
  });

  async function editTopic(conversation: Conversation, ctx0: Context) {
    try {
      await ctx0.reply(replies.topicOldName);
      const ctx1 = await conversation.waitFor("message:text");
      if (typeof ctx1.message.text !== "string" || ctx1.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }

      if (!botProxy.existingTopics.includes(ctx1.message.text)) throw new Error("Указанный топик не найден");
      const oldTopic = ctx1.message.text.trim();

      await ctx1.reply(replies.topicNewName);
      const ctx2 = await conversation.waitFor("message:text");
      if (typeof ctx2.message.text !== "string" || ctx2.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }
      const newTopic = ctx2.message.text.trim();

      botProxy.currentTopic = newTopic;
      botProxy.existingTopics = [...botProxy.existingTopics.filter(t => t !== oldTopic), newTopic];
      await conversation.external(() => fs.renameSync(path.join(postsPath, oldTopic), path.join(postsPath, newTopic)));

      await ctx2.reply(`${replies.topicEdited}. Текущий: **${botProxy.currentTopic}**`, {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.dir(error);
      await ctx0.reply((error as Error).message);
      return;
    }
  }
  bot.use(createConversation(editTopic));
  bot.callbackQuery(topicOptions[2].code, async ctx => {
    try {
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter("editTopic");
      // await ctx.editMessageText(replies.topicEdited, { reply_markup: renderInlineTopicKeyboard() });
    } catch (error) {
      console.log(error);
      await ctx.reply(replies.topicError);
    }
  });

  async function createTopic(conversation: Conversation, ctx0: Context) {
    try {
      await ctx0.reply(replies.topicNewName);
      const ctx1 = await conversation.waitFor("message:text");
      if (typeof ctx1.message.text !== "string" || ctx1.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }
      const newTopic = ctx1.message.text.trim();

      botProxy.currentTopic = newTopic;
      botProxy.existingTopics = [...botProxy.existingTopics, newTopic];
      await conversation.external(() => fs.mkdirSync(path.join(postsPath, newTopic)));

      await ctx1.reply(`${replies.topicAdded}. Текущий: **${botProxy.currentTopic}**`, {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.log(error);
      await ctx0.reply((error as Error).message);
    }
  }
  bot.use(createConversation(createTopic));
  bot.callbackQuery(topicOptions[0].code, async ctx => {
    try {
      // await ctx.editMessageText(replies.topicAdded, { reply_markup: renderInlineTopicKeyboard() });
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter("createTopic");
    } catch (error) {
      console.log(error);
      await ctx.reply(replies.topicError);
    }
  });
}
