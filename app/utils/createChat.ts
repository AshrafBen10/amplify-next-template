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
        // 既存のチャットを更新
        const existingChat = await client.models.ChatHistory.get({ id: selectedChatId });
        if (existingChat.data) {
          chatMessages = Array.isArray(existingChat.data.messages) ? existingChat.data.messages : [];
          chatId = existingChat.data.id;
          chatMessages.push(newContent);

          // chatClaudeクエリを実行
          const { data } = await client.queries.chatClaude({
            content: chatMessages,
          });

          // 既存のチャットを更新
          await client.models.ChatHistory.update({
            id: chatId,
            messages: chatMessages,
          });
        } else {
          console.error("指定されたIDのチャットが見つかりません");
          return;
        }
      } else {
        // 新しいチャットを作成
        chatId = uuidv4();
        chatMessages = [newContent];

        // chatClaudeクエリを実行
        const { data } = await client.queries.chatClaude({
          content: chatMessages,
        });
        console.log(data);

        // 新しいチャットを作成
        await client.models.ChatHistory.create({
          id: chatId,
          messages: chatMessages,
        });
        console.log("新しいチャットを作成しました:", chatId);
      }

      textareaRef.current.value = "";
    }
  } catch (error) {
    console.error("チャットの作成または更新中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
