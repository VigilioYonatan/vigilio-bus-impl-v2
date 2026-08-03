import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  ApiErrorResponseDocDto,
  ApiValidationErrorResponseDocDto,
} from "@/shared/application/dtos/api-error.response.doc";

export function ApiValidationErrorResponse() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: "Request invalido: body, query o params no cumplen el contrato.",
      type: ApiValidationErrorResponseDocDto,
    }),
  );
}

export function ApiAuthRequiredResponse() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: "Bearer token requerido, invalido o expirado.",
      type: ApiErrorResponseDocDto,
    }),
  );
}

export function ApiForbiddenBusinessResponse() {
  return applyDecorators(
    ApiForbiddenResponse({
      description: "El usuario autenticado no tiene el rol requerido.",
      type: ApiErrorResponseDocDto,
    }),
  );
}

export function ApiUnauthorizedBusinessResponse(description: string) {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description,
      type: ApiErrorResponseDocDto,
    }),
  );
}

export function ApiResourceNotFoundResponse(resource: string) {
  return applyDecorators(
    ApiNotFoundResponse({
      description: `${resource} no encontrado.`,
      type: ApiErrorResponseDocDto,
    }),
  );
}

export function ApiConflictBusinessResponse(description: string) {
  return applyDecorators(
    ApiConflictResponse({
      description,
      type: ApiErrorResponseDocDto,
    }),
  );
}

export function ApiUnexpectedErrorResponse() {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      description: "Error inesperado del servidor.",
      type: ApiErrorResponseDocDto,
    }),
  );
}
