import { createZodDto } from "nestjs-zod";
import { usersShowResponseDto } from "./users-show.response.dto";

export class UsersShowResponseDocDto extends createZodDto(usersShowResponseDto) {}
