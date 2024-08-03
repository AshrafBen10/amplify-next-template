import { Dispatch, SetStateAction } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export const deleteChat = async (id: string, setIsDeleting: Dispatch<SetStateAction<Record<string, boolean>>>) => {
  setIsDeleting((prev) => ({ ...prev, [id]: true }));

  try {
    console.log(`Clicked chat with id: ${id}`);
    const { data: deletedTodo, errors } = await client.models.ChatHistory.delete({ id });
    if (errors) {
      console.error("Delete failed:", errors);
      // エラー処理をここに追加
    } else {
      console.log("Successfully deleted:", deletedTodo);
      // 成功時の処理をここに追加（例：UIの更新など）
    }
  } finally {
    setIsDeleting((prev) => ({ ...prev, [id]: false }));
  }
};
