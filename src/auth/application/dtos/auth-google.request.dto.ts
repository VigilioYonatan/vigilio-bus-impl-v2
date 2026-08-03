import { z } from "zod";

export const authGoogleRequestDto = z.object({
  id_token: z.string().min(20),
});

export type AuthGoogleRequestDto = z.infer<typeof authGoogleRequestDto>;
