import { IoTClient, AttachPolicyCommand } from "@aws-sdk/client-iot";
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
const iotClient = new IoTClient(config);
const iotPolicyName = "amplify-iot-policy";

export const handler: Schema["PubSub"]["functionHandler"] = async (event) => {
  try {
    const cognitoIdentityId = event.arguments.cognitoIdentityId as string | undefined;
    console.log("Cognit Identity ID:", cognitoIdentityId);
    const command = new AttachPolicyCommand({
      policyName: iotPolicyName,
      target: cognitoIdentityId,
    });
    await iotClient.send(command);
    console.log("PubSub設定が成功しました");
    return "PubSub設定が成功しました";
  } catch (error) {
    console.error("An error occurred:", error);
    if (error instanceof Error) {
      return `エラーが発生しました。詳細: ${error.message}`;
    } else {
      return "エラーが発生しました。詳細は不明です。";
    }
  }
};
