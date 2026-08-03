import { Logger } from "@nestjs/common";
import type { FrontendTelemetryIngestRequestDto } from "@/telemetry/application/dtos/frontend-telemetry-ingest.request.dto";
import {
  FrontendTelemetryApplicationService,
  redactSensitiveText,
} from "@/telemetry/application/service/frontend-telemetry.application-service";

const event: FrontendTelemetryIngestRequestDto = {
  correlation_id: "web:request-1",
  event_id: "123e4567-e89b-12d3-a456-426614174000",
  occurred_at: "2026-07-28T12:00:00.000Z",
  error_class: "unhandled_error",
  event_type: "runtime_error",
  message: "request bearer eyJheader.payload.signature email=user@example.com",
  release: "local-dev",
  route: "/backoffice/products",
  schema_version: 1,
  stage: "development",
};

describe("FrontendTelemetryApplicationService", () => {
  it("redacts secrets, URLs and PII before structured logging", () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const service = new FrontendTelemetryApplicationService();

    expect(service.ingest(event, { request_correlation_id: "server:request-1" })).toEqual({
      accepted: true,
      success: true,
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "frontend.telemetry.received",
        request_correlation_id: "server:request-1",
        signal: expect.objectContaining({ message: expect.not.stringContaining("example.com") }),
      }),
      "Frontend operational telemetry received",
    );

    log.mockRestore();
  });

  it("redacts sensitive text deterministically and bounds the result", () => {
    const redacted = redactSensitiveText(
      "Bearer eyJheader.payload.signature user@example.com https://example.test/a 123456789",
    );

    expect(redacted).not.toContain("eyJheader");
    expect(redacted).not.toContain("user@example.com");
    expect(redacted).not.toContain("https://example.test");
    expect(redacted).not.toContain("123456789");
    expect(redacted.length).toBeLessThanOrEqual(240);
  });
});
