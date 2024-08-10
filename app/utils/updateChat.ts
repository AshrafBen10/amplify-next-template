import { Client } from "aws-amplify/data";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { describeChat } from "@/app/utils/describeChat";

const client = generateClient<Schema>();

export const updateChat = async (setLoading: (loading: boolean) => void, setSelectedChat: (chat: Schema["ChatHistory"]["type"] | null) => void, message: string, setClaudeMessage: (message: string) => void, setChatgptMessage: (message: string) => void, selectedChatId?: string) => {
  setLoading(true);
  let chatId: string | undefined;
  try {
    let chatMessages: any[] = [];
    const value = message; // 生成AIのチャット情報
    const newContent = {
      message: value,
      role: "assistant",
    };
    if (selectedChatId) {
      const existingChat = await client.models.ChatHistory.get({ id: selectedChatId }); // 既存のチャット履歴を取得
      if (existingChat.data && existingChat.data.content) {
        const content = existingChat.data.content[0];
        if (typeof content === "string") {
          chatMessages = JSON.parse(content);
        }
        chatId = existingChat.data.id;
        chatMessages.push(newContent); // チャット履歴に生成AIのチャットを追加

        // ユーザが入力したチャット情報をデータベース格納用Formatに変換
        const updatedContent = [JSON.stringify(chatMessages)];

        // ユーザが入力したチャット情報をデータベースに反映する
        await client.models.ChatHistory.update({
          id: chatId,
          content: updatedContent,
        });

        // 更新後にチャット内容を取得し、画面に反映する
        if (setSelectedChat && chatId) {
          await describeChat(client, chatId, setSelectedChat);
        }
      }
    }
    setClaudeMessage("");
    setChatgptMessage("");
    setLoading(false);
  } catch (error) {
    console.error("Error fetching chat:", error);
  }
};
