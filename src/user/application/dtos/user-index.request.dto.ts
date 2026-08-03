import type { z } from "zod";
import { querySchema } from "@/shared/application/schemas/query.schema";
import { userIndexFilterSchema } from "../schemas/user.schema";

export const userIndexQueryDto = userIndexFilterSchema.partial().extend(querySchema.shape);

export type UserIndexQueryDto = z.infer<typeof userIndexQueryDto>;
