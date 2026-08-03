import { Module } from "@nestjs/common";
import { AI_CHAT_MODEL_PROVIDER } from "./application/providers/ai-chat-model.provider.token";
import { AiChatApplicationService } from "./application/service/ai-chat.application-service";
import { BedrockAiChatModelProvider } from "./infrastructure/bedrock/bedrock-ai-chat-model.provider";
import { AiChatController } from "./infrastructure/http/controllers/ai-chat.controller";

@Module({
  controllers: [AiChatController],
  providers: [
    AiChatApplicationService,
    {
      provide: AI_CHAT_MODEL_PROVIDER,
      useClass: BedrockAiChatModelProvider,
    },
  ],
})
export class AiChatModule {}
