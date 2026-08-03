import type { Logger } from "pino";
import type { MessageQueueConsumer, QueueMessage } from "../ports/message-queue.consumer";
import { workerMessageSchema } from "../schemas/worker-message.schema";

export interface MessageWorkerOptions {
  readonly logger: Logger;
  readonly maxMessages: number;
  readonly queue: MessageQueueConsumer;
  readonly visibilityTimeoutSeconds: number;
  readonly waitTimeSeconds: number;
}

export class MessageWorker {
  constructor(private readonly options: MessageWorkerOptions) {}

  async run(signal: AbortSignal): Promise<void> {
    this.options.logger.info("worker_started");

    while (!signal.aborted) {
      await this.pollOnce(signal);
    }
  }

  async pollOnce(signal?: AbortSignal): Promise<number> {
    const messages = await this.options.queue.receive({
      maxMessages: this.options.maxMessages,
      ...(signal ? { signal } : {}),
      visibilityTimeoutSeconds: this.options.visibilityTimeoutSeconds,
      waitTimeSeconds: this.options.waitTimeSeconds,
    });
    await Promise.allSettled(messages.map((message) => this.process(message)));
    return messages.length;
  }

  private async process(message: QueueMessage): Promise<void> {
    if (!message.body || !message.receiptHandle) {
      this.options.logger.warn({ messageId: message.id }, "worker_message_incomplete");
      return;
    }

    try {
      const envelope = workerMessageSchema.parse(JSON.parse(message.body) as unknown);
      await this.dispatch(envelope.type, envelope.id, envelope.correlationId);
      await this.options.queue.acknowledge(message.receiptHandle);
      this.options.logger.info(
        { correlationId: envelope.correlationId, eventId: envelope.id, eventType: envelope.type },
        "worker_message_processed",
      );
    } catch (error) {
      this.options.logger.error(
        {
          error: error instanceof Error ? error.message : "unknown_error",
          messageId: message.id,
          receiveCount: message.receiveCount,
        },
        "worker_message_failed",
      );
    }
  }

  private async dispatch(type: "bus.healthcheck.v1", eventId: string, correlationId: string) {
    this.options.logger.debug({ correlationId, eventId, type }, "worker_healthcheck_received");
    await Promise.resolve();
  }
}
