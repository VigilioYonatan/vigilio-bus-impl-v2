import { expect, test } from "@playwright/test";

const base = {
  correlation_id: "web:request-1",
  event_id: "123e4567-e89b-12d3-a456-426614174000",
  occurred_at: "2026-07-28T12:00:00.000Z",
  release: "local-dev",
  route: "/backoffice/products",
  schema_version: 1,
  stage: "development",
};

test.describe("frontend telemetry collector", () => {
  test("accepts every bounded public signal and propagates correlation @contract @smoke", async ({
    request,
  }) => {
    for (const signal of [
      {
        ...base,
        event_type: "web_vital",
        name: "LCP",
        rating: "good",
        value: 1200,
      },
      {
        ...base,
        error_class: "unhandled_error",
        event_type: "runtime_error",
        message: "Unexpected application error",
      },
      {
        ...base,
        duration_ms: 80,
        event_type: "http_operation",
        method: "GET",
        status_code: 200,
      },
    ]) {
      const response = await request.post("/telemetry/frontend", {
        data: signal,
        headers: { "X-Correlation-ID": "server:telemetry-e2e" },
      });

      expect(response.status()).toBe(202);
      expect(await response.json()).toEqual({ accepted: true, success: true });
      expect(response.headers()["x-correlation-id"]).toBe("server:telemetry-e2e");
    }
  });

  test("rejects raw URLs, unbounded values and unexpected secret fields @security", async ({
    request,
  }) => {
    const invalidRoute = await request.post("/telemetry/frontend", {
      data: {
        ...base,
        event_type: "web_vital",
        name: "LCP",
        rating: "good",
        route: "/products?email=user@example.com",
        value: 1200,
      },
    });
    const unexpectedSecret = await request.post("/telemetry/frontend", {
      data: {
        ...base,
        event_type: "runtime_error",
        error_class: "unhandled_error",
        message: "error",
        refresh_token: "must-not-cross-boundary",
      },
    });

    expect(invalidRoute.status()).toBe(400);
    expect(unexpectedSecret.status()).toBe(400);
  });
});
