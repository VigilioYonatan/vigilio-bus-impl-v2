import { z } from "zod";
import { userPublicSchema } from "@/user/application/schemas/user.schema";

export const authRegisterResponseDto = z.object({
  success: z.literal(true),
  token_type: z.literal("Bearer"),
  access_token: z.string(),
  expires_in: z.number().int().positive(),
  user: userPublicSchema,
});

export type AuthRegisterResponseDto = z.infer<typeof authRegisterResponseDto>;
