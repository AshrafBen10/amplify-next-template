import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatClaude } from "../functions/chat-claude/resource";

const schema = a.schema({
  ChatHistory: a
    .model({
      id: a.id().required(),
      content: a.json().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  chatClaude: a
    .query()
    .arguments({
      content: a.json().required(),
    })
    .returns(a.string())
    .handler(a.handler.function(chatClaude))
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
