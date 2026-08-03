import type { z } from "zod";
import { aiChatAskSchema } from "../schemas/ai-chat.schema";

export const aiChatAskRequestDto = aiChatAskSchema;

export type AiChatAskRequestDto = z.infer<typeof aiChatAskRequestDto>;
