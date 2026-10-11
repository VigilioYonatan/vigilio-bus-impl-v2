import { createZodDto } from "nestjs-zod";
import { disableProviderRequestDto } from "./disable-provider.request.dto";

export class DisableProviderRequestDocDto extends createZodDto(disableProviderRequestDto) {}
