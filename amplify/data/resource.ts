import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatClaude } from "../functions/chat-claude/resource";

// content: a.json().array()
// [
//   {
//     "message": "test1",
//     "role": "user"
//   },
//   {
//     "message": "test2",
//     "role": "assistant"
//   },
//   {
//     "message": "test3",
//     "role": "user"
//   }
// ]

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
