export interface QueueMessage {
  readonly body: string | undefined;
  readonly id: string | undefined;
  readonly receiptHandle: string | undefined;
  readonly receiveCount: string | undefined;
}

export interface ReceiveMessagesOptions {
  readonly maxMessages: number;
  readonly signal?: AbortSignal;
  readonly visibilityTimeoutSeconds: number;
  readonly waitTimeSeconds: number;
}

export interface MessageQueueConsumer {
  acknowledge(receiptHandle: string): Promise<void>;
  receive(options: ReceiveMessagesOptions): Promise<readonly QueueMessage[]>;
}
