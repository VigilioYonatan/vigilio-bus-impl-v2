import { createZodDto } from "nestjs-zod";
import {
  apiErrorResponseDto,
  apiValidationErrorResponseDto,
  apiValidationIssueDto,
} from "./api-error.response";

export class ApiValidationIssueDocDto extends createZodDto(apiValidationIssueDto) {}
export class ApiErrorResponseDocDto extends createZodDto(apiErrorResponseDto) {}
export class ApiValidationErrorResponseDocDto extends createZodDto(apiValidationErrorResponseDto) {}
