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
const model_id = "anthropic.claude-3-sonnet-20240229-v1:0";

interface Message {
  role: string;
  message: string;
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
    console.log("Prepared content:", JSON.stringify(newContent));
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      messages: newContent,
    };
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: model_id,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    console.log("Sending request to Bedrock");
    const response = await bedrock_client.send(command);

    if (response.body) {
      for await (const chunk of response.body) {
        const decodedChunk = new TextDecoder().decode(chunk.chunk?.bytes);
        console.log("Received chunk:", decodedChunk);
        try {
          const parsedChunk = JSON.parse(decodedChunk);
          console.log("Parsed chunk:", JSON.stringify(parsedChunk));
          if (parsedChunk.type === "content_block_delta" && parsedChunk.delta.text) {
            const chunkText = parsedChunk.delta.text;
            console.log("Extracted text:", chunkText);

            // チャンクを受信するたびに IoT Core に publish
            const publishParams = {
              topic: topic,
              payload: JSON.stringify({ role: "claude", message: chunkText }), // claude role
            };
            console.log("Publishing chunk to IoT Core:", JSON.stringify(publishParams));
            await iot_client.send(new PublishCommand(publishParams));
            console.log("Published chunk successfully");
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
