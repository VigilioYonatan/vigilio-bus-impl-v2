import { createZodDto } from "nestjs-zod";
import { userUpdateResponseDto } from "./user-update.response.dto";

export class UserUpdateResponseDocDto extends createZodDto(userUpdateResponseDto) {}
