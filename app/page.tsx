"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import { PubSub } from "@aws-amplify/pubsub";
import { CONNECTION_STATE_CHANGE, ConnectionState } from "@aws-amplify/pubsub";

import { newCreateChat } from "@/app/utils/newCreateChat";
import { createChat } from "@/app/utils/createChat";
import { deleteChat } from "@/app/utils/deleteChat";
import { describeChat } from "@/app/utils/describeChat";
import { formatTimestamp } from "./utils/formatTimestamp";

Amplify.configure(outputs);
const client = generateClient<Schema>();
I18n.putVocabularies(translations);
I18n.setLanguage("ja");
type ChatHistory = Schema["ChatHistory"]["type"];

const TOPIC = "test";
const pubsub = new PubSub({
  region: "us-west-2",
  endpoint: "wss://atiwkw1dtx972-ats.iot.us-west-2.amazonaws.com/mqtt",
});

export default function App() {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  const [email, setEmail] = useState<string>("");
  const [cognitoIdentityId, setCognitoIdentityId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);

  const getAuthenticatedUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const identityId = session.identityId as string;
      if (identityId !== cognitoIdentityId) {
        setCognitoIdentityId(identityId);
      }
      const { username, userId, signInDetails } = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      if (attributes.email && attributes.email !== email) {
        setEmail(attributes.email);
      }
    } catch (error) {
      console.log(error);
    }
  }, [cognitoIdentityId, email]);

  useEffect(() => {
    getAuthenticatedUser();
  }, [getAuthenticatedUser]);

  useEffect(() => {
    Hub.listen("auth", async (data) => {
      if (data.payload.event === "signedIn") {
        getAuthenticatedUser();
      }
    });
  }, [getAuthenticatedUser]);

  useEffect(() => {
    if (!email) return;

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
  }, [email, selectedChat]);

  useEffect(() => {
    if (!cognitoIdentityId) return;

    const setupPubSub = async () => {
      try {
        const res = await client.queries.PubSub({
          cognitoIdentityId: cognitoIdentityId,
        });
        console.log(res);

        interface PubSubMessage {
          role: string;
          message: string;
        }
        // dataは、PubSubMessageになる
        const sub = pubsub.subscribe({ topics: TOPIC }).subscribe({
          next: (data: any) => {
            setMessage(data.message);
            console.log("Message received", data);
          },
          error: console.error,
        });

        const hubListener = Hub.listen("pubsub", (data: any) => {
          const { payload } = data;
          if (payload.event === CONNECTION_STATE_CHANGE) {
            setConnectionState(payload.data.connectionState as ConnectionState);
          }
        });

        return () => {
          sub.unsubscribe();
          hubListener();
        };
      } catch (error) {
        console.error("Error setting up PubSub:", error);
      }
    };

    const cleanup = setupPubSub();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
    };
  }, [cognitoIdentityId]);

  const handleCreateChat = useCallback(async () => {
    await createChat(email, textareaRef, setLoading, selectedChat?.id, setSelectedChat);
  }, [email, selectedChat]);

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await createChat(email, textareaRef, setLoading, selectedChat?.id, setSelectedChat);
      }
    },
    [email, selectedChat],
  );

  const handleNewCreateChat = useCallback(async () => {
    await newCreateChat(email, setLoading, setSelectedChat);
  }, [email]);

  const handleDeleteChat = useCallback(async (id: string) => {
    await deleteChat(id, setIsDeleting, setLoading, handleDescribeChat);
  }, []);

  const handleDescribeChat = useCallback(async (id: string) => {
    await describeChat(client, id, setSelectedChat);
  }, []);

  return (
    <Authenticator variation="modal">
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
                <div key={id} className="flex flex-row items-center mb-2">
                  <Button variant="outlined" onClick={() => handleDescribeChat(id)}>
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

            <div className="w-1/6 flex flex-col items-center p-3 m-3 border-blue-300 border-2">
              <div>right-bar</div>
              {message && (
                <div className="bg-green-100 p-2 mb-4 rounded">
                  <p>{message}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </Authenticator>
  );
}
