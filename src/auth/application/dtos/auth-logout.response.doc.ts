import { createZodDto } from "nestjs-zod";
import { authLogoutResponseDto } from "./auth-logout.response.dto";

export class AuthLogoutResponseDocDto extends createZodDto(authLogoutResponseDto) {}
