import { Dispatch, SetStateAction } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export const deleteChat = async (id: string, setIsDeleting: Dispatch<SetStateAction<Record<string, boolean>>>, setLoading: Dispatch<SetStateAction<boolean>>, handleDescribeChat: (id: string) => void) => {
  setIsDeleting((prev) => ({ ...prev, [id]: true }));
  setLoading(true);
  try {
    console.log(`Clicked chat with id: ${id}`);
    const { data: deletedTodo, errors } = await client.models.ChatHistory.delete({ id });
    if (errors) {
      console.error("Delete failed:", errors);
      throw new Error("チャットの削除中にエラーが発生しました");
    } else {
      console.log("Successfully deleted:", deletedTodo);
      handleDescribeChat(id);
    }
  } catch (error) {
    console.error("チャットの削除中にエラーが発生しました:", error);
  } finally {
    setIsDeleting((prev) => ({ ...prev, [id]: false }));
    setLoading(false);
  }
};
