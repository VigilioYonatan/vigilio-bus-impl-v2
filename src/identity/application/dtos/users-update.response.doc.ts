import { createZodDto } from "nestjs-zod";
import { usersUpdateResponseDto } from "./users-update.response.dto";

export class UsersUpdateResponseDocDto extends createZodDto(usersUpdateResponseDto) {}
