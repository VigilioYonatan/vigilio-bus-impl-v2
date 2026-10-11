import { createZodDto } from "nestjs-zod";
import { providersStoreRequestDto } from "./providers-store.request.dto";

export class ProvidersStoreRequestDocDto extends createZodDto(providersStoreRequestDto) {}
