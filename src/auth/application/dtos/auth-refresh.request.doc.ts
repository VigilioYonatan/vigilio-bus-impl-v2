import { createZodDto } from "nestjs-zod";
import { authRefreshRequestDto } from "./auth-refresh.request.dto";

export class AuthRefreshRequestDocDto extends createZodDto(authRefreshRequestDto) {}
