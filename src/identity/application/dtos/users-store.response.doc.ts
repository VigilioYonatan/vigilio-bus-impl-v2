import { createZodDto } from "nestjs-zod";
import { usersStoreResponseDto } from "./users-store.response.dto";

export class UsersStoreResponseDocDto extends createZodDto(usersStoreResponseDto) {}
