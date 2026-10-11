import { createZodDto } from "nestjs-zod";
import { providerAccountsStoreResponseDto } from "./provider-accounts-store.response.dto";

export class ProviderAccountsStoreResponseDocDto extends createZodDto(
  providerAccountsStoreResponseDto,
) {}
