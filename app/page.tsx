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

import { createChat } from "@/app/utils/createChat";
import { deleteChat } from "@/app/utils/deleteChat";
import { describeChat } from "@/app/utils/describeChat";
import { formatTimestamp } from "./utils/formatTimestamp";

Amplify.configure(outputs);

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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = client.models.ChatHistory.observeQuery().subscribe({
      next: ({ items }) => {
        const sortedItems = [...items].sort((a, b) => {
          const timestampA = formatTimestamp(a.createdAt);
          const timestampB = formatTimestamp(b.createdAt);
          return timestampB.localeCompare(timestampA);
        });
        setChats(sortedItems);
        if (sortedItems.length > 0) {
          const firstItemId = sortedItems[0].id;
          handleDescribeChat(firstItemId);
        }
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const handleCreateChat = () => {
    createChat(textareaRef, setLoading, selectedChat?.id);
    // setMessage(data);
  };
  const handleDeleteChat = async (id: string) => {
    deleteChat(id, setIsDeleting);
  };
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
          {chats.map(({ id, messages, createdAt }) => (
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
            selectedChat.messages &&
            Array.isArray(selectedChat.messages) &&
            selectedChat.messages.map((message: { role: string; content: string }, index: number) => (
              <p key={index} className={`break-words px-4 py-2 rounded-lg ${message.role === "user" ? "bg-blue-100" : message.role === "assistant" ? "bg-red-100" : "bg-slate-100"}`}>
                {message.content}
              </p>
            ))}
          <div className="mt-auto">
            <div className="pb-3">
              <Textarea name="Outlined" placeholder="Type in here…" variant="outlined" slotProps={{ textarea: { ref: textareaRef } }} />
            </div>
            <div className="flex justify-end">{loading ? <Button loading>Create Chat</Button> : <Button onClick={handleCreateChat}>Create Chat</Button>}</div>
            <p>{message ?? "No message"}</p>
          </div>
        </div>

        <div className="w-1/6 flex justify-center p-3 m-3 border-blue-300 border-2">right-bar</div>
      </div>
    </main>
  );
}
