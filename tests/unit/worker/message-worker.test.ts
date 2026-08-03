import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import type { MessageQueueConsumer } from "@/worker/application/ports/message-queue.consumer";
import { MessageWorker } from "@/worker/application/service/message-worker";

function createWorker(queue: MessageQueueConsumer): MessageWorker {
  return new MessageWorker({
    logger: pino({ level: "silent" }),
    maxMessages: 1,
    queue,
    visibilityTimeoutSeconds: 30,
    waitTimeSeconds: 1,
  });
}

describe("MessageWorker", () => {
  it("acknowledges a valid message after successful dispatch", async () => {
    const acknowledge = vi.fn<MessageQueueConsumer["acknowledge"]>();
    const queue: MessageQueueConsumer = {
      acknowledge,
      receive: vi.fn().mockResolvedValue([
        {
          body: JSON.stringify({
            correlationId: "request-123",
            id: "1d4f4a7c-96f5-41fd-91d1-3a44eedf2d72",
            occurredAt: "2026-08-02T12:00:00.000Z",
            payload: {},
            type: "bus.healthcheck.v1",
            version: 1,
          }),
          id: "message-1",
          receiptHandle: "receipt-1",
          receiveCount: "1",
        },
      ]),
    };

    await expect(createWorker(queue).pollOnce()).resolves.toBe(1);
    expect(acknowledge).toHaveBeenCalledWith("receipt-1");
  });

  it("does not acknowledge malformed or unknown messages", async () => {
    const acknowledge = vi.fn<MessageQueueConsumer["acknowledge"]>();
    const queue: MessageQueueConsumer = {
      acknowledge,
      receive: vi.fn().mockResolvedValue([
        {
          body: JSON.stringify({ type: "unknown.v1" }),
          id: "message-2",
          receiptHandle: "receipt-2",
          receiveCount: "3",
        },
      ]),
    };

    await expect(createWorker(queue).pollOnce()).resolves.toBe(1);
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it("leaves incomplete messages for redrive", async () => {
    const acknowledge = vi.fn<MessageQueueConsumer["acknowledge"]>();
    const queue: MessageQueueConsumer = {
      acknowledge,
      receive: vi
        .fn()
        .mockResolvedValue([
          { body: undefined, id: "message-3", receiptHandle: undefined, receiveCount: "1" },
        ]),
    };

    await expect(createWorker(queue).pollOnce()).resolves.toBe(1);
    expect(acknowledge).not.toHaveBeenCalled();
  });
});
