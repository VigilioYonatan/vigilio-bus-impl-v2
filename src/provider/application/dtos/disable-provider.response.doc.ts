import { createZodDto } from "nestjs-zod";
import { disableProviderResponseDto } from "./disable-provider.response.dto";

export class DisableProviderResponseDocDto extends createZodDto(disableProviderResponseDto) {}
