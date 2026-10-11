import { createZodDto } from "nestjs-zod";
import { usersStoreRequestDto } from "./users-store.request.dto";

export class UsersStoreRequestDocDto extends createZodDto(usersStoreRequestDto) {}
