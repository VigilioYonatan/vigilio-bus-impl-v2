import type { NextFunction, Request, Response } from "express";

/**
 * Cabeceras de seguridad para una API JSON.
 *
 * Implementado a mano en vez de con `helmet` a proposito: esta plantilla es la
 * base de otros proyectos, y una dependencia menos es una superficie menos de
 * supply chain. El conjunto que sigue es el subconjunto de helmet que aplica a
 * una API que no sirve HTML; el resto (CSP para paginas, X-XSS-Protection ya
 * obsoleto) no aporta nada aqui.
 */

const ONE_YEAR_IN_SECONDS = 31_536_000;

export type SecurityHeadersOptions = {
  /**
   * HSTS solo se emite sobre HTTPS. En local el navegador lo ignoraria, pero
   * emitirlo en `http://localhost` puede dejar el dominio fijado en el navegador
   * del desarrollador y romperle otros proyectos en el mismo host.
   */
  enableHsts: boolean;
};

export function createSecurityHeadersMiddleware({ enableHsts }: SecurityHeadersOptions) {
  return function securityHeadersMiddleware(
    _request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    // Evita que el navegador adivine el tipo de contenido y ejecute una respuesta
    // JSON como si fuera HTML o script.
    response.setHeader("X-Content-Type-Options", "nosniff");

    // La API no debe embeberse en un frame bajo ninguna circunstancia.
    response.setHeader("X-Frame-Options", "DENY");

    // No filtrar la URL completa (que puede llevar ids) a terceros.
    response.setHeader("Referrer-Policy", "no-referrer");

    // Desactiva APIs del navegador que una API JSON nunca necesita.
    response.setHeader(
      "Permissions-Policy",
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
    );

    // CSP minima: aunque una respuesta JSON se renderizara como documento,
    // no podria cargar ni ejecutar nada.
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );

    // Aisla la respuesta de ventanas y recursos de otros origenes.
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    // Oculta el fingerprint de Express.
    response.removeHeader("X-Powered-By");

    if (enableHsts) {
      response.setHeader(
        "Strict-Transport-Security",
        `max-age=${ONE_YEAR_IN_SECONDS}; includeSubDomains; preload`,
      );
    }

    next();
  };
}
