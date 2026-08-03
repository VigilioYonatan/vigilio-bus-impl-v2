import { SQSClient } from "@aws-sdk/client-sqs";
import { createAwsClientConfig } from "./aws-local.config";

export function createSqsClient(): SQSClient {
  const { forcePathStyle: _forcePathStyle, ...configuration } = createAwsClientConfig();
  return new SQSClient(configuration);
}
