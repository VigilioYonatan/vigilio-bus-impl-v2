import type { z } from "zod";
import { userUpdateSchema } from "../schemas/user.schema";
import { userShowParamsDto } from "./user-show.request.dto";

export const userUpdateParamsDto = userShowParamsDto;

export const userUpdateRequestDto = userUpdateSchema;

export type UserUpdateParamsDto = z.infer<typeof userUpdateParamsDto>;
export type UserUpdateRequestDto = z.infer<typeof userUpdateRequestDto>;
