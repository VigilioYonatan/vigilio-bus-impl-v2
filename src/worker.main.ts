import "reflect-metadata";
import pino from "pino";
import { createSqsClient } from "./shared/infrastructure/aws/sqs.client";
import { validateEnvironmentAsync } from "./shared/infrastructure/config/environment.schema";
import { MessageWorker } from "./worker/application/service/message-worker";
import { SqsMessageQueueConsumer } from "./worker/infrastructure/sqs/sqs-message-queue.consumer";

async function bootstrap(): Promise<void> {
  const environment = await validateEnvironmentAsync();
  if (!environment.SQS_QUEUE_URL) {
    throw new Error("SQS_QUEUE_URL is required by the worker process");
  }

  const logger = pino({
    base: { service_name: "bus-impl-v2-worker" },
    level: environment.LOG_LEVEL ?? "info",
    redact: { paths: ["queueUrl"], remove: true },
  });
  const sqsClient = createSqsClient();
  const queue = new SqsMessageQueueConsumer(sqsClient, environment.SQS_QUEUE_URL);
  const abortController = new AbortController();

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => abortController.abort());
  }

  try {
    const worker = new MessageWorker({
      logger,
      maxMessages: environment.WORKER_MAX_MESSAGES,
      queue,
      visibilityTimeoutSeconds: environment.WORKER_VISIBILITY_TIMEOUT_SECONDS,
      waitTimeSeconds: environment.WORKER_WAIT_TIME_SECONDS,
    });
    await worker.run(abortController.signal);
  } catch (error) {
    if (!abortController.signal.aborted) {
      throw error;
    }
  } finally {
    sqsClient.destroy();
    logger.info("worker_stopped");
  }
}

void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
