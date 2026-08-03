import { z } from "zod";
import { userPublicSchema } from "@/user/application/schemas/user.schema";

export const authGoogleResponseDto = z.object({
  success: z.literal(true),
  token_type: z.literal("Bearer"),
  access_token: z.string(),
  expires_in: z.number().int().positive(),
  user: userPublicSchema,
});

export type AuthGoogleResponseDto = z.infer<typeof authGoogleResponseDto>;
