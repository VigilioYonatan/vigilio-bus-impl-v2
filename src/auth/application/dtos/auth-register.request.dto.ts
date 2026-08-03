import type { z } from "zod";
import { userRegisterSchema } from "@/user/application/schemas/user.schema";

export const authRegisterRequestDto = userRegisterSchema;

export type AuthRegisterRequestDto = z.infer<typeof authRegisterRequestDto>;
