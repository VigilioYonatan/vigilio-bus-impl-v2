import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AiChatAskRequestDto } from "../dtos/ai-chat-ask.request.dto";
import type { AiChatAskResponseDto } from "../dtos/ai-chat-ask.response.dto";
import type {
  AiChatModelRequest,
  IAiChatModelProvider,
} from "../providers/ai-chat-model.provider.interface";
import { AI_CHAT_MODEL_PROVIDER } from "../providers/ai-chat-model.provider.token";

@Injectable()
export class AiChatApplicationService {
  private readonly logger = new Logger(AiChatApplicationService.name);

  constructor(
    @Inject(AI_CHAT_MODEL_PROVIDER)
    private readonly modelProvider: IAiChatModelProvider,
  ) {}

  async ask(user_id: number, body: AiChatAskRequestDto): Promise<AiChatAskResponseDto> {
    const conversation_id = body.conversation_id ?? randomUUID();
    this.logger.log({ action: "ai_chat.ask", conversation_id, user_id }, "Asking AI chat model");

    const modelRequest: AiChatModelRequest = {
      conversation_id,
      messages: body.messages,
      user_id,
      ...(body.max_tokens !== undefined ? { max_tokens: body.max_tokens } : {}),
      ...(body.system !== undefined ? { system: body.system } : {}),
      ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
      ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    };

    const response = await this.modelProvider.converse(modelRequest);

    return {
      success: true,
      answer: response.answer,
      conversation_id,
      message: {
        content: response.answer,
        role: "assistant",
      },
      provider: response.provider,
      usage: response.usage,
    };
  }
}
