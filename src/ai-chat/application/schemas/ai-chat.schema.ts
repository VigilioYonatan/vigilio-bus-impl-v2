import { z } from "zod";

export const aiChatRoleSchema = z.enum(["user", "assistant"]);

export const aiChatMessageSchema = z.object({
  role: aiChatRoleSchema,
  content: z.string().trim().min(1).max(4_000),
});

export const aiChatAskSchema = z.object({
  conversation_id: z.string().trim().min(1).max(120).optional(),
  system: z.string().trim().min(1).max(2_000).optional(),
  messages: z.array(aiChatMessageSchema).min(1).max(20),
  max_tokens: z.number().int().positive().max(2_048).optional(),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
});

export const aiChatUsageSchema = z.object({
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
});

export const aiChatProviderMetadataSchema = z.object({
  model_id: z.string(),
  stop_reason: z.string().nullable(),
  latency_ms: z.number().int().min(0).nullable(),
});

export type AiChatRoleSchema = z.infer<typeof aiChatRoleSchema>;
export type AiChatMessageSchema = z.infer<typeof aiChatMessageSchema>;
export type AiChatAskSchema = z.infer<typeof aiChatAskSchema>;
export type AiChatUsageSchema = z.infer<typeof aiChatUsageSchema>;
export type AiChatProviderMetadataSchema = z.infer<typeof aiChatProviderMetadataSchema>;
