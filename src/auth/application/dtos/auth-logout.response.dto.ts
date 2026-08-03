import { z } from "zod";

export const authLogoutResponseDto = z.object({
  success: z.literal(true),
  revoked_sessions: z.number().int().nonnegative(),
});

export type AuthLogoutResponseDto = z.infer<typeof authLogoutResponseDto>;
