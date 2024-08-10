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
import { updateChat } from "@/app/utils/updateChat";
import { formatTimestamp } from "./utils/formatTimestamp";

///////////////
/// Amplify ///
///////////////
Amplify.configure(outputs);
const client = generateClient<Schema>();
I18n.putVocabularies(translations);
I18n.setLanguage("ja");
type ChatHistory = Schema["ChatHistory"]["type"];

///////////////////////
/// IoT Core PubSub ///
///////////////////////
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
  const [claudeMessage, setClaudeMessage] = useState("");
  const [chatgptMessage, setChatgptMessage] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);

  /////////////////////
  /// ユーザ情報取得 ///
  /////////////////////
  // useCallback の使いどころ(無限再レンダリングなどを防げる)
  // 1. 複数の useEffect が同じ関数に依存している場合
  // 2. ある useEffect の結果が別の useEffect の入力になるような場合
  const getAuthenticatedUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const identityId = session.identityId as string; // Cognito Identity IDは、IoT Policyの許可で必要
      if (identityId !== cognitoIdentityId) {
        setCognitoIdentityId(identityId);
      }
      const { username, userId, signInDetails } = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      if (attributes.email && attributes.email !== email) {
        setEmail(attributes.email); // Emailは、ユーザを識別するために利用
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

  /////////////////////////////////////
  /// データベース情報のサブスクライブ ///
  /////////////////////////////////////
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

  ////////////////////////////////////
  /// IoT Core PubSub サブスクライブ ///
  ////////////////////////////////////
  useEffect(() => {
    if (!cognitoIdentityId || !email) return;

    const setupPubSub = async () => {
      try {
        const res = await client.queries.PubSub({
          cognitoIdentityId: cognitoIdentityId,
        });

        interface PubSubMessage {
          role: string;
          message: string;
        }

        const sub = pubsub.subscribe({ topics: email }).subscribe({
          next: (data: any) => {
            if (data.role === "claude") {
              setClaudeMessage((prevMessage) => prevMessage + data.message);
            } else if (data.role === "chatgpt") {
              setChatgptMessage((prevMessage) => prevMessage + data.message);
            }
          },
          error: console.error,
          complete: () => console.log("PubSub Session Completed"),
        });

        // PubSub状態
        const hubListener = Hub.listen("pubsub", (data: any) => {
          const { payload } = data;
          if (payload.event === CONNECTION_STATE_CHANGE) {
            const newState = payload.data.connectionState as ConnectionState;
            console.log("PubSub connection state changed:", newState, payload);
            setConnectionState(newState);
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
  }, [cognitoIdentityId, email]);

  ///////////////////
  /// チャット処理 ///
  ///////////////////
  // チャット送信1 (Buttonクリック時)
  const handleCreateChat = useCallback(async () => {
    await createChat(email, textareaRef, setLoading, setSelectedChat, selectedChat?.id);
  }, [email, selectedChat]);

  // チャット送信2 (Enterキー時)
  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await createChat(email, textareaRef, setLoading, setSelectedChat, selectedChat?.id);
      }
    },
    [email, selectedChat],
  );

  // 新規チャット作成
  const handleNewCreateChat = useCallback(async () => {
    await newCreateChat(email, setLoading, setSelectedChat);
  }, [email]);

  // チャット削除
  const handleDeleteChat = useCallback(async (id: string) => {
    await deleteChat(id, setIsDeleting, setLoading, handleDescribeChat);
  }, []);

  // 生成AIのチャット更新
  /// claudeの場合 ///
  const handleUpdateClaudeChat = useCallback(async () => {
    await updateChat(setLoading, setSelectedChat, claudeMessage, setClaudeMessage, setChatgptMessage, selectedChat?.id); // ? オプショナルは最後に置く
  }, [selectedChat, setSelectedChat, claudeMessage, setClaudeMessage]);
  /// chatgptの場合 ///
  const handleUpdateChatgptChat = useCallback(async () => {
    await updateChat(setLoading, setSelectedChat, chatgptMessage, setClaudeMessage, setChatgptMessage, selectedChat?.id);
  }, [selectedChat, setSelectedChat, chatgptMessage, setChatgptMessage]);

  // チャット内容表示
  const handleDescribeChat = useCallback(async (id: string) => {
    await describeChat(client, id, setSelectedChat);
  }, []);

  ///////////////////
  /// レンダリング ///
  ///////////////////
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
                JSON.parse(selectedChat.content[0]).map((content: { role: string; message: string }, index: number) => (
                  <p key={index} className={`break-words px-4 py-2 mb-2 rounded-lg ${content.role === "user" ? "bg-blue-100" : content.role === "assistant" ? "bg-red-100" : "bg-slate-100"}`}>
                    {content.message}
                  </p>
                ))}
              <div className="flex flex-row space-x-2">
                {claudeMessage && (
                  <div className="w-1/2">
                    <p className="break-words px-4 py-2 mb-2 rounded-lg bg-green-100">{claudeMessage}</p>
                    <Button color="success" onClick={handleUpdateClaudeChat}>
                      Select Claude
                    </Button>
                  </div>
                )}
                {chatgptMessage && (
                  <div className="w-1/2">
                    <p className="break-words px-4 py-2 mb-2 rounded-lg bg-yellow-100">{chatgptMessage}</p>
                    <Button color="warning" onClick={handleUpdateChatgptChat}>
                      Select ChatGPT
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-auto">
                <div className="pb-3">
                  <Textarea name="Outlined" placeholder="Type in here…" variant="outlined" slotProps={{ textarea: { ref: textareaRef, onKeyDown: handleKeyDown } }} />
                </div>
                <div className="flex justify-end">{loading ? <Button loading>Create Chat</Button> : <Button onClick={handleCreateChat}>Create Chat</Button>}</div>
              </div>
            </div>

            <div className="w-1/6 flex flex-col items-center p-3 m-3 border-blue-300 border-2">
              <div>right-bar</div>
            </div>
          </div>
        </main>
      )}
    </Authenticator>
  );
}
