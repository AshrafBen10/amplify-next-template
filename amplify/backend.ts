import * as iam from "aws-cdk-lib/aws-iam";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { sayHello } from "./functions/say-hello/resource";

const backend = defineBackend({
  auth,
  data,
  sayHello,
});

// CDKを利用してLambdaに追加のIAM Policyを割り当てる
const sayHelloFunction = backend.sayHello.resources.lambda;
const statement = new iam.PolicyStatement({
  sid: "AllowBedrockFullAccess",
  actions: ["bedrock:*"],
  resources: ["*"],
});
sayHelloFunction.addToRolePolicy(statement);
