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
import { v4 as uuidv4 } from "uuid";

import { createChat } from "@/app/utils/createChat";
import { deleteChat } from "@/app/utils/deleteChat";
import { describeChat } from "@/app/utils/describeChat";
import { formatTimestamp } from "./utils/formatTimestamp";

// Amplifyの設定
Amplify.configure(outputs);

// クライアントの生成
const client = generateClient<Schema>();

type Message = {
  role: string;
  content: string;
};

type ChatHistory = Schema["ChatHistory"]["type"];

export default function App() {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);

  // チャット一覧の取得と監視
  useEffect(() => {
    const sub = client.models.ChatHistory.observeQuery().subscribe({
      next: ({ items }) => {
        const sortedItems = [...items].sort((a, b) => {
          const timestampA = formatTimestamp(a.createdAt);
          const timestampB = formatTimestamp(b.createdAt);
          return timestampB.localeCompare(timestampA);
        });
        setChats(sortedItems);
        if (sortedItems.length > 0 && !selectedChat) {
          const firstItemId = sortedItems[0].id;
          handleDescribeChat(firstItemId);
        }
      },
    });
    return () => sub.unsubscribe();
  }, [selectedChat]);

  // チャット作成処理
  const handleCreateChat = () => {
    createChat(textareaRef, setLoading, selectedChat?.id, setSelectedChat);
  };

  // 新しいチャット作成処理
  const handleNewChat = async () => {
    setLoading(true);
    try {
      const newChatId = uuidv4();
      const newChatContent = { id: newChatId, content: [] };

      await client.models.ChatHistory.create(newChatContent);
      console.log("新しいチャットを作成しました:", newChatId);
      handleDescribeChat(newChatId);
    } catch (error) {
      console.error("チャットの作成中にエラーが発生しました:", error);
    } finally {
      setLoading(false);
    }
  };

  // チャット削除処理
  // const handleDeleteChat = async (id: string) => {
  //   setIsDeleting((prevState) => ({ ...prevState, [id]: true }));
  //   setLoading(true);
  //   try {
  //     await deleteChat(id, setIsDeleting);
  //     if (chats.length > 1) {
  //       const newSelectedChat = chats[0];
  //       setSelectedChat(newSelectedChat);
  //     } else {
  //       setSelectedChat(null);
  //     }
  //   } catch (error) {
  //     console.error("チャットの削除中にエラーが発生しました:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleDeleteChat = async (id: string) => {
    setIsDeleting((prevState) => ({ ...prevState, [id]: true }));
    setLoading(true);
    try {
      await deleteChat(id, setIsDeleting);
      handleDescribeChat(id);
    } catch (error) {
      console.error("チャットの削除中にエラーが発生しました:", error);
    } finally {
      setLoading(false);
    }
  };

  // チャット詳細取得処理
  const handleDescribeChat = (id: string) => {
    describeChat(client, id, setSelectedChat);
  };

  /////////////////
  /// Rendering ///
  /////////////////
  return (
    <main>
      <div className="flex justify-center items-center">
        <h1 className="text-4xl w-fit p-3 m-3 border-blue-300 border-2">My Chat</h1>
      </div>

      <div className="flex flex-row">
        <div className="flex flex-col items-center w-1/6 p-3 m-3 border-blue-300 border-2">
          <p className="pb-3">left-bar</p>
          <div className="pb-4">{loading ? <Button loading>New Chat</Button> : <Button onClick={handleNewChat}>New Chat</Button>}</div>
          {chats.map(({ id, content, createdAt }) => (
            <Button className="flex flex-row items-center space-x-4 border border-gray-200 rounded-md p-2 mb-2 max-w-full" key={id} variant="outlined" onClick={() => handleDescribeChat(id)}>
              <p>{formatTimestamp(createdAt)}</p>
              <IconButton onClick={() => handleDeleteChat(id)} disabled={isDeleting[id]}>
                <DeleteIcon />
              </IconButton>
            </Button>
          ))}
        </div>

        <div className="flex flex-col w-4/6 p-3 m-3 border-blue-300 border-2">
          {selectedChat &&
            selectedChat.content &&
            Array.isArray(selectedChat.content) &&
            selectedChat.content.length > 0 &&
            typeof selectedChat.content[0] === "string" &&
            JSON.parse(selectedChat.content[0]).map((message: { role: string; message: string }, index: number) => (
              <p key={index} className={`break-words px-4 py-2 rounded-lg ${message.role === "user" ? "bg-blue-100" : message.role === "assistant" ? "bg-red-100" : "bg-slate-100"}`}>
                {message.message}
              </p>
            ))}
          <div className="mt-auto">
            <div className="pb-3">
              <Textarea name="Outlined" placeholder="Type in here…" variant="outlined" slotProps={{ textarea: { ref: textareaRef } }} />
            </div>
            <div className="flex justify-end">{loading ? <Button loading>Create Chat</Button> : <Button onClick={handleCreateChat}>Create Chat</Button>}</div>
          </div>
        </div>

        <div className="w-1/6 flex justify-center p-3 m-3 border-blue-300 border-2">right-bar</div>
      </div>
    </main>
  );
}
