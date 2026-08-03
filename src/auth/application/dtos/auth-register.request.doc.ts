import { createZodDto } from "nestjs-zod";
import { authRegisterRequestDto } from "./auth-register.request.dto";

export class AuthRegisterRequestDocDto extends createZodDto(authRegisterRequestDto) {}
