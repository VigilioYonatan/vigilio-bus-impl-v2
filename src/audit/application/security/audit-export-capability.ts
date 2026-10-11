import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad `audit:export:audit`.
 *
 * La exportacion auditable es una operacion sensible: `permission-matrix.md`
 * clasifica la exportacion de auditoria como "sensitive audit export require
 * elevated review/MFA". El transporte la exige con `@Roles("admin", "auditor")`
 * (usabilidad, no autorizacion) y esta capa revalida deny-by-default antes de
 * cualquier mutacion. Un identificador de tenant inyectado en el request jamas
 * eleva el alcance.
 */
export const AUDIT_EXPORT_ROLES: readonly AuthenticatedUser["role"][] = ["admin", "auditor"];

export type AuditExportActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso: sin actor autenticado o con un
 * rol fuera de la capacidad, el llamador responde 403 sin revelar existencia
 * ni contenido alguno.
 */
export function canRequestAuditExport(actor: AuditExportActor | null): boolean {
  return actor !== null && AUDIT_EXPORT_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toAuditExportActor(user: AuthenticatedUser | undefined): AuditExportActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
