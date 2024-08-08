import { defineFunction } from "@aws-amplify/backend";

export const pubSub = defineFunction({
  name: "pubsub",
  entry: "./handler.ts",
  timeoutSeconds: 900,
});
