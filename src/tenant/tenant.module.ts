import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";
import { TENANT_REPOSITORY } from "@/tenant/application/repositories/tenant.repository.token";
import { TENANT_STEP_UP_APPROVAL_CONTEXT_RESOLVER } from "@/tenant/application/security/step-up-approval-context.token";
import { TenantApplicationService } from "@/tenant/application/service/tenant.application-service";
import { TenantsController } from "@/tenant/infrastructure/http/controllers/tenants.controller";
import { HttpTenantsStepUpApprovalContextResolver } from "@/tenant/infrastructure/http/step-up-approval-context.resolver";
import { TenantRepository } from "@/tenant/infrastructure/persistence/drizzle/tenant.repository";

/**
 * Wiring del contexto `tenant`.
 *
 * El resolver de step-up/aprobacion es fail-closed hasta que los packs
 * `identity`/`security` materialicen el mecanismo verificado (GAP-10): la
 * sesion normal nunca satisface una operacion privilegiada.
 *
 * GAP bloqueante (S6/S7, autorizacion humana pendiente): el write set canonico
 * de `suspend-tenant` (evidencia append-only + outbox row) y de
 * `tenants-update` (evidencia append-only) debe escribirse en la misma
 * transaccion a traves de superficies publicas del modulo `audit` (hoy solo
 * expone lectura) y del publisher/outbox compartido (ADR-003 prohibe publicar
 * directamente). Esas superficies viven fuera de `allowed_paths`: no se agregan
 * bindings que escriban tablas ajenas ni se simula evidencia. Las operaciones
 * no deben activarse en runtime hasta que existan.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [TenantsController],
  providers: [
    TenantApplicationService,
    {
      provide: TENANT_REPOSITORY,
      useClass: TenantRepository,
    },
    {
      provide: TENANT_STEP_UP_APPROVAL_CONTEXT_RESOLVER,
      useClass: HttpTenantsStepUpApprovalContextResolver,
    },
  ],
})
export class TenantModule {}
