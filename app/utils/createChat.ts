import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { v4 as uuidv4 } from "uuid";

const client = generateClient<Schema>();

export const createChat = async (textareaRef: React.RefObject<HTMLTextAreaElement>, setLoading: (loading: boolean) => void, selectedChatId?: string) => {
  setLoading(true);
  try {
    if (textareaRef.current?.value) {
      const value = textareaRef.current.value;

      const newContent = {
        message: value,
        role: "user",
      };

      let chatMessages;
      let chatId;

      if (selectedChatId) {
        // 既存のチャットを取得
        const existingChat = await client.models.ChatHistory.get({ id: selectedChatId });
        if (existingChat.data) {
          chatMessages = existingChat.data.messages || {};
          chatId = existingChat.data.id;
          if (!Array.isArray(chatMessages)) {
            chatMessages = [];
          }
          chatMessages.push(newContent);
        } else {
          // 既存のチャットが見つからない場合、新しいチャットとして扱う
          chatId = uuidv4();
          chatMessages = [newContent];
        }
      } else {
        // 新しいチャットコンテンツを作成
        chatId = uuidv4();
        chatMessages = [newContent];
      }

      // chatClaudeクエリを実行
      const { data } = await client.queries.chatClaude({
        content: chatMessages,
      });

      if (selectedChatId) {
        // 既存のチャットを更新
        await client.models.ChatHistory.update({
          id: selectedChatId,
          messages: chatMessages,
        });
      } else {
        // 新しいチャットを作成
        const newId = uuidv4();
        await client.models.ChatHistory.create({
          id: newId,
          messages: chatMessages,
        });
      }

      textareaRef.current.value = "";
    }
  } catch (error) {
    console.error("チャットの作成または更新中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
