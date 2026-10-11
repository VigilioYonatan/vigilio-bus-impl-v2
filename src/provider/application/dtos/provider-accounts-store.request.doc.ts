import { createZodDto } from "nestjs-zod";
import { providerAccountsStoreRequestDto } from "./provider-accounts-store.request.dto";

export class ProviderAccountsStoreRequestDocDto extends createZodDto(
  providerAccountsStoreRequestDto,
) {}
