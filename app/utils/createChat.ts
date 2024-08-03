import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { v4 as uuidv4 } from "uuid";

const client = generateClient<Schema>();

export const createChat = async (textareaRef: React.RefObject<HTMLTextAreaElement>, setLoading: (loading: boolean) => void) => {
  setLoading(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (textareaRef.current?.value) {
      const value = textareaRef.current.value;
      await client.models.ChatHistory.create({
        id: uuidv4(),
        chat: value,
      });
      textareaRef.current.value = "";
    }
  } catch (error) {
    console.error("チャットの作成中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
