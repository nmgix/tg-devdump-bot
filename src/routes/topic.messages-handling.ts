import { Context } from "grammy";
import { Document } from "grammy/types";
import { maxServerDownloadableFileSize } from "../types/consts";
import { BotData } from "../types/data";

import { clientDownloadFile, serverDownloadFile, writeTextfile } from "../helpers/filehandling";

export async function handleMessage(ctx: Context, botProxy: BotData) {
  try {
    if (!ctx.message || !ctx.update.message) return;
    const message = ctx.message || ctx.update.message;
    const group = message.media_group_id;
    const fileName = group ? `${group}_${message.message_id}` : `${message.message_id}`;

    const text = message.text || message.caption;
    if (text !== undefined) {
      botProxy.storedMessages = botProxy.storedMessages + 1;
      writeTextfile(botProxy.currentTopic, { text, name: fileName });
    }

    const file = (message.photo && message.photo.slice(-1)[0]) || message.audio || message.video || message.document;
    if (file !== undefined && (file as Document).file_size !== undefined) {
      const serverDownloadable = (file as Document).file_size! < maxServerDownloadableFileSize;
      const fileData = { id: (file as Document).file_id!, name: fileName };
      new Promise(async res => {
        if (serverDownloadable) await serverDownloadFile(ctx, botProxy.currentTopic, fileData);
        else await clientDownloadFile(ctx, botProxy.currentTopic, fileData);
        res(true);
      }).then(() => (botProxy.storedFiles = botProxy.storedFiles + 1));
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}
