import { createZodDto } from "nestjs-zod";
import { usersShowParamsDto } from "./users-show.request.dto";

export class UsersShowParamsDocDto extends createZodDto(usersShowParamsDto) {}
