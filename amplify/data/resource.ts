import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatClaude } from "../functions/chat-claude/resource";

// content: a.json().array()
// ★2重配列であり、''で囲む必要がある
// ['[{"role":"user","message":"test"},{"role":"assistant","message":"test"},{"role":"user","message":"test"}]'];

const schema = a.schema({
  ChatHistory: a
    .model({
      id: a.id().required(),
      content: a.json().array().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  ChatClaude: a
    .query()
    .arguments({
      content: a.json().array().required(),
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
