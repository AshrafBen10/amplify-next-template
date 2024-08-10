import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { v4 as uuidv4 } from "uuid";
import { describeChat } from "@/app/utils/describeChat";

const client = generateClient<Schema>();

////////////////////////////////////////////////////////
/// メッセージリストの中に"skip"メッセージを挿入する関数 ///
////////////////////////////////////////////////////////
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

////////////////////////////////
/// チャット作成または更新処理 ///
////////////////////////////////
export const createChat = async (email: string, textareaRef: React.RefObject<HTMLTextAreaElement>, setLoading: (loading: boolean) => void, setSelectedChat: (chat: Schema["ChatHistory"]["type"] | null) => void, selectedChatId?: string) => {
  setLoading(true);
  let chatId: string | undefined;
  try {
    if (textareaRef.current?.value) {
      const value = textareaRef.current.value; // ユーザが入力したチャット情報を取得
      const newContent = {
        message: value,
        role: "user",
      };
      let chatMessages: any[] = [];

      if (selectedChatId) {
        /////////////////////////////////////////////////////////////
        /// ユーザが入力したチャットを既存のチャット履歴に反映する処理 ///
        /////////////////////////////////////////////////////////////
        const existingChat = await client.models.ChatHistory.get({ id: selectedChatId }); // 既存のチャット履歴を取得
        if (existingChat.data && existingChat.data.content) {
          const content = existingChat.data.content[0];
          if (typeof content === "string") {
            chatMessages = JSON.parse(content);
          }
          chatId = existingChat.data.id;
          chatMessages.push(newContent); // チャット履歴に新しいユーザが入力したチャットを追加

          // メッセージのroleが連続する場合の処理
          chatMessages = insertSkipMessages(chatMessages);

          // ユーザが入力したチャット情報をLambda引数用に変換
          const updatedContent = [JSON.stringify(chatMessages)];

          // ユーザが入力したチャット情報をデータベースに反映する
          await client.models.ChatHistory.update({
            id: chatId,
            content: updatedContent,
          });

          // 更新後にチャット内容を取得し、画面に反映する
          await describeChat(client, chatId, setSelectedChat);
        } else {
          console.error("指定されたIDのチャットが見つかりません");
          return;
        }
      } else {
        chatId = uuidv4();
        chatMessages = [newContent];

        // 連続するメッセージの間に"skip"メッセージを追加
        chatMessages = insertSkipMessages(chatMessages);

        // 新しいメッセージリストをJSON文字列に変換
        const newContentString = [JSON.stringify(chatMessages)];

        // 新しいチャットを作成
        await client.models.ChatHistory.create({
          id: chatId,
          email: email,
          content: newContentString,
        });

        // 作成後にチャット詳細を取得
        await describeChat(client, chatId, setSelectedChat);
      }
      ////////////////////////////////////////////////
      /// 生成AIのチャットをチャット履歴に反映する処理 ///
      ////////////////////////////////////////////////
      // textareaの内容をクリア
      textareaRef.current.value = "";

      /// awaitしない!!
      /// ChatClaudeに問い合わせてレスポンスを取得 ///
      client.queries.ChatClaude({
        email: email,
        content: [JSON.stringify(chatMessages)],
      });
      /// ChatGPTに問い合わせてレスポンスを取得 ///
      client.queries.ChatGPT({
        email: email,
        content: [JSON.stringify(chatMessages)],
      });
    }
  } catch (error) {
    console.error("チャットの作成または更新中にエラーが発生しました:", error);
  } finally {
    setLoading(false);
  }
};
