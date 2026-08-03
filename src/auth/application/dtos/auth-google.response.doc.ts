import { createZodDto } from "nestjs-zod";
import { authGoogleResponseDto } from "./auth-google.response.dto";

export class AuthGoogleResponseDocDto extends createZodDto(authGoogleResponseDto) {}
