import type { z } from "zod";
import { userShowResponseDto } from "./user-show.response.dto";

export const userStoreResponseDto = userShowResponseDto;

export type UserStoreResponseDto = z.infer<typeof userStoreResponseDto>;
