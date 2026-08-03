import type {
  AiChatMessageSchema,
  AiChatProviderMetadataSchema,
  AiChatUsageSchema,
} from "../schemas/ai-chat.schema";

export interface AiChatModelRequest {
  readonly conversation_id: string;
  readonly system?: string;
  readonly messages: readonly AiChatMessageSchema[];
  readonly max_tokens?: number;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly user_id: number;
}

export interface AiChatModelResponse {
  readonly answer: string;
  readonly usage: AiChatUsageSchema;
  readonly provider: AiChatProviderMetadataSchema;
}

export interface IAiChatModelProvider {
  converse(request: AiChatModelRequest): Promise<AiChatModelResponse>;
}
