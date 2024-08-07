import { defineAuth, secret } from "@aws-amplify/backend";

// https://docs.amplify.aws/nextjs/build-a-backend/auth/concepts/external-identity-providers/
// https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/

// ・emailのログインはデフォルトで必須
// ・ブランチごとのsecretは、Amplifyのコンソール画面から作成可能
// 　sandbox環境のシークレットは以下のコマンドで設定する
// 　https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/#local-environment
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email"],
        attributeMapping: {
          email: "email",
        },
      },
      callbackUrls: ["https://be1748a04fef8dfa848d.auth.us-west-2.amazoncognito.com", "http://localhost:3000/", "https://dev.chatbot.metalmental.net"],
      logoutUrls: ["http://localhost:3000/", "https://www.dev.chatbot.metalmental.net"],
      // callbackUrls: ["http://localhost:3000/", "https://www.chatbot.metalmental.net"],
      // logoutUrls: ["http://localhost:3000/", "https://www.chatbot.metalmental.net"],
    },
  },
});
