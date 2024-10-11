# フロー図
![flow](https://github.com/user-attachments/assets/dcb8226d-9b07-431f-9928-0db91c7271f6)

# Memo

## Next.js (with Amplify) は、以下の GitHub テンプレートを利用

https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/

```bash
# 開発環境を起動
# amplify_outputs.json にデータが格納される(手動でデータをセットすることも可能)
npx ampx sandbox --stream-function-logs
npm run dev

# 名前指定でサンドボックス作成(複数作成する場合など)
npx ampx sandbox --identifier sandbox1

npx ampx sandbox delete
```

```bash
Gen2は、ampxコマンドを使用する (Gen1は、amplifyコマンド)
https://docs.amplify.aws/react/reference/cli-commands/
```

```bash
Git ベースの CI/CD ワークフローを使用しているため
git commitしてgit pushすると本番環境にデプロイされる
```

## Sandbox(Amplify Studio/Amplify CLI)

以下は、旧バージョンの Gen1<br>
https://github.com/aws-amplify/amplify-cli?tab=readme-ov-file<br>
https://sandbox.amplifyapp.com/
