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
  // напрямую пишешь /topic [топик]
  bot.command("topic", async ctx => {
    const topic = ctx.message?.text.replace("/topic", "").trim();

    if (topic) {
      botProxy.currentTopic = topic;
      if (botProxy.existingTopics.includes(topic)) {
        // replies.topicHeader(`\n${replies.topicExistsSelected}`)
        await ctx.reply(replies.topicExistsSelected);
      } else {
        botProxy.existingTopics.push(topic);
        // replies.topicHeader(`\n${replies.topicAdded}`)
        await ctx.reply(replies.topicAdded);
      }
    } else {
      // replies.topicHeader(`\n${replies.topicDefault(botProxy.currentTopic)}`)
      await ctx.reply(replies.topicDefault(botProxy.currentTopic.replace(/([\\_*@])/g, "\\$1")), {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    }
  });

  // inline кнопка view topics
  bot.callbackQuery(topicOptions[1].code, async ctx => {
    try {
      const posts: TopicData[] = fs
        .readdirSync(postsPath, { withFileTypes: true })
        .filter(f => f.isDirectory())
        // TODO: .length неправильное кол-во будет возвращать ибо все посты сейчас идут в кучу в одну папку а не подпапки
        .map(topic => ({ label: topic.name, postsAmount: fs.readdirSync(path.join(postsPath, topic.name)).length }))
        .sort((a, b) => b.postsAmount - a.postsAmount);

      botProxy.existingTopics = posts.map(p => p.label);

      const keyboard = renderInlineTopicKeyboard();
      for (let i = 0; i < posts.length; i++) {
        keyboard.text(`${i + 1}. ${posts[i].label} (${posts[i].postsAmount})\n`, `topic:${posts[i].label}`);
        keyboard.row();
      }
      try {
        await ctx.editMessageText(posts.length > 0 ? replies.topicView(posts) : replies.topicViewEmpty, {
          reply_markup: keyboard,
          parse_mode: "Markdown"
        });
      } catch (error) {
        console.log(error);
        await ctx.answerCallbackQuery();
        console.log("Ничего не изменилось в запросе, та-жеinline кнопка нажата, не кидать ошибку");
        // Call to 'editMessageText' failed! (400: Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message)
      }
    } catch (error) {
      await ctx.answerCallbackQuery();
      console.log(error);
      // replies.topicHeader(`\n${replies.topicError}`)
      const errorReply = await ctx.reply(replies.topicError);
      botProxy.errorMessageIds = [...botProxy.errorMessageIds, errorReply.message_id];
    }
  });
  // inline кнопка с именем топика чтобы выбрать его
  bot.callbackQuery(/^topic:(.+)$/, async ctx => {
    const topicLabel = ctx.match[1];
    await ctx.answerCallbackQuery();

    botProxy.currentTopic = topicLabel;

    // replies.topicHeader(`\n${`${replies.topicSelected}. Текущий: **${botProxy.currentTopic}**`}`)
    try {
      await ctx.editMessageText(`${replies.topicSelected}. Текущий: **${botProxy.currentTopic.replace(/([\\_*@])/g, "\\$1")}**`, {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.log(error);
      await ctx.answerCallbackQuery();
      console.log("Ничего не изменилось в запросе, та-же inline кнопка нажата, не кидать ошибку");
      // Call to 'editMessageText' failed! (400: Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message)
    }
  });

  // редактирование топика
  async function editTopic(conversation: Conversation, ctx0: Context) {
    try {
      // ctx0.deleteMessage();
      const botReply1 = await ctx0.reply(replies.topicOldName, { reply_markup: { force_reply: true } });
      const ctx1 = await conversation.waitFor("message:text");

      if (typeof ctx1.message.text !== "string" || ctx1.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(ctx1.message.text.trim().length === 0 ? replies.topicLengthZero : replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }

      if (!botProxy.existingTopics.includes(ctx1.message.text)) throw new Error("Указанный топик не найден");
      const oldTopic = ctx1.message.text.trim();

      ctx0.deleteMessages([botReply1.message_id]);
      ctx1.deleteMessage();

      const botReply2 = await ctx1.reply(replies.topicNewName, { reply_markup: { force_reply: true } });
      const ctx2 = await conversation.waitFor("message:text");
      ctx1.deleteMessages([botReply2.message_id]);
      ctx2.deleteMessage();
      if (typeof ctx2.message.text !== "string" || ctx2.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(ctx2.message.text.trim().length === 0 ? replies.topicLengthZero : replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }
      const newTopic = ctx2.message.text.trim();

      botProxy.currentTopic = newTopic;
      botProxy.existingTopics = [...botProxy.existingTopics.filter(t => t !== oldTopic), newTopic];
      await conversation.external(() => fs.renameSync(path.join(postsPath, oldTopic), path.join(postsPath, newTopic)));

      ctx0.deleteMessage();
      await ctx2.reply(`${replies.topicEdited}. Текущий: **${botProxy.currentTopic.replace(/([\\_*@])/g, "\\$1")}**`, {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.dir(error);
      const errorReply = await ctx0.reply(replies.topicError);
      botProxy.errorMessageIds = [...botProxy.errorMessageIds, errorReply.message_id];
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
      const errorReply = await ctx.reply(replies.topicError);
      botProxy.errorMessageIds = [...botProxy.errorMessageIds, errorReply.message_id];
    }
  });

  // создание топика
  async function createTopic(conversation: Conversation, ctx0: Context) {
    try {
      await ctx0.reply(replies.topicNewName);
      const ctx1 = await conversation.waitFor("message:text");
      if (typeof ctx1.message.text !== "string" || ctx1.message.text.trim().length < MIN_DEVPOST_NAME_LENGTH) {
        throw new Error(ctx1.message.text.trim().length === 0 ? replies.topicLengthZero : replies.topicLengthError(MIN_DEVPOST_NAME_LENGTH));
      }
      const newTopic = ctx1.message.text.trim();

      botProxy.currentTopic = newTopic;
      botProxy.existingTopics = [...botProxy.existingTopics, newTopic];
      await conversation.external(() => fs.mkdirSync(path.join(postsPath, newTopic)));

      await ctx1.reply(`${replies.topicAdded}. Текущий: **${botProxy.currentTopic.replace(/([\\_*@])/g, "\\$1")}**`, {
        reply_markup: renderInlineTopicKeyboard(),
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.dir(error);
      const errorReply = await ctx0.reply(replies.topicError);
      botProxy.errorMessageIds = [...botProxy.errorMessageIds, errorReply.message_id];
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
      const errorReply = await ctx.reply(replies.topicError);
      botProxy.errorMessageIds = [...botProxy.errorMessageIds, errorReply.message_id];
    }
  });
}
