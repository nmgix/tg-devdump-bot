import { createWriteStream, writeFile, writeFileSync } from "fs";
import { Context } from "grammy";
import path from "path";
import { pipeline } from "stream/promises";
import { postsPath } from "../types/consts";

export async function serverDownloadFile(ctx: Context, topic: string, file: { id: string; name: string }) {
  try {
    const apiFile = await ctx.api.getFile(file.id);
    const href = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${apiFile.file_path}`;
    const response = await fetch(href);
    // console.log({ response });

    if (!response.ok) {
      throw new Error(`Ошибка скачивания: ${response.statusText}`);
    }

    const downloadStream = createWriteStream(path.join(postsPath, topic, `${file.name}.${apiFile.file_path!.split(".")[1]}`));
    await pipeline(response.body as ReadableStream, downloadStream);

    // console.log({ apiFile });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function clientDownloadFile(ctx: Context, topic: string, file: { id: string; name: string }) {
  console.log(topic, file);
}

export async function writeTextfile(topic: string, file: { text: string; name: string }) {
  writeFileSync(path.join(postsPath, topic, `${file.name}.txt`), file.text);
}
