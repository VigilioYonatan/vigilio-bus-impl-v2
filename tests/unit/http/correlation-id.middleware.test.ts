import type { NextFunction, Request, Response } from "express";
import {
  CORRELATION_ID_HEADER,
  correlationIdMiddleware,
} from "@/shared/infrastructure/http/middleware/correlation-id.middleware";

function createHttpDoubles(header?: string) {
  const headers: Record<string, string | undefined> = {};
  const request = {
    header: vi.fn(() => header),
    headers,
  } as unknown as Request;
  const response = {
    setHeader: vi.fn(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;

  return { headers, next, request, response };
}

describe("correlationIdMiddleware", () => {
  it("propaga un correlation id valido en request y response", () => {
    const { headers, next, request, response } = createHttpDoubles("web-123:request");

    correlationIdMiddleware(request, response, next);

    expect(headers[CORRELATION_ID_HEADER]).toBe("web-123:request");
    expect(response.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, "web-123:request");
    expect(next).toHaveBeenCalledOnce();
  });

  it("reemplaza valores inseguros por un UUID", () => {
    const { headers, request, response, next } = createHttpDoubles("invalid header value");

    correlationIdMiddleware(request, response, next);

    expect(headers[CORRELATION_ID_HEADER]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      headers[CORRELATION_ID_HEADER],
    );
  });
});
