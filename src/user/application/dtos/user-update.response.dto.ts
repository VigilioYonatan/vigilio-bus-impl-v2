import type { z } from "zod";
import { userShowResponseDto } from "./user-show.response.dto";

export const userUpdateResponseDto = userShowResponseDto;

export type UserUpdateResponseDto = z.infer<typeof userUpdateResponseDto>;
