import {
  BedrockRuntimeClient,
  ConverseCommand,
  type InferenceConfiguration,
  type Message,
  type SystemContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AiChatModelRequest,
  AiChatModelResponse,
  IAiChatModelProvider,
} from "@/ai-chat/application/providers/ai-chat-model.provider.interface";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

@Injectable()
export class BedrockAiChatModelProvider implements IAiChatModelProvider {
  private readonly client: BedrockRuntimeClient;
  private readonly logger = new Logger(BedrockAiChatModelProvider.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    const endpoint = this.configService.get("AWS_ENDPOINT_URL", { infer: true });

    this.client = new BedrockRuntimeClient({
      region: this.configService.get("AWS_REGION", { infer: true }),
      ...(endpoint !== undefined ? { endpoint } : {}),
    });
  }

  async converse(request: AiChatModelRequest): Promise<AiChatModelResponse> {
    const modelId = this.configService.get("BEDROCK_MODEL_ID", { infer: true });

    if (modelId === undefined) {
      throw new ServiceUnavailableException("BEDROCK_MODEL_ID no esta configurado.");
    }

    const startedAt = Date.now();

    try {
      const response = await this.client.send(
        new ConverseCommand({
          inferenceConfig: this.createInferenceConfig(request),
          messages: this.toBedrockMessages(request.messages),
          modelId,
          requestMetadata: {
            conversation_id: request.conversation_id,
            user_id: String(request.user_id),
          },
          ...(request.system !== undefined ? { system: this.toSystemPrompt(request.system) } : {}),
        }),
      );
      const answer = this.extractAssistantText(response.output?.message);

      if (answer.length === 0) {
        throw new ServiceUnavailableException("Amazon Bedrock no devolvio texto.");
      }

      return {
        answer,
        provider: {
          latency_ms: response.metrics?.latencyMs ?? Date.now() - startedAt,
          model_id: modelId,
          stop_reason: response.stopReason ?? null,
        },
        usage: {
          input_tokens: response.usage?.inputTokens ?? 0,
          output_tokens: response.usage?.outputTokens ?? 0,
          total_tokens: response.usage?.totalTokens ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        {
          action: "ai_chat.bedrock_converse_failed",
          conversation_id: request.conversation_id,
          error: error instanceof Error ? error.message : "unknown",
          model_id: modelId,
        },
        "Amazon Bedrock invocation failed",
      );

      throw new ServiceUnavailableException("No se pudo invocar Amazon Bedrock.");
    }
  }

  private createInferenceConfig(request: AiChatModelRequest): InferenceConfiguration {
    return {
      maxTokens:
        request.max_tokens ?? this.configService.get("BEDROCK_MAX_TOKENS", { infer: true }),
      temperature:
        request.temperature ?? this.configService.get("BEDROCK_TEMPERATURE", { infer: true }),
      topP: request.top_p ?? this.configService.get("BEDROCK_TOP_P", { infer: true }),
    };
  }

  private toBedrockMessages(messages: AiChatModelRequest["messages"]): Message[] {
    return messages.map((message) => ({
      content: [{ text: message.content }],
      role: message.role,
    }));
  }

  private toSystemPrompt(system: string): SystemContentBlock[] {
    return [{ text: system }];
  }

  private extractAssistantText(message: Message | undefined): string {
    return (message?.content ?? [])
      .map((block) => {
        if ("text" in block && typeof block.text === "string") {
          return block.text;
        }

        return "";
      })
      .join("")
      .trim();
  }
}
