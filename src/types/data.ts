export type BotData = {
  currentTopic: string;
  storedMessages: number;
  storedFiles: number;
  existingTopics: string[];
  errorMessageIds: number[];
};

import fs, { writeFileSync } from "fs";
import path from "path";

export const botProxy = () => {
  const filePath = path.join(process.cwd(), "data.json");
  const initialData: BotData = JSON.parse(fs.readFileSync(filePath).toString());

  return new Proxy(initialData, {
    set(target, prop, value) {
      // @ts-expect-error
      if (prop in target) target[prop as keyof BotData] = value as BotData[keyof BotData];
      writeFileSync(filePath, JSON.stringify(target, null, 2));
      return true;
    },
    get(target, prop) {
      const data = JSON.parse(fs.readFileSync(filePath).toString());
      target = data;

      return target[prop as keyof BotData];
    }
  });
};
