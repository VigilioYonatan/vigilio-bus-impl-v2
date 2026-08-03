import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "./public.decorator";

/**
 * Fuerza autenticacion en un handler que pertenece a un controller marcado
 * `@Public()`.
 *
 * `JwtAuthGuard` resuelve la metadata con `getAllAndOverride([handler, class])`,
 * asi que el valor del handler gana sobre el de la clase.
 */
export const Protected = () => SetMetadata(IS_PUBLIC_KEY, false);
