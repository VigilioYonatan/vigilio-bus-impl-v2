/**
 * Estado de step-up/aprobacion de la ejecucion para operaciones sensibles.
 *
 * Q-010 (ANSWERED) exige step-up MFA para operaciones privilegiadas o de
 * seguridad, y `permission-matrix.md` clasifica la exportacion sensible de
 * auditoria como "elevated review/MFA". El mecanismo real (sesion de step-up,
 * aprobacion elevada) es propiedad de los packs `identity`/`security`, que aun
 * no estan materializados: este puerto solo consume un resultado ya verificado
 * y `null` significa "no verificable". La sesion normal nunca sustituye el
 * step-up.
 */
export type StepUpApprovalContext = {
  /** Step-up MFA verificado para esta ejecucion. */
  stepUpVerified: boolean;
  /** Aprobacion elevada otorgada para esta ejecucion. */
  approvalGranted: boolean;
};

/**
 * Puerto de resolucion del estado de step-up/aprobacion.
 *
 * El caso de uso evalua esta precondicion antes de mutar y falla cerrado con
 * `STEP_UP_OR_APPROVAL_REQUIRED` (403) cuando no puede verificarse.
 */
export interface StepUpApprovalContextResolver {
  resolve(): Promise<StepUpApprovalContext | null>;
}

/**
 * Regla canonica del resultado `STEP_UP_OR_APPROVAL_REQUIRED`: la operacion se
 * satisface con step-up MFA verificado **o** aprobacion elevada otorgada; sin
 * contexto verificable nunca se satisface.
 */
export function isStepUpApprovalSatisfied(context: StepUpApprovalContext | null): boolean {
  return context !== null && (context.stepUpVerified || context.approvalGranted);
}
