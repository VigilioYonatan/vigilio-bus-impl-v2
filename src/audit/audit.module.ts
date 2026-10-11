import { Module } from "@nestjs/common";
import { AUDIT_EVENT_REPOSITORY } from "@/audit/application/repositories/audit-event.repository.token";
import { AUDIT_EXPORT_REPOSITORY } from "@/audit/application/repositories/audit-export.repository.token";
import { STEP_UP_APPROVAL_CONTEXT_RESOLVER } from "@/audit/application/security/step-up-approval-context.token";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/audit/application/security/trusted-tenant-context.token";
import { AuditEventApplicationService } from "@/audit/application/service/audit-event.application-service";
import { AuditExportApplicationService } from "@/audit/application/service/audit-export.application-service";
import { AuditEventsController } from "@/audit/infrastructure/http/controllers/audit-events.controller";
import { AuditExportsController } from "@/audit/infrastructure/http/controllers/audit-exports.controller";
import { HttpStepUpApprovalContextResolver } from "@/audit/infrastructure/http/step-up-approval-context.resolver";
import { HttpTrustedTenantContextResolver } from "@/audit/infrastructure/http/trusted-tenant-context.resolver";
import { AuditEventRepository } from "@/audit/infrastructure/persistence/drizzle/audit-event.repository";
import { AuditExportRepository } from "@/audit/infrastructure/persistence/drizzle/audit-export.repository";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AuditEventsController, AuditExportsController],
  providers: [
    AuditEventApplicationService,
    AuditExportApplicationService,
    {
      provide: AUDIT_EVENT_REPOSITORY,
      useClass: AuditEventRepository,
    },
    {
      provide: AUDIT_EXPORT_REPOSITORY,
      useClass: AuditExportRepository,
    },
    {
      provide: STEP_UP_APPROVAL_CONTEXT_RESOLVER,
      useClass: HttpStepUpApprovalContextResolver,
    },
    {
      provide: TRUSTED_TENANT_CONTEXT_RESOLVER,
      useClass: HttpTrustedTenantContextResolver,
    },
  ],
})
export class AuditModule {}
