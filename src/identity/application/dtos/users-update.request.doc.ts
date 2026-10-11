import { createZodDto } from "nestjs-zod";
import { usersUpdateRequestDto } from "./users-update.request.dto";

export class UsersUpdateRequestDocDto extends createZodDto(usersUpdateRequestDto) {}
