import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AiChatAskRequestDocDto } from "@/ai-chat/application/dtos/ai-chat-ask.request.doc";
import {
  type AiChatAskRequestDto,
  aiChatAskRequestDto,
} from "@/ai-chat/application/dtos/ai-chat-ask.request.dto";
import { AiChatAskResponseDocDto } from "@/ai-chat/application/dtos/ai-chat-ask.response.doc";
import type { AiChatAskResponseDto } from "@/ai-chat/application/dtos/ai-chat-ask.response.dto";
import { AiChatApplicationService } from "@/ai-chat/application/service/ai-chat.application-service";
import { ApiErrorResponseDocDto } from "@/shared/application/dtos/api-error.response.doc";
import {
  ApiAuthRequiredResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";

@ApiTags("ai-chat")
@ApiBearerAuth()
@ApiAuthRequiredResponse()
@ApiUnexpectedErrorResponse()
@Controller("ai-chat")
export class AiChatController {
  constructor(
    @Inject(AiChatApplicationService)
    private readonly service: AiChatApplicationService,
  ) {}

  @Post("messages")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enviar mensaje a chatbot IA con Amazon Bedrock" })
  @ApiBody({ type: AiChatAskRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiServiceUnavailableResponse({
    description: "Amazon Bedrock no disponible o BEDROCK_MODEL_ID no configurado.",
    type: ApiErrorResponseDocDto,
  })
  @ZodResponse({ status: 200, type: AiChatAskResponseDocDto })
  store(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodPipe(aiChatAskRequestDto)) body: AiChatAskRequestDto,
  ): Promise<AiChatAskResponseDto> {
    if (request.user === undefined) {
      throw new UnauthorizedException("Bearer token requerido, invalido o expirado.");
    }

    return this.service.ask(request.user.id, body);
  }
}
