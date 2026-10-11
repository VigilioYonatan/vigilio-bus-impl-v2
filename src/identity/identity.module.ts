import { Module } from "@nestjs/common";
import { IDENTITY_USER_REPOSITORY } from "@/identity/application/repositories/identity-user.repository.token";
import { TRUSTED_TENANT_CONTEXT_RESOLVER } from "@/identity/application/security/trusted-tenant-context.token";
import { IdentityApplicationService } from "@/identity/application/service/identity.application-service";
import { UsersController } from "@/identity/infrastructure/http/controllers/users.controller";
import { HttpTrustedTenantContextResolver } from "@/identity/infrastructure/http/trusted-tenant-context.resolver";
import { IdentityUserRepository } from "@/identity/infrastructure/persistence/drizzle/identity-user.repository";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";

/**
 * Modulo `identity` (slices `users-store`, `users-show` y `users-update`).
 *
 * Wiring del controller/providers/tokens. El modulo NO se registra en
 * `src/app.module.ts` (fuera de `allowed_paths`): las rutas `/users`,
 * `GET /users/{userId}` y `PATCH /users/{userId}` colisionan con la familia
 * legacy `UserModule` y ese registro requiere la confirmacion de D1 + la
 * migracion (S2/S1). El append de auditoria de los casos de uso de mutacion
 * (S6) no tiene binding porque la interfaz publica no existe; no se escriben
 * tablas ajenas. La edicion `users-update` no agrega providers: el
 * service/controller/repository extendidos ya estan cableados y el slice
 * permanece sin activacion (D3 y la dependencia `identity.users-store`
 * siguen abiertos).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    IdentityApplicationService,
    {
      provide: IDENTITY_USER_REPOSITORY,
      useClass: IdentityUserRepository,
    },
    {
      provide: TRUSTED_TENANT_CONTEXT_RESOLVER,
      useClass: HttpTrustedTenantContextResolver,
    },
  ],
})
export class IdentityModule {}
