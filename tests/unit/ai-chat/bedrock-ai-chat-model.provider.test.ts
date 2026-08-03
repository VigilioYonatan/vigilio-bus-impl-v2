import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AiChatModelRequest } from "@/ai-chat/application/providers/ai-chat-model.provider.interface";
import { BedrockAiChatModelProvider } from "@/ai-chat/infrastructure/bedrock/bedrock-ai-chat-model.provider";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

function config(values: Record<string, number | string | undefined>) {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

function request(): AiChatModelRequest {
  return {
    conversation_id: "conversation-1",
    max_tokens: 256,
    messages: [{ content: "Hola Bedrock", role: "user" }],
    system: "Responde breve",
    temperature: 0.1,
    top_p: 0.8,
    user_id: 10,
  };
}

describe("BedrockAiChatModelProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falla cerrado cuando BEDROCK_MODEL_ID no esta configurado", async () => {
    const provider = new BedrockAiChatModelProvider(config({ AWS_REGION: "us-east-1" }));

    await expect(provider.converse(request())).rejects.toThrow(
      "BEDROCK_MODEL_ID no esta configurado",
    );
  });

  it("mapea request y response de Converse", async () => {
    const send = vi.spyOn(BedrockRuntimeClient.prototype, "send").mockResolvedValue({
      metrics: { latencyMs: 75 },
      output: { message: { content: [{ text: " Respuesta segura " }], role: "assistant" } },
      stopReason: "end_turn",
      usage: { inputTokens: 5, outputTokens: 7, totalTokens: 12 },
    } as never);
    const provider = new BedrockAiChatModelProvider(
      config({
        AWS_REGION: "us-east-1",
        BEDROCK_MODEL_ID: "amazon.nova-pro-v1:0",
      }),
    );

    await expect(provider.converse(request())).resolves.toEqual({
      answer: "Respuesta segura",
      provider: {
        latency_ms: 75,
        model_id: "amazon.nova-pro-v1:0",
        stop_reason: "end_turn",
      },
      usage: { input_tokens: 5, output_tokens: 7, total_tokens: 12 },
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it("normaliza respuestas vacias y errores AWS", async () => {
    const provider = new BedrockAiChatModelProvider(
      config({ AWS_REGION: "us-east-1", BEDROCK_MODEL_ID: "amazon.nova-pro-v1:0" }),
    );
    vi.spyOn(BedrockRuntimeClient.prototype, "send").mockResolvedValueOnce({
      output: { message: { content: [], role: "assistant" } },
    } as never);

    await expect(provider.converse(request())).rejects.toBeInstanceOf(ServiceUnavailableException);

    vi.spyOn(BedrockRuntimeClient.prototype, "send").mockRejectedValueOnce(new Error("throttled"));
    await expect(provider.converse(request())).rejects.toThrow("No se pudo invocar Amazon Bedrock");
  });
});
