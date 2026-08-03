import { createZodDto } from "nestjs-zod";
import { userUpdateRequestDto } from "./user-update.request.dto";

export class UserUpdateRequestDocDto extends createZodDto(userUpdateRequestDto) {}
