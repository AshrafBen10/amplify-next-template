import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { v4 as uuidv4 } from "uuid";

const client = generateClient<Schema>();

const insertSkipMessages = (messages: { role: string; message: string }[]) => {
  const updatedMessages: { role: string; message: string }[] = [];

  for (let i = 0; i < messages.length; i++) {
    updatedMessages.push(messages[i]);

    // Check for consecutive messages of the same role
    if (i < messages.length - 1 && messages[i].role === messages[i + 1].role) {
      const skipMessage = {
        role: messages[i].role === "user" ? "assistant" : "user",
        message: "skip", // Use "skip" instead of an empty message
      };
      updatedMessages.push(skipMessage);
    }
  }

  return updatedMessages;
};

export const createChat = async (textareaRef: React.RefObject<HTMLTextAreaElement>, setLoading: (loading: boolean) => void, selectedChatId?: string) => {
  console.log(`getID: ${selectedChatId}`);
  setLoading(true);
  try {
    if (textareaRef.current?.value) {
      const value = textareaRef.current.value;
      const newContent = {
        message: value,
        role: "user",
      };
      let chatMessages: any[] = [];
      let chatId;

      if (selectedChatId) {
        // 既存のチャットを更新
        const existingChat = await client.models.ChatHistory.get({ id: selectedChatId });
        if (existingChat.data) {
          const content = existingChat.data.content[0];
          // contentがstringであることを確認
          if (typeof content === "string") {
            chatMessages = JSON.parse(content);
          }
          chatId = existingChat.data.id;
          chatMessages.push(newContent);

          // 連続するメッセージの間に"skip"メッセージを追加
          chatMessages = insertSkipMessages(chatMessages);

          // JSON文字列に変換して更新
          const updatedContent = [JSON.stringify(chatMessages)];
          const response = await client.queries.ChatClaude({
            content: updatedContent,
          });
          console.log(response);

          // 既存のチャットを更新
          await client.models.ChatHistory.update({
            id: chatId,
            content: updatedContent,
          });
        } else {
          console.error("指定されたIDのチャットが見つかりません");
          return;
        }
      } else {
        // 新しいチャットを作成
        chatId = uuidv4();
        chatMessages = [newContent];

        // 連続するメッセージの間に"skip"メッセージを追加
        chatMessages = insertSkipMessages(chatMessages);

        // JSON文字列に変換
        const newContentString = [JSON.stringify(chatMessages)];
        const response = await client.queries.ChatClaude({
          content: newContentString,
        });
        console.log(response);

        // 新しいチャットを作成
        await client.models.ChatHistory.create({
          id: chatId,
          content: newContentString,
        });
        console.log("新しいチャットを作成しました:", chatId);
        const existingChat = await client.models.ChatHistory.get({ id: chatId });
        console.log("新しいチャットの内容", existingChat);
      }

      textareaRef.current.value = "";
    }
  } catch (error) {
    console.error("チャットの作成または更新中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
