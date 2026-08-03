import type {
  AiChatModelRequest,
  IAiChatModelProvider,
} from "@/ai-chat/application/providers/ai-chat-model.provider.interface";
import { AiChatApplicationService } from "@/ai-chat/application/service/ai-chat.application-service";

describe("AiChatApplicationService", () => {
  it("envia el historial validado al proveedor IA y retorna response DTO", async () => {
    const provider: IAiChatModelProvider = {
      converse: vi.fn(async () => ({
        answer: "Puedes usar S3 con lifecycle policies para ahorrar costos.",
        provider: {
          latency_ms: 120,
          model_id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          stop_reason: "end_turn",
        },
        usage: {
          input_tokens: 18,
          output_tokens: 24,
          total_tokens: 42,
        },
      })),
    };
    const service = new AiChatApplicationService(provider);

    const response = await service.ask(10, {
      conversation_id: "conv-aws-costos",
      max_tokens: 512,
      messages: [{ content: "Como ahorro dinero en S3?", role: "user" }],
      system: "Responde como arquitecto AWS senior.",
      temperature: 0.2,
      top_p: 0.9,
    });

    expect(response).toEqual({
      answer: "Puedes usar S3 con lifecycle policies para ahorrar costos.",
      conversation_id: "conv-aws-costos",
      message: {
        content: "Puedes usar S3 con lifecycle policies para ahorrar costos.",
        role: "assistant",
      },
      provider: {
        latency_ms: 120,
        model_id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        stop_reason: "end_turn",
      },
      success: true,
      usage: {
        input_tokens: 18,
        output_tokens: 24,
        total_tokens: 42,
      },
    });
    expect(provider.converse).toHaveBeenCalledWith({
      conversation_id: "conv-aws-costos",
      max_tokens: 512,
      messages: [{ content: "Como ahorro dinero en S3?", role: "user" }],
      system: "Responde como arquitecto AWS senior.",
      temperature: 0.2,
      top_p: 0.9,
      user_id: 10,
    } satisfies AiChatModelRequest);
  });

  it("crea conversation_id cuando el frontend no lo envia", async () => {
    const provider: IAiChatModelProvider = {
      converse: vi.fn(async () => ({
        answer: "Hola, soy tu asistente.",
        provider: {
          latency_ms: null,
          model_id: "amazon.nova-pro-v1:0",
          stop_reason: null,
        },
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          total_tokens: 2,
        },
      })),
    };
    const service = new AiChatApplicationService(provider);

    const response = await service.ask(20, {
      messages: [{ content: "Hola", role: "user" }],
    });

    expect(response.conversation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(provider.converse).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: response.conversation_id,
        messages: [{ content: "Hola", role: "user" }],
        user_id: 20,
      }),
    );
  });
});
