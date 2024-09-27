import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import type { Schema } from "../../data/resource";

const config = {
  region: "us-west-2",
  maxAttempts: 30,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 900000,
    socketTimeout: 900000,
  }),
};
const bedrock_client = new BedrockRuntimeClient(config);
const iot_client = new IoTDataPlaneClient(config);
const model_id = "anthropic.claude-3-haiku-20240307-v1:0";

interface Message {
  role: string;
  message: string;
}

export const handler: Schema["ChatClaude"]["functionHandler"] = async (event) => {
  try {
    const rawContent = event.arguments.content as string[] | undefined; // 入力テキスト
    const topic = event.arguments.email as string | undefined;
    // console.log("Raw content:", rawContent);
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
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      system: "あなたはreact markdownライブラリの形式に適した出力を生成するAIアシスタントです。マークダウン形式で回答を提供し、必要に応じて適切なマークダウン記法を使用してください。見出し、リスト、コードブロック、リンク、画像などの要素を適切に組み込んでください。react markdownライブラリで正しくレンダリングされるよう、構文に注意を払ってください。ユーザーの質問や要求に対して、明確で構造化された回答を提供し、マークダウンの機能を活用して情報を効果的に表示してください。",
      messages: newContent,
    };
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: model_id,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    const response = await bedrock_client.send(command);

    if (response.body) {
      let sequenceNumber = 0;
      for await (const chunk of response.body) {
        sequenceNumber++;
        const decodedChunk = new TextDecoder().decode(chunk.chunk?.bytes);
        try {
          const parsedChunk = JSON.parse(decodedChunk);
          if (parsedChunk.type === "content_block_delta" && parsedChunk.delta.text) {
            const chunkText = parsedChunk.delta.text;

            // チャンクを受信するたびに IoT Core に publish
            // QoS1は正確に一度送信する、QoS1は信頼性が低く保証されない
            const publishParams = {
              topic: topic,
              qos: 1,
              payload: JSON.stringify({ role: "claude", message: chunkText, sequence: sequenceNumber }),
            };
            await iot_client.send(new PublishCommand(publishParams));
            // console.log("Published chunk successfully");
          }
        } catch (parseError) {
          console.error("Error parsing chunk:", parseError);
        }
      }
    } else {
      console.log("No response body received from Bedrock");
    }

    return "Streaming completed";
  } catch (error) {
    console.error("An error occurred:", error);
    throw new Error(`エラーが発生しました。詳細: ${error instanceof Error ? error.message : "不明なエラー"}`);
  }
};
