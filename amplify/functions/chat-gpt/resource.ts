import { defineFunction } from "@aws-amplify/backend";

export const chatGPT = defineFunction({
  name: "chat-gpt",
  entry: "./handler.ts",
  timeoutSeconds: 900,
});
