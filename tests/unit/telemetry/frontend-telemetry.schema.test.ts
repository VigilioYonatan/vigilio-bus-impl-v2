import {
  frontendHttpOperationTelemetrySchema,
  frontendRuntimeErrorTelemetrySchema,
  frontendTelemetrySchema,
} from "@/telemetry/application/schemas/frontend-telemetry.schema";

const base = {
  correlation_id: "web:request-1",
  event_id: "123e4567-e89b-12d3-a456-426614174000",
  occurred_at: "2026-07-28T12:00:00.000Z",
  release: "local-dev",
  route: "/backoffice/products",
  schema_version: 1,
  stage: "development" as const,
};

describe("frontend telemetry schemas", () => {
  it("accepts all supported signal variants", () => {
    expect(
      frontendTelemetrySchema.parse({
        ...base,
        event_type: "web_vital",
        name: "LCP",
        rating: "good",
        value: 1200,
      }),
    ).toMatchObject({ event_type: "web_vital" });

    expect(
      frontendRuntimeErrorTelemetrySchema.parse({
        ...base,
        error_class: "unhandled_error",
        event_type: "runtime_error",
        message: "Cannot read property",
      }).event_type,
    ).toBe("runtime_error");

    expect(
      frontendHttpOperationTelemetrySchema.parse({
        ...base,
        duration_ms: 80,
        event_type: "http_operation",
        method: "GET",
        status_code: 200,
      }).status_code,
    ).toBe(200);
  });

  it("rejects raw query routes, unsupported fields and unbounded values", () => {
    expect(() =>
      frontendTelemetrySchema.parse({
        ...base,
        event_type: "web_vital",
        name: "LCP",
        rating: "good",
        value: 1200,
        refresh_token: "must-not-cross-boundary",
      }),
    ).toThrow();

    expect(() =>
      frontendTelemetrySchema.parse({
        ...base,
        event_type: "web_vital",
        name: "LCP",
        rating: "good",
        route: "/products?email=user@example.com",
        value: 1200,
      }),
    ).toThrow();

    expect(() =>
      frontendTelemetrySchema.parse({
        ...base,
        event_type: "http_operation",
        method: "GET",
        status_code: 200,
        duration_ms: 120_001,
      }),
    ).toThrow();
  });
});
