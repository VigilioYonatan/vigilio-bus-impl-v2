import { DeleteMessageCommand, ReceiveMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type {
  MessageQueueConsumer,
  QueueMessage,
  ReceiveMessagesOptions,
} from "@/worker/application/ports/message-queue.consumer";

export class SqsMessageQueueConsumer implements MessageQueueConsumer {
  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
  ) {}

  async acknowledge(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: receiptHandle }),
    );
  }

  async receive(options: ReceiveMessagesOptions): Promise<readonly QueueMessage[]> {
    const response = await this.client.send(
      new ReceiveMessageCommand({
        MaxNumberOfMessages: options.maxMessages,
        MessageAttributeNames: ["All"],
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
        QueueUrl: this.queueUrl,
        VisibilityTimeout: options.visibilityTimeoutSeconds,
        WaitTimeSeconds: options.waitTimeSeconds,
      }),
      options.signal ? { abortSignal: options.signal } : undefined,
    );

    return (response.Messages ?? []).map((message) => ({
      body: message.Body,
      id: message.MessageId,
      receiptHandle: message.ReceiptHandle,
      receiveCount: message.Attributes?.ApproximateReceiveCount,
    }));
  }
}
