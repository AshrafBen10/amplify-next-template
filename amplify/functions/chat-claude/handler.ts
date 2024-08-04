import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
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
const model_id = "anthropic.claude-3-sonnet-20240229-v1:0";

interface Message {
  role: string;
  message: string;
}

export const handler: Schema["chatClaude"]["functionHandler"] = async (event) => {
  const content = event.arguments.content as Message[] | undefined;

  let messages;
  if (content && Array.isArray(content)) {
    messages = content.map((item) => ({
      role: item.role,
      content: [{ type: "text", text: item.message }],
    }));
  } else {
    messages = [
      {
        role: "user",
        content: [{ type: "text", text: "こんにちは" }],
      },
    ];
  }

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    messages: messages,
  };

  const command = new InvokeModelCommand({
    modelId: model_id,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const apiResponse = await bedrock_client.send(command);
  const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
  const responseBody = JSON.parse(decodedResponseBody);

  if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
    return responseBody.content[0].text;
  } else {
    throw new Error("Unexpected response format from the API");
  }
};
