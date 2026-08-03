import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "@/shared/infrastructure/security/public.decorator";
import { metricsRegistry } from "./metrics";

@Public()
@Controller()
export class MetricsController {
  @Get("metrics")
  @Header("Content-Type", metricsRegistry.contentType)
  metrics(): Promise<string> {
    return metricsRegistry.metrics();
  }
}
