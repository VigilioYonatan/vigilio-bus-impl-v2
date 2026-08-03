import { z } from "zod";

const safeIdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const routeSegment = "(?:[a-z][a-z0-9-]*|:[a-z][a-z0-9-]*)";

export const frontendRouteTemplateSchema = z
  .string()
  .max(160)
  .regex(new RegExp(`^(?:/|/${routeSegment}(?:/${routeSegment})*)$`));

const frontendTelemetryBaseSchema = z.object({
  correlation_id: safeIdentifierSchema.nullable(),
  event_id: z.uuid(),
  occurred_at: z.iso.datetime(),
  release: safeIdentifierSchema,
  route: frontendRouteTemplateSchema,
  schema_version: z.literal(1),
  stage: z.enum(["development", "test", "staging", "production"]),
});

export const frontendWebVitalTelemetrySchema = frontendTelemetryBaseSchema
  .extend({
    event_type: z.literal("web_vital"),
    name: z.enum(["CLS", "INP", "LCP"]),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    value: z.number().finite().nonnegative().max(120_000),
  })
  .strict();

export const frontendRuntimeErrorTelemetrySchema = frontendTelemetryBaseSchema
  .extend({
    error_class: z.enum(["resource_load", "unhandled_error", "unhandled_rejection"]),
    event_type: z.literal("runtime_error"),
    message: z.string().min(1).max(240),
  })
  .strict();

export const frontendHttpOperationTelemetrySchema = frontendTelemetryBaseSchema
  .extend({
    duration_ms: z.number().finite().nonnegative().max(120_000),
    event_type: z.literal("http_operation"),
    method: z.enum(["DELETE", "GET", "PATCH", "POST", "PUT"]),
    status_code: z.number().int().min(0).max(599),
  })
  .strict();

export const frontendTelemetrySchema = z.discriminatedUnion("event_type", [
  frontendWebVitalTelemetrySchema,
  frontendRuntimeErrorTelemetrySchema,
  frontendHttpOperationTelemetrySchema,
]);

export type FrontendTelemetrySchema = z.infer<typeof frontendTelemetrySchema>;
