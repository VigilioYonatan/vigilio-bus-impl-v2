import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const CORRELATION_ID_HEADER = "x-correlation-id";
const MAX_CORRELATION_ID_LENGTH = 128;
const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]+$/;

export function correlationIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const incomingHeader = request.header(CORRELATION_ID_HEADER)?.trim();
  const correlationId =
    incomingHeader &&
    incomingHeader.length <= MAX_CORRELATION_ID_LENGTH &&
    SAFE_CORRELATION_ID.test(incomingHeader)
      ? incomingHeader
      : randomUUID();

  request.headers[CORRELATION_ID_HEADER] = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
