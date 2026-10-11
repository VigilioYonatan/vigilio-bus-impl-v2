import { Injectable } from "@nestjs/common";
import type {
  StepUpApprovalContext,
  StepUpApprovalContextResolver,
} from "@/audit/application/security/step-up-approval-context";

/**
 * Resolver HTTP del estado de step-up/aprobacion.
 *
 * Q-010 exige step-up MFA para operaciones sensibles y el mecanismo real
 * (sesion de step-up / aprobacion elevada) pertenece a los packs
 * `identity`/`security`, que aun no estan materializados (GAP registrado).
 * Mientras no exista una fuente verificable este resolver devuelve `null` y el
 * caso de uso falla cerrado con `STEP_UP_OR_APPROVAL_REQUIRED`: la sesion
 * normal nunca sustituye el step-up. Cuando el mecanismo exista, este adapter
 * es el unico punto que debe leerlo y proyectar el resultado verificado.
 */
@Injectable()
export class HttpStepUpApprovalContextResolver implements StepUpApprovalContextResolver {
  resolve(): Promise<StepUpApprovalContext | null> {
    return Promise.resolve(null);
  }
}
