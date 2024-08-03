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
import { createChat } from "@/app/utils/createChat";
import { deleteChat } from "@/app/utils/deleteChat";
import IconButton from "@mui/joy/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [chats, setChats] = useState<Schema["ChatHistory"]["type"][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sub = client.models.ChatHistory.observeQuery().subscribe({
      next: ({ items }) => {
        setChats([...items]);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const handleCreateChat = () => {
    createChat(textareaRef, setLoading);
  };
  const handleDeleteChat = async (id: string) => {
    deleteChat(id, setIsDeleting);
  };

  return (
    <main>
      <h1>My Chat</h1>
      <Textarea name="Outlined" placeholder="Type in here…" variant="outlined" slotProps={{ textarea: { ref: textareaRef } }} />
      <div className="flex flex-col items-start">
        {chats.map(({ id, chat }) => (
          <div className="flex flex-row items-center space-x-4 border border-gray-200 rounded-md p-2 mb-2 max-w-full" key={id}>
            <p className="break-words">{chat}</p>
            <IconButton onClick={() => handleDeleteChat(id)} disabled={isDeleting[id]}>
              <DeleteIcon />
            </IconButton>
          </div>
        ))}
      </div>
      {loading ? <Button loading>Create Chat</Button> : <Button onClick={handleCreateChat}>Create Chat</Button>}
    </main>
  );
}
