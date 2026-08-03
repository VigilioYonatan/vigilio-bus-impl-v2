import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/shared/infrastructure/database/database.module";
import { HealthApplicationService } from "./application/service/health.application-service";
import { HealthController } from "./infrastructure/http/controllers/health.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthApplicationService],
})
export class HealthModule {}
