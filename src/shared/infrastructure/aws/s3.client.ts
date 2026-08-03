import { S3Client } from "@aws-sdk/client-s3";
import { createAwsClientConfig } from "./aws-local.config";

export function createS3Client(): S3Client {
  return new S3Client(createAwsClientConfig());
}
