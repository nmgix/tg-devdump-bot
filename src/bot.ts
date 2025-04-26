import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { chunk } from "lodash";
import express from "express";
import { applyTextEffect, Variant } from "./textEffects";

import type { Variant as TextEffectVariant } from "./textEffects";

// Create a bot using the Telegram token
const bot = new Bot(process.env.TELEGRAM_TOKEN || "");

// Handle the /effect command to apply text effects using an inline keyboard
type Effect = { code: TextEffectVariant; label: string };
const allEffects: Effect[] = [
  {
    code: "w",
    label: "Monospace"
  },
  {
    code: "b",
    label: "Bold"
  },
  {
    code: "i",
    label: "Italic"
  },
  {
    code: "d",
    label: "Doublestruck"
  },
  {
    code: "o",
    label: "Circled"
  },
  {
    code: "q",
    label: "Squared"
  }
];

const effectCallbackCodeAccessor = (effectCode: TextEffectVariant) => `effect-${effectCode}`;

const effectsKeyboardAccessor = (effectCodes: string[]) => {
  const effectsAccessor = (effectCodes: string[]) => effectCodes.map(code => allEffects.find(effect => effect.code === code));
  const effects = effectsAccessor(effectCodes);

  const keyboard = new InlineKeyboard();
  const chunkedEffects = chunk(effects, 3);
  for (const effectsChunk of chunkedEffects) {
    for (const effect of effectsChunk) {
      effect && keyboard.text(effect.label, effectCallbackCodeAccessor(effect.code));
    }
    keyboard.row();
  }

  return keyboard;
};

const textEffectResponseAccessor = (originalText: string, modifiedText?: string) =>
  `Original: ${originalText}` + (modifiedText ? `\nModified: ${modifiedText}` : "");

const parseTextEffectResponse = (
  response: string
): {
  originalText: string;
  modifiedText?: string;
} => {
  const originalText = (response.match(/Original: (.*)/) as any)[1];
  const modifiedTextMatch = response.match(/Modified: (.*)/);

  let modifiedText;
  if (modifiedTextMatch) modifiedText = modifiedTextMatch[1];

  if (!modifiedTextMatch) return { originalText };
  else return { originalText, modifiedText };
};

// bot.command("effect", ctx =>
//   ctx.reply(textEffectResponseAccessor(ctx.match), {
//     reply_markup: effectsKeyboardAccessor(allEffects.map(effect => effect.code))
//   })
// );

// Handle inline queries
// const queryRegEx = /effect (monospace|bold|italic) (.*)/;
// bot.inlineQuery(queryRegEx, async ctx => {
//   console.log(ctx);
//   const fullQuery = ctx.inlineQuery.query;
//   const fullQueryMatch = fullQuery.match(queryRegEx);
//   if (!fullQueryMatch) return;

//   const effectLabel = fullQueryMatch[1];
//   const originalText = fullQueryMatch[2];

//   const effectCode = allEffects.find(effect => effect.label.toLowerCase() === effectLabel.toLowerCase())?.code;
//   const modifiedText = applyTextEffect(originalText, effectCode as Variant);

//   await ctx.answerInlineQuery(
//     [
//       {
//         type: "article",
//         id: "text-effect",
//         title: "Text Effects",
//         input_message_content: {
//           message_text: `Original: ${originalText}
// Modified: ${modifiedText}`,
//           parse_mode: "HTML"
//         },
//         reply_markup: new InlineKeyboard().switchInline("Share", fullQuery),
//         url: "http://t.me/EludaDevSmarterBot",
//         description: "Create stylish Unicode text, all within Telegram."
//       }
//     ],
//     // { cache_time: 30 * 24 * 3600 } // one month in seconds
//     { is_personal: false, cache_time: 300 }
//   );
// });

bot.inlineQuery(".", async ctx => {
  console.log(ctx.message);

  // вместо точки можно название демки, типо g.game1

  await ctx.answerInlineQuery([
    {
      type: "article",
      id: "idk",
      title: "Добавить прикрепленное сообщение",
      input_message_content: {
        message_text: `Пока что тест, хихи`,
        parse_mode: "Markdown"
      },
      // reply_markup: new InlineKeyboard().switchInline("Share", "."),
      url: "https://t.me/developments_gamedev_bot",
      description: "Сохраняй пересланное сообщение в список, v2"
    }
  ]);
});

// Return empty result list for other queries.
// bot.on("inline_query", ctx => {
//   console.log("ctx2");
//   console.log(ctx);
//   ctx.answerInlineQuery([]);
// });

// Handle text effects from the effect keyboard
for (const effect of allEffects) {
  const allEffectCodes = allEffects.map(effect => effect.code);

  bot.callbackQuery(effectCallbackCodeAccessor(effect.code), async ctx => {
    const { originalText } = parseTextEffectResponse(ctx.msg?.text || "");
    const modifiedText = applyTextEffect(originalText, effect.code);

    await ctx.editMessageText(textEffectResponseAccessor(originalText, modifiedText), {
      reply_markup: effectsKeyboardAccessor(allEffectCodes.filter(code => code !== effect.code))
    });
  });
}

// Handle the /yo command to greet the user
bot.command("yo", ctx => ctx.reply(`Yo ${ctx.from?.username}`));

// Suggest commands in the menu
bot.api.setMyCommands([
  { command: "yo", description: "Be greeted by the bot" },
  {
    command: "effect",
    description: "Apply text effects on the text. (usage: /effect [text])"
  }
]);

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
