import type { z } from "zod";
import { createPaginatorSchema } from "@/shared/application/schemas/paginator.schema";
import { userPublicSchema } from "../schemas/user.schema";

export const userIndexResponseDto = createPaginatorSchema(userPublicSchema);

export type UserIndexResponseDto = z.infer<typeof userIndexResponseDto>;
