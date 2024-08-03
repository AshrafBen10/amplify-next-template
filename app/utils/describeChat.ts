import { Client } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export const describeChat = async (client: Client<Schema>, id: string, setSelectedChat: (chat: Schema["ChatHistory"]["type"] | null) => void) => {
  try {
    const { data } = await client.models.ChatHistory.get({ id });
    setSelectedChat(data);
  } catch (error) {
    console.error("Error fetching chat:", error);
  }
};
