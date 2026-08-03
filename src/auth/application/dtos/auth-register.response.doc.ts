import { createZodDto } from "nestjs-zod";
import { authRegisterResponseDto } from "./auth-register.response.dto";

export class AuthRegisterResponseDocDto extends createZodDto(authRegisterResponseDto) {}
