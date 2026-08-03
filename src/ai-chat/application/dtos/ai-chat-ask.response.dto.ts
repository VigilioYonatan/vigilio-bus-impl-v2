import { z } from "zod";
import {
  aiChatMessageSchema,
  aiChatProviderMetadataSchema,
  aiChatUsageSchema,
} from "../schemas/ai-chat.schema";

export const aiChatAskResponseDto = z.object({
  success: z.literal(true),
  conversation_id: z.string(),
  answer: z.string(),
  message: aiChatMessageSchema,
  usage: aiChatUsageSchema,
  provider: aiChatProviderMetadataSchema,
});

export type AiChatAskResponseDto = z.infer<typeof aiChatAskResponseDto>;
