import { createZodDto } from "nestjs-zod";
import { userDestroyResponseDto } from "./user-destroy.response.dto";

export class UserDestroyResponseDocDto extends createZodDto(userDestroyResponseDto) {}
