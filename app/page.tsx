"use client";
import { useState, useEffect, useRef } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import { Authenticator } from "@aws-amplify/ui-react";
import { fetchUserAttributes, fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

import { newCreateChat } from "@/app/utils/newCreateChat";
import { createChat } from "@/app/utils/createChat";
import { deleteChat } from "@/app/utils/deleteChat";
import { describeChat } from "@/app/utils/describeChat";
import { formatTimestamp } from "./utils/formatTimestamp";

// Amplifyの設定
Amplify.configure(outputs);
const client = generateClient<Schema>();

type Message = {
  role: string;
  content: string;
};
type ChatHistory = Schema["ChatHistory"]["type"];

export default function App() {
  ////////////////////////////
  /// React State, Ref定義 ///
  ////////////////////////////
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  const [email, setEmail] = useState<string>("");

  ////////////
  /// 認証 ///
  ////////////
  // ユーザ情報を取得する
  const getAuthenticatedUser = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true }); // セッションの自動リフレッシュ
      const { username, userId, signInDetails } = await getCurrentUser(); // 情報取得1
      const attributes = await fetchUserAttributes(); // 情報取得2
      if (attributes.email) {
        setEmail(attributes.email);
      } else {
        console.log("Email not found in user attributes");
      }
    } catch (error) {
      console.log(error);
    }
  };
  // Hubで認証関連(サインアップやサインアウト)のイベントリスナーを設定
  Hub.listen("auth", async (data) => {
    switch (data.payload.event) {
      // サインイン時のイベントリスナー
      case "signedIn": {
        getAuthenticatedUser();
        break;
      }
    }
  });

  //////////////////////////////////
  /// チャット履歴一覧の取得と監視 ///
  /////////////////////////////////
  // https://docs.amplify.aws/nextjs/build-a-backend/data/subscribe-data/
  // observeQueryは、(onCreate, onUpdate, onDelete)全てのデータベース更新情報をリアルタイムに取得できる
  useEffect(() => {
    const fetchChats = async () => {
      await getAuthenticatedUser();
      if (email) {
        const sub = client.models.ChatHistory.observeQuery({
          filter: { email: { eq: email } },
        }).subscribe({
          next: ({ items }) => {
            const sortedItems = [...items].sort((a, b) => {
              const timestampA = formatTimestamp(a.createdAt);
              const timestampB = formatTimestamp(b.createdAt);
              return timestampB.localeCompare(timestampA);
            });
            setChats(sortedItems);
            if (sortedItems.length > 0 && !selectedChat) {
              const firstItemId = sortedItems[0].id;
              if (firstItemId) {
                handleDescribeChat(firstItemId);
              }
            }
          },
        });
        return () => sub.unsubscribe();
      }
    };

    fetchChats();
  }, [email, selectedChat]);

  /////////////////////////////////////////
  /// チャットの作成・削除・表示などの処理 ///
  /////////////////////////////////////////
  // チャット作成処理1 (Buttonを押した場合)
  const handleCreateChat = async () => {
    await createChat(email, textareaRef, setLoading, selectedChat?.id, setSelectedChat);
  };
  // チャット作成処理2 (Enterキーを押した場合)
  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        // Shift+Enter の場合は改行
        return;
      } else {
        // Enter の場合は handleCreateChat を実行
        event.preventDefault(); // Enterキーのデフォルト動作を防ぐ（改行を防ぐ）
        await createChat(email, textareaRef, setLoading, selectedChat?.id, setSelectedChat);
      }
    }
  };

  // 新しいチャット作成処理
  const handleNewCreateChat = async () => {
    await newCreateChat(email, setLoading, setSelectedChat);
  };

  // チャット削除処理
  const handleDeleteChat = async (id: string) => {
    await deleteChat(id, setIsDeleting, setLoading, handleDescribeChat);
  };

  // チャット内容表示処理
  const handleDescribeChat = async (id: string) => {
    await describeChat(client, id, setSelectedChat);
  };

  /////////////////
  /// Rendering ///
  /////////////////
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main>
          <div className="flex flex-col justify-center items-center">
            <h1 className="text-4xl w-fit p-3 m-3 border-blue-300 border-2">My Chat</h1>
            <p className="pb-4">こんにちは {email} さん</p>
            <div className="pb-4">
              <Button onClick={signOut}>Sign out</Button>
            </div>
          </div>

          <div className="flex flex-row">
            <div className="flex flex-col items-center w-1/6 p-3 m-3 border-blue-300 border-2">
              <p className="pb-3">left-bar</p>
              <div className="pb-4">{loading ? <Button loading>New Chat</Button> : <Button onClick={handleNewCreateChat}>New Chat</Button>}</div>
              {chats.map(({ id, content, createdAt }) => (
                <div className="flex flex-row items-center mb-2">
                  <Button key={id} variant="outlined" onClick={() => handleDescribeChat(id)}>
                    <p>{formatTimestamp(createdAt)}</p>
                    <IconButton onClick={() => handleDeleteChat(id)} disabled={isDeleting[id]}>
                      <DeleteIcon />
                    </IconButton>
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col w-4/6 p-3 m-3 border-blue-300 border-2">
              {selectedChat &&
                selectedChat.content &&
                Array.isArray(selectedChat.content) &&
                selectedChat.content.length > 0 &&
                typeof selectedChat.content[0] === "string" &&
                JSON.parse(selectedChat.content[0]).map((message: { role: string; message: string }, index: number) => (
                  <p key={index} className={`break-words px-4 py-2 mb-2 rounded-lg ${message.role === "user" ? "bg-blue-100" : message.role === "assistant" ? "bg-red-100" : "bg-slate-100"}`}>
                    {message.message}
                  </p>
                ))}
              <div className="mt-auto">
                <div className="pb-3">
                  <Textarea name="Outlined" placeholder="Type in here…" variant="outlined" slotProps={{ textarea: { ref: textareaRef, onKeyDown: handleKeyDown } }} />
                </div>
                <div className="flex justify-end">{loading ? <Button loading>Create Chat</Button> : <Button onClick={handleCreateChat}>Create Chat</Button>}</div>
              </div>
            </div>

            <div className="w-1/6 flex justify-center p-3 m-3 border-blue-300 border-2">right-bar</div>
          </div>
        </main>
      )}
    </Authenticator>
  );
}
