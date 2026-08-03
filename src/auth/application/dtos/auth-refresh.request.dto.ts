import { z } from "zod";

export const authRefreshRequestDto = z.object({}).strict().default({});

export type AuthRefreshRequestDto = z.infer<typeof authRefreshRequestDto>;
