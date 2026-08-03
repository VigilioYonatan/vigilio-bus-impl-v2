import type { z } from "zod";
import { userShowParamsDto } from "./user-show.request.dto";

export const userDestroyParamsDto = userShowParamsDto;

export type UserDestroyParamsDto = z.infer<typeof userDestroyParamsDto>;
