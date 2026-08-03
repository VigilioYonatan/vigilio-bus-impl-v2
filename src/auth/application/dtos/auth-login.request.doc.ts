import { createZodDto } from "nestjs-zod";
import { authLoginRequestDto } from "./auth-login.request.dto";

export class AuthLoginRequestDocDto extends createZodDto(authLoginRequestDto) {}
