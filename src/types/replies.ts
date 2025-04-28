export type TopicData = { label: string; postsAmount: number };

export const replies = {
  topicDefault: (currentTopic: string) =>
    `ℹ️ Настройка топиков. Текущий топик: **${currentTopic}**\nПосмотреть все, добавить или удалить.\n\nHint: для быстрого создания топика используй ` +
    "`/topic [тут навание топика]`",
  topicAdded: "✅️ Топик создан и выбран",
  topicExistsSelected: "✅️ Топик существует и выбран",
  topicSelected: "✅️ Топик выбран",
  topicNotAdded: "❌ Топик не создан",
  topicNotSelected: "⚠️ Топик не выбран",
  topicError: "⚠️ Топик: произошла ошибка",
  topicExists: "✅ Топик существует, выбран как текущий",
  // topicView: (data: TopicData[]) =>
  //   `Список всех топиков (${data.length}), сортировка по кол-ву постов:\n\n${data
  //     .map((topic, index) => {
  //       return `**${index + 1}**. [${topic.label}](https://t.me/developments_gamedev_bot?topic=${topic.label}) (${topic.postsAmount})\n`;
  //     })
  //     .join("")}`,
  topicView: (data: TopicData[]) => `Список всех топиков (${data.length}), сортировка по кол-ву постов`,
  topicViewEmpty: "( • ᴖ • ｡) пока топиков нет, жми `Добавить топик`",
  topicViewRequesting: `📜 Получаю посты`,
  topicEdited: "✅ Топик изменён",
  topicLengthZero: `Не указал топик, пустая строчка (ó﹏ò｡)`,
  topicLengthError: (minTopicLength: number) => `Длина топика меньше ${minTopicLength} символов`,
  topicOldName: "Введи старое имя топика",
  topicNewName: "Введи новое имя топика",
  topicHeader: (restOfText: string) => `ℹ️ Топики${restOfText}`,

  botIntro: `٩(^ᗜ^ )و ´- Привет, я бот для сохранения всех твоих заметок по разработке ибо отдельные посты в тг сложно собрать в кучу чтобы трекать прогресс.\nПиши /topic и оттуда сам разберёшься (づ> v <)づ♡`
};
