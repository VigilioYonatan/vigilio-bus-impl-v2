import { z } from "zod";

export const apiValidationIssueDto = z.object({
  field: z.string().describe("Campo del request que fallo la validacion."),
  message: z.string().describe("Mensaje legible del error de validacion."),
});

export const apiErrorResponseDto = z.object({
  statusCode: z.number().int().min(400).max(599),
  message: z.string(),
  error: z.string().optional(),
});

export const apiValidationErrorResponseDto = apiErrorResponseDto.extend({
  errors: z.array(apiValidationIssueDto).optional(),
});

export type ApiValidationIssueDto = z.infer<typeof apiValidationIssueDto>;
export type ApiErrorResponseDto = z.infer<typeof apiErrorResponseDto>;
export type ApiValidationErrorResponseDto = z.infer<typeof apiValidationErrorResponseDto>;
