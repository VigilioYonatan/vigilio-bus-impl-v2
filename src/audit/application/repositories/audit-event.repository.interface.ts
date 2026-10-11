import type { AuditIndexQueryDto } from "../dtos/audit-index.request.dto";
import type { AuditIndexResponseDto } from "../dtos/audit-index.response.dto";
import type { AuditShowResponseDto } from "../dtos/audit-show.response.dto";
import type { TrustedTenantContext } from "../security/trusted-tenant-context";

/**
 * Puerto de lectura de eventos de auditoria.
 *
 * Solo expone las operaciones que los casos de uso necesitan: proyecciones
 * purpose-specific con predicado de tenant obligatorio y orden determinista.
 * No existe una API generica de "consultar cualquier cosa" que permita saltarse
 * invariantes del modelo, y este agregado no acepta escrituras.
 */
export interface IAuditEventRepository {
  index(query: AuditIndexQueryDto, scope: TrustedTenantContext): Promise<AuditIndexResponseDto>;
  show(
    auditEventId: string,
    scope: TrustedTenantContext,
  ): Promise<AuditShowResponseDto["result"] | null>;
}
