import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatClaude } from "../functions/chat-claude/resource";
import { pubSub } from "../functions/pubsub/resource";
import { chatGPT } from "../functions/chat-gpt/resource";

// content: a.json().array()
// ★2重配列であり、''で囲む必要がある
// ['[{"role":"user","message":"test"},{"role":"assistant","message":"test"},{"role":"user","message":"test"}]'];

// Lambdaのテストで利用する--stream-function-logsは、最新版出ないと対応していないため、以下コマンドでアップデートしておく
// npm i @aws-amplify/backend-cli
const schema = a.schema({
  ChatHistory: a
    .model({
      id: a.id().required(),
      email: a.string().required(),
      content: a.json().array(),
    })
    .authorization((allow) => [allow.authenticated()]),
  ChatClaude: a
    .query()
    .arguments({
      email: a.string(),
      content: a.json().array(),
    })
    .returns(a.string())
    .handler(a.handler.function(chatClaude))
    .authorization((allow) => [allow.authenticated()]),
  ChatGPT: a
    .query()
    .arguments({
      email: a.string(),
      content: a.json().array(),
    })
    .returns(a.string())
    .handler(a.handler.function(chatGPT))
    .authorization((allow) => [allow.authenticated()]),
  PubSub: a
    .query()
    .arguments({
      cognitoIdentityId: a.string(),
    })
    .returns(a.string())
    .handler(a.handler.function(pubSub))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
