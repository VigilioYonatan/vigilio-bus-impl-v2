import { createZodDto } from "nestjs-zod";
import { userIndexResponseDto } from "./user-index.response.dto";

export class UserIndexResponseDocDto extends createZodDto(userIndexResponseDto) {}
