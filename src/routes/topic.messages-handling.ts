import { Context } from "grammy";
import { Document } from "grammy/types";
import { maxServerDownloadableFileSize, postsPath } from "../types/consts";
import { BotData } from "../types/data";
import fs from "fs";
import path from "path";

import { clientDownloadFile, serverDownloadFile, writeTextfile } from "../helpers/filehandling";

export async function handleMessage(ctx: Context, botProxy: BotData) {
  let filesFolder = "";

  try {
    if (!ctx.message || !ctx.update.message) return;
    const message = ctx.message || ctx.update.message;
    const group = message.media_group_id;
    filesFolder = String(group ? group : message.message_id);

    const text = message.text || message.caption;
    const file = (message.photo && message.photo.slice(-1)[0]) || message.audio || message.video || message.document;

    const fileFolderPath = path.join(postsPath, botProxy.currentTopic, filesFolder);
    if (!!text || !!file) !fs.existsSync(fileFolderPath) && fs.mkdirSync(path.join(postsPath, botProxy.currentTopic, filesFolder));

    const fileName = path.join(filesFolder, String(message.message_id));

    if (text !== undefined) {
      botProxy.storedMessages = botProxy.storedMessages + 1;
      writeTextfile(botProxy.currentTopic, { text, name: fileName });
    }

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
    // try {
    //   fs.rmdirSync(path.join(postsPath, botProxy.currentTopic, filesFolder)); // тут тоже проблема. он не удаляет папку если в ней есть файлы
    // } catch (fsError) {
    //   error = String(error).concat(String(fsError));
    // }
    console.log(error);
    return false;
  }
}
