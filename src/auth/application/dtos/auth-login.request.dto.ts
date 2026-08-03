import { z } from "zod";
import { userSchema } from "@/user/application/schemas/user.schema";

export const authLoginRequestDto = z.object({
  email: userSchema.shape.email,
  password: z.string().min(1).max(128),
});

export type AuthLoginRequestDto = z.infer<typeof authLoginRequestDto>;
