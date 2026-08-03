import type { z } from "zod";
import { userStoreSchema } from "../schemas/user.schema";

export const userStoreRequestDto = userStoreSchema;

export type UserStoreRequestDto = z.infer<typeof userStoreRequestDto>;
