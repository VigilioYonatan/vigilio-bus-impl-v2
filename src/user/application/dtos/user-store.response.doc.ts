import { createZodDto } from "nestjs-zod";
import { userStoreResponseDto } from "./user-store.response.dto";

export class UserStoreResponseDocDto extends createZodDto(userStoreResponseDto) {}
