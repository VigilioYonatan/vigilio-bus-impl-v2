import { Injectable, Logger } from "@nestjs/common";
import type { FrontendTelemetryIngestRequestDto } from "../dtos/frontend-telemetry-ingest.request.dto";
import type { FrontendTelemetryIngestResponseDto } from "../dtos/frontend-telemetry-ingest.response.dto";

const SENSITIVE_TEXT = [
  /bearer\s+[a-z0-9._~+/-]+=*/gi,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  /(?:access|refresh|id)[_-]?token\s*[:=]\s*[^\s,;]+/gi,
  /\beyJ[a-z0-9_-]+\.[a-z0-9._-]+\.[a-z0-9._-]+\b/gi,
  /https?:\/\/[^\s]+/gi,
  /\b\d{7,}\b/g,
];

export type FrontendTelemetryContext = {
  request_correlation_id: string;
};

@Injectable()
export class FrontendTelemetryApplicationService {
  private readonly logger = new Logger(FrontendTelemetryApplicationService.name);

  ingest(
    input: FrontendTelemetryIngestRequestDto,
    context: FrontendTelemetryContext,
  ): FrontendTelemetryIngestResponseDto {
    const signal =
      input.event_type === "runtime_error"
        ? { ...input, message: redactSensitiveText(input.message) }
        : input;

    this.logger.log(
      {
        action: "frontend.telemetry.received",
        request_correlation_id: context.request_correlation_id,
        signal,
      },
      "Frontend operational telemetry received",
    );

    return { accepted: true, success: true };
  }
}

export function redactSensitiveText(value: string): string {
  return SENSITIVE_TEXT.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  ).slice(0, 240);
}
