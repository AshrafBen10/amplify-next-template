import { v4 as uuidv4 } from "uuid";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

import { describeChat } from "@/app/utils/describeChat";

// Amplifyの設定
const client = generateClient<Schema>();

export const newCreateChat = async (email: string, setLoading: (loading: boolean) => void, setSelectedChat?: (chat: Schema["ChatHistory"]["type"] | null) => void) => {
  setLoading(true);
  try {
    const newChatId = uuidv4();
    const newChatContent = { id: newChatId, email: email, content: [] };

    await client.models.ChatHistory.create(newChatContent);
    console.log("新しいチャットを作成しました:", newChatId);
    if (setSelectedChat) {
      await describeChat(client, newChatId, setSelectedChat);
    }
  } catch (error) {
    console.error("チャットの作成中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
