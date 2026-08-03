import { createZodDto } from "nestjs-zod";
import { authLoginResponseDto } from "./auth-login.response.dto";

export class AuthLoginResponseDocDto extends createZodDto(authLoginResponseDto) {}
