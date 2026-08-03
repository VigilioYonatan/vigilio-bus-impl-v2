import { createZodDto } from "nestjs-zod";
import { authRefreshResponseDto } from "./auth-refresh.response.dto";

export class AuthRefreshResponseDocDto extends createZodDto(authRefreshResponseDto) {}
