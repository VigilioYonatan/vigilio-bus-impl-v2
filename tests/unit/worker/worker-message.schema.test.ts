import { describe, expect, it } from "vitest";
import { workerMessageSchema } from "@/worker/application/schemas/worker-message.schema";

describe("workerMessageSchema", () => {
  it("accepts the versioned healthcheck envelope", () => {
    const message = workerMessageSchema.parse({
      correlationId: "request-123",
      id: "1d4f4a7c-96f5-41fd-91d1-3a44eedf2d72",
      occurredAt: "2026-08-02T12:00:00.000Z",
      payload: {},
      type: "bus.healthcheck.v1",
      version: 1,
    });

    expect(message.type).toBe("bus.healthcheck.v1");
  });

  it("rejects unknown event types instead of acknowledging them", () => {
    const result = workerMessageSchema.safeParse({
      correlationId: "request-123",
      id: "1d4f4a7c-96f5-41fd-91d1-3a44eedf2d72",
      occurredAt: "2026-08-02T12:00:00.000Z",
      payload: {},
      type: "unknown.v1",
      version: 1,
    });

    expect(result.success).toBe(false);
  });
});
