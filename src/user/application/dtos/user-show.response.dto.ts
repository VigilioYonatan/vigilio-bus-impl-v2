import { z } from "zod";
import { userPublicSchema } from "../schemas/user.schema";

export const userShowResponseDto = z.object({
  success: z.literal(true),
  user: userPublicSchema,
});

export type UserShowResponseDto = z.infer<typeof userShowResponseDto>;
