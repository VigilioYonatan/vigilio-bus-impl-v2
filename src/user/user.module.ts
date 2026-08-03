import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";
import { USER_REPOSITORY } from "./application/repositories/user.repository.token";
import { PasswordHasher } from "./application/service/password-hasher";
import { UserApplicationService } from "./application/service/user.application-service";
import { UserController } from "./infrastructure/http/controllers/user.controller";
import { UserRepository } from "./infrastructure/persistence/drizzle/user.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [
    PasswordHasher,
    UserApplicationService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [PasswordHasher, UserApplicationService, USER_REPOSITORY],
})
export class UserModule {}
