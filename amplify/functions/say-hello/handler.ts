// AWS SDK (TypeScript)のマニュアル
// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

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

export const handler: Schema["sayHello"]["functionHandler"] = async (event) => {
  const prompt = event.arguments.name || "nothing";
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
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
  return responseBody.content[0].text;
};
