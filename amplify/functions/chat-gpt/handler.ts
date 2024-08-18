import OpenAI from "openai";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import type { Schema } from "../../data/resource";

const config = {
  region: "us-west-2",
  maxAttempts: 30,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 900000,
    socketTimeout: 900000,
  }),
};
const iot_client = new IoTDataPlaneClient(config);
const secret_client = new SecretsManagerClient(config);
const model_id = "gpt-4o-mini";

interface Message {
  role: string;
  message: string;
}

// AWS Secrets Managerからシークレットを取得する関数
async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });
    const response = await secret_client.send(command);
    if (response.SecretString) {
      const secretJson = JSON.parse(response.SecretString);
      return secretJson[secretName];
    }
    throw new Error(`Secret ${secretName} not found or empty`);
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

export const handler: Schema["ChatClaude"]["functionHandler"] = async (event) => {
  try {
    const rawContent = event.arguments.content as string[] | undefined;
    const topic = event.arguments.email as string | undefined;
    console.log("Raw content:", rawContent);
    let newContent;
    if (rawContent && Array.isArray(rawContent) && rawContent.length > 0) {
      const parsedContent = Array.isArray(rawContent[0]) ? rawContent[0] : JSON.parse(rawContent[0]);
      newContent = parsedContent.map((item: Message) => ({
        role: item.role,
        content: [{ type: "text", text: item.message }],
      }));
    } else {
      newContent = [{ role: "user", content: [{ type: "text", text: "こんにちは" }] }];
    }

    const openapi_key = await getSecret("openapikey");
    const openapi_org = await getSecret("openapiorg");
    const openapi_pj = await getSecret("openapipj");
    const openai = new OpenAI({
      apiKey: openapi_key,
      organization: openapi_org,
      project: openapi_pj,
    });
    const stream = await openai.chat.completions.create({
      model: model_id,
      messages: newContent as OpenAI.Chat.ChatCompletionMessage[],
      stream: true,
      max_tokens: 4000,
    });

    if (stream) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          const publishParams = {
            topic: topic,
            payload: JSON.stringify({ role: "chatgpt", message: text }),
          };
          await iot_client.send(new PublishCommand(publishParams));
          // console.log("Published chunk successfully");
        }
      }
    } else {
      console.log("No response stream received from OpenAI");
    }

    console.log("Streaming completed");
    return "Streaming completed";
  } catch (error) {
    console.error("An error occurred:", error);
    throw new Error(`エラーが発生しました。詳細: ${error instanceof Error ? error.message : "不明なエラー"}`);
  }
};
