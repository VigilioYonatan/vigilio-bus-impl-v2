import type { NextFunction, Request, Response } from "express";
import { collectDefaultMetrics, Histogram, Registry } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ prefix: "bus_impl_v2_", register: metricsRegistry });

const requestDuration = new Histogram({
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2.5, 5],
  help: "Duration of inbound HTTP server requests in seconds.",
  labelNames: [
    "service_name",
    "http_request_method",
    "http_route",
    "http_response_status_code",
  ] as const,
  name: "http_server_request_duration_seconds",
  registers: [metricsRegistry],
});

export function metricsMiddleware(request: Request, response: Response, next: NextFunction): void {
  if (request.path === "/metrics") {
    next();
    return;
  }

  const stopTimer = requestDuration.startTimer({
    http_request_method: request.method,
    service_name: "bus-impl-v2",
  });

  response.once("finish", () => {
    stopTimer({
      http_response_status_code: String(response.statusCode),
      http_route: normalizeRoute(request.route?.path, request.path),
    });
  });
  next();
}

function normalizeRoute(route: unknown, requestPath: string): string {
  if (typeof route === "string" && route.length > 0) {
    return route;
  }
  return requestPath.replaceAll(/\b[0-9a-f]{8,}\b/gi, ":id").replaceAll(/\/\d+(?=\/|$)/g, "/:id");
}
