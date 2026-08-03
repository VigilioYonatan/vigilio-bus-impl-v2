import { createZodDto } from "nestjs-zod";
import { authGoogleRequestDto } from "./auth-google.request.dto";

export class AuthGoogleRequestDocDto extends createZodDto(authGoogleRequestDto) {}
