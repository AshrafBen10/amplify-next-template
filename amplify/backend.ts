import * as iam from "aws-cdk-lib/aws-iam";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { chatClaude } from "./functions/chat-claude/resource";

const backend = defineBackend({
  auth,
  data,
  chatClaude,
});

// CDKを利用してLambdaに追加のIAM Policyを割り当てる
const chatClaudeFunction = backend.chatClaude.resources.lambda;
const statement = new iam.PolicyStatement({
  sid: "AllowBedrockFullAccess",
  actions: ["bedrock:*"],
  resources: ["*"],
});
chatClaudeFunction.addToRolePolicy(statement);
