import { defineFunction } from "@aws-amplify/backend";

export const chatClaude = defineFunction({
  name: "chat-claude",
  entry: "./handler.ts",
  timeoutSeconds: 900,
});
