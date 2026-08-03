import { createZodDto } from "nestjs-zod";
import { aiChatAskResponseDto } from "./ai-chat-ask.response.dto";

export class AiChatAskResponseDocDto extends createZodDto(aiChatAskResponseDto) {}
