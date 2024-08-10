import { defineAuth, secret } from "@aws-amplify/backend";

// https://docs.amplify.aws/nextjs/build-a-backend/auth/concepts/external-identity-providers/
// https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/

// ・emailのログインはデフォルトで必須
// ・ブランチごとのsecretは、Amplifyのコンソール画面から作成可能
// 　sandbox環境のシークレットは以下のコマンドで設定する
// 　https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/#local-environment
// Google Search Console設定例
// https://qiita.com/kuro123/items/a6439fec530f91f84e53#google%E8%AA%8D%E8%A8%BC%E3%83%97%E3%83%AD%E3%83%90%E3%82%A4%E3%83%80%E3%83%BC%E3%81%ABamplify%E3%81%AEhostedui%E3%81%AE%E8%A8%AD%E5%AE%9A
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
      callbackUrls: ["http://localhost:3000/", "https://www.dev.chatbot.metalmental.net", "https://www.chatbot.metalmental.net"],
      logoutUrls: ["http://localhost:3000/", "https://www.dev.chatbot.metalmental.net", "https://www.chatbot.metalmental.net"],
      // callbackUrls: ["https://www.chatbot.metalmental.net"],
      // logoutUrls: ["https://www.chatbot.metalmental.net"],
    },
  },
});
