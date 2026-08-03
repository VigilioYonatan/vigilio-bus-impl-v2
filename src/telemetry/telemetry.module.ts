import { Module } from "@nestjs/common";
import { FrontendTelemetryApplicationService } from "./application/service/frontend-telemetry.application-service";
import { FrontendTelemetryController } from "./infrastructure/http/controllers/frontend-telemetry.controller";

@Module({
  controllers: [FrontendTelemetryController],
  providers: [FrontendTelemetryApplicationService],
})
export class TelemetryModule {}
