import type { NextFunction, Request, Response } from "express";
import { createSecurityHeadersMiddleware } from "@/shared/infrastructure/http/middleware/security-headers.middleware";

function createResponse() {
  const headers = new Map<string, string>();

  const response = {
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    removeHeader: vi.fn((name: string) => {
      headers.delete(name);
    }),
  } as unknown as Response;

  return { response, headers };
}

describe("securityHeadersMiddleware", () => {
  it("aplica las cabeceras base de una API JSON", () => {
    const { response, headers } = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    createSecurityHeadersMiddleware({ enableHsts: false })({} as Request, response, next);

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(next).toHaveBeenCalledOnce();
  });

  it("omite HSTS cuando esta deshabilitado para no fijar localhost en el navegador", () => {
    const { response, headers } = createResponse();

    createSecurityHeadersMiddleware({ enableHsts: false })(
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction,
    );

    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });

  it("emite HSTS con includeSubDomains y preload cuando esta habilitado", () => {
    const { response, headers } = createResponse();

    createSecurityHeadersMiddleware({ enableHsts: true })(
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction,
    );

    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
  });

  it("elimina X-Powered-By", () => {
    const { response } = createResponse();

    createSecurityHeadersMiddleware({ enableHsts: false })(
      {} as Request,
      response,
      vi.fn() as unknown as NextFunction,
    );

    expect(response.removeHeader).toHaveBeenCalledWith("X-Powered-By");
  });

  it("relaja la CSP solo para las rutas de docs declaradas", () => {
    const { response, headers } = createResponse();

    createSecurityHeadersMiddleware({
      docsPaths: ["/docs", "/reference"],
      enableHsts: false,
    })({ path: "/reference" } as Request, response, vi.fn() as unknown as NextFunction);

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net");
    expect(csp).toContain(
      "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
  });

  it("mantiene la CSP estricta en rutas de negocio aunque las docs esten habilitadas", () => {
    const { response, headers } = createResponse();

    createSecurityHeadersMiddleware({
      docsPaths: ["/docs", "/reference"],
      enableHsts: false,
    })({ path: "/products" } as Request, response, vi.fn() as unknown as NextFunction);

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("cdn.jsdelivr.net");
  });

  it("cubre subrutas de docs pero no prefijos parecidos", () => {
    const middleware = createSecurityHeadersMiddleware({
      docsPaths: ["/docs"],
      enableHsts: false,
    });

    const docsAsset = createResponse();
    middleware(
      { path: "/docs/swagger-ui.css" } as Request,
      docsAsset.response,
      vi.fn() as unknown as NextFunction,
    );
    expect(docsAsset.headers.get("Content-Security-Policy")).toContain("cdn.jsdelivr.net");

    const lookalike = createResponse();
    middleware(
      { path: "/docs-not-really" } as Request,
      lookalike.response,
      vi.fn() as unknown as NextFunction,
    );
    expect(lookalike.headers.get("Content-Security-Policy")).not.toContain("cdn.jsdelivr.net");
  });

  it("no relaja nada cuando las docs estan deshabilitadas", () => {
    const { response, headers } = createResponse();

    createSecurityHeadersMiddleware({ enableHsts: false })(
      { path: "/reference" } as Request,
      response,
      vi.fn() as unknown as NextFunction,
    );

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("cdn.jsdelivr.net");
  });
});
