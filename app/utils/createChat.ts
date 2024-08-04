import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { v4 as uuidv4 } from "uuid";
import { describeChat } from "@/app/utils/describeChat";

const client = generateClient<Schema>();

// メッセージリストの中に"skip"メッセージを挿入する関数
const insertSkipMessages = (messages: { role: string; message: string }[]) => {
  const updatedMessages: { role: string; message: string }[] = [];

  for (let i = 0; i < messages.length; i++) {
    // メッセージが空文字列の場合は"skip"に置き換える
    const messageContent = messages[i].message.trim() === "" ? "skip" : messages[i].message;

    updatedMessages.push({
      role: messages[i].role,
      message: messageContent,
    });

    // 連続するメッセージの役割が同じか確認
    if (i < messages.length - 1 && messages[i].role === messages[i + 1].role) {
      const skipMessage = {
        role: messages[i].role === "user" ? "assistant" : "user",
        message: "skip",
      };
      updatedMessages.push(skipMessage);
    }
  }

  return updatedMessages;
};

// チャット作成または更新処理
export const createChat = async (textareaRef: React.RefObject<HTMLTextAreaElement>, setLoading: (loading: boolean) => void, selectedChatId?: string, setSelectedChat?: (chat: Schema["ChatHistory"]["type"] | null) => void) => {
  setLoading(true);
  let chatId: string | undefined;
  try {
    if (textareaRef.current?.value) {
      const value = textareaRef.current.value;
      const newContent = {
        message: value,
        role: "user",
      };
      let chatMessages: any[] = [];

      if (selectedChatId) {
        // 既存のチャットを取得して更新する処理
        const existingChat = await client.models.ChatHistory.get({ id: selectedChatId });
        if (existingChat.data) {
          const content = existingChat.data.content[0];
          if (typeof content === "string") {
            chatMessages = JSON.parse(content);
          }
          chatId = existingChat.data.id;
          chatMessages.push(newContent);

          // 連続するメッセージの間に"skip"メッセージを追加
          chatMessages = insertSkipMessages(chatMessages);

          // 更新されたメッセージリストをJSON文字列に変換
          const updatedContent = [JSON.stringify(chatMessages)];

          // 既存のチャットを更新
          await client.models.ChatHistory.update({
            id: chatId,
            content: updatedContent,
          });

          // 更新後にチャット詳細を取得
          if (setSelectedChat && chatId) {
            await describeChat(client, chatId, setSelectedChat);
          }
        } else {
          console.error("指定されたIDのチャットが見つかりません");
          return;
        }
      } else {
        // 新しいチャットを作成する処理
        chatId = uuidv4();
        chatMessages = [newContent];

        // 連続するメッセージの間に"skip"メッセージを追加
        chatMessages = insertSkipMessages(chatMessages);

        // 新しいメッセージリストをJSON文字列に変換
        const newContentString = [JSON.stringify(chatMessages)];

        // 新しいチャットを作成
        await client.models.ChatHistory.create({
          id: chatId,
          content: newContentString,
        });

        // 作成後にチャット詳細を取得
        if (setSelectedChat && chatId) {
          await describeChat(client, chatId, setSelectedChat);
        }
      }

      // textareaの内容をクリア
      textareaRef.current.value = "";

      // ChatClaudeに問い合わせてレスポンスを取得
      const response = await client.queries.ChatClaude({
        content: [JSON.stringify(chatMessages)],
      });

      // 取得したレスポンスをメッセージリストに追加
      const assistantMessage = {
        role: "assistant",
        message: response.data,
      };
      chatMessages.push(assistantMessage);

      // 連続するメッセージの間に"skip"メッセージを追加
      chatMessages = insertSkipMessages(chatMessages);

      // 更新されたメッセージリストをJSON文字列に変換
      const updatedContentWithAssistant = [JSON.stringify(chatMessages)];

      // 既存のチャットを更新（レスポンスを追加）
      if (chatId) {
        await client.models.ChatHistory.update({
          id: chatId,
          content: updatedContentWithAssistant,
        });

        // レスポンス追加後にチャット詳細を取得
        if (setSelectedChat) {
          await describeChat(client, chatId, setSelectedChat);
        }
      }
    }
  } catch (error) {
    console.error("チャットの作成または更新中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
