import {
  CreateQueueCommand,
  DeleteQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import pino from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSqsClient } from "@/shared/infrastructure/aws/sqs.client";
import { MessageWorker } from "@/worker/application/service/message-worker";
import { SqsMessageQueueConsumer } from "@/worker/infrastructure/sqs/sqs-message-queue.consumer";

const sqsClient = createSqsClient();
let queueUrl = "";

describe("SQS worker with Floci", () => {
  beforeAll(async () => {
    const response = await sqsClient.send(
      new CreateQueueCommand({ QueueName: `bus-impl-v2-worker-${Date.now()}` }),
    );
    queueUrl = response.QueueUrl ?? "";
    expect(queueUrl).not.toBe("");
  });

  afterAll(async () => {
    if (queueUrl) {
      await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
    }
    sqsClient.destroy();
  });

  it("deletes a valid message only after the handler succeeds", async () => {
    await sqsClient.send(
      new SendMessageCommand({
        MessageBody: JSON.stringify({
          correlationId: "floci-integration",
          id: "a64a88c5-eb76-40be-9dc5-a09f61da6e59",
          occurredAt: "2026-08-02T12:00:00.000Z",
          payload: {},
          type: "bus.healthcheck.v1",
          version: 1,
        }),
        QueueUrl: queueUrl,
      }),
    );

    const worker = new MessageWorker({
      logger: pino({ level: "silent" }),
      maxMessages: 1,
      queue: new SqsMessageQueueConsumer(sqsClient, queueUrl),
      visibilityTimeoutSeconds: 30,
      waitTimeSeconds: 1,
    });

    await expect(worker.pollOnce()).resolves.toBe(1);
    const remaining = await sqsClient.send(
      new ReceiveMessageCommand({ MaxNumberOfMessages: 1, QueueUrl: queueUrl, WaitTimeSeconds: 1 }),
    );
    expect(remaining.Messages ?? []).toHaveLength(0);
  });
});
