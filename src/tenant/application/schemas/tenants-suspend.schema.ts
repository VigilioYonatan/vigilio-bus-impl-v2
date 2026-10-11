/**
 * Identificador canonico del resultado de negocio
 * `STEP_UP_OR_APPROVAL_REQUIRED` de `tenant.suspend-tenant`
 * (`business.md` §8, `endpoints.md` §5).
 *
 * Viaja como mensaje publico estable del 403 porque el envelope de error
 * actual (`apiErrorResponseDto`) no expone campo `code`: asi el cliente
 * distingue la precondicion de step-up/aprobacion de un `forbidden` generico
 * sin revelar detalles internos. Q-010: la sesion normal nunca sustituye el
 * step-up de una operacion clasificada privilegiada/sensible (suspender el
 * ciclo de vida de un tenant lo es).
 */
export const tenantsSuspendStepUpApprovalRequired = "STEP_UP_OR_APPROVAL_REQUIRED";
