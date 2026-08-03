import { readEnv } from "@/shared/infrastructure/env/read-env";

export interface AwsClientConfig {
  readonly credentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
  readonly endpoint?: string;
  readonly forcePathStyle: boolean;
  readonly region: string;
}

export function createAwsClientConfig(): AwsClientConfig {
  const endpoint = readEnv("AWS_ENDPOINT_URL");
  const region = readEnv("AWS_REGION") ?? readEnv("AWS_DEFAULT_REGION") ?? "us-east-1";
  const accessKeyId = readEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY");
  const localCredentials =
    endpoint && !accessKeyId && !secretAccessKey
      ? {
          accessKeyId: "test",
          secretAccessKey: "test",
        }
      : undefined;

  return {
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
      : localCredentials
        ? { credentials: localCredentials }
        : {}),
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: Boolean(endpoint),
    region,
  };
}
