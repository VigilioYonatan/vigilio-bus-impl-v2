import { createZodDto } from "nestjs-zod";
import { aiChatAskRequestDto } from "./ai-chat-ask.request.dto";

export class AiChatAskRequestDocDto extends createZodDto(aiChatAskRequestDto) {}
