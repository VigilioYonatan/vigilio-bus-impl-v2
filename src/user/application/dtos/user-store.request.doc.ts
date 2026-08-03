import { createZodDto } from "nestjs-zod";
import { userStoreRequestDto } from "./user-store.request.dto";

export class UserStoreRequestDocDto extends createZodDto(userStoreRequestDto) {}
