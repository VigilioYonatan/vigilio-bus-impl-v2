import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";
import { UserModule } from "@/user/user.module";
import { AUTH_SESSION_REPOSITORY } from "./application/repositories/auth-session.repository.token";
import { AuthTokenService } from "./application/security/auth-token.service";
import { GoogleIdTokenVerifier } from "./application/security/google-id-token.verifier";
import { AuthApplicationService } from "./application/service/auth.application-service";
import { AuthRefreshCookie } from "./infrastructure/http/auth-refresh-cookie";
import { AuthController } from "./infrastructure/http/controllers/auth.controller";
import { AuthSessionRepository } from "./infrastructure/persistence/drizzle/auth-session.repository";

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [AuthController],
  providers: [
    AuthApplicationService,
    AuthRefreshCookie,
    AuthTokenService,
    GoogleIdTokenVerifier,
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: AuthSessionRepository,
    },
  ],
  exports: [AuthTokenService],
})
export class AuthModule {}
