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

/**
 * CSP estricta para respuestas de la API (JSON): aunque una respuesta se
 * renderizara como documento, no puede cargar ni ejecutar nada.
 */
const STRICT_CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/**
 * CSP acotada para las paginas interactivas de documentacion (Swagger UI y
 * Scalar). Necesitan ejecutar JS propio; Scalar ademas carga su bundle desde
 * jsdelivr y ambas inyectan estilos inline, asi que se habilita `unsafe-inline`
 * solo aqui. Estas rutas estan apagadas por defecto en produccion
 * (`API_DOCS_ENABLED`) y esta CSP jamas aplica a respuestas de negocio.
 */
const DOCS_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https://cdn.jsdelivr.net",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export type SecurityHeadersOptions = {
  /**
   * HSTS solo se emite sobre HTTPS. En local el navegador lo ignoraria, pero
   * emitirlo en `http://localhost` puede dejar el dominio fijado en el navegador
   * del desarrollador y romperle otros proyectos en el mismo host.
   */
  enableHsts: boolean;
  /**
   * Rutas (y subrutas) que sirven documentacion interactiva. Solo ellas reciben
   * la CSP de docs; ausente o vacio mantiene la CSP estricta en todo el API.
   */
  docsPaths?: readonly string[];
};

function isDocsPath(path: string, docsPaths: readonly string[]): boolean {
  return docsPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function createSecurityHeadersMiddleware({
  enableHsts,
  docsPaths = [],
}: SecurityHeadersOptions) {
  return function securityHeadersMiddleware(
    request: Request,
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

    // CSP minima para la API; las paginas de docs reciben una CSP acotada que
    // les permite renderizar Swagger UI / Scalar sin abrir el resto del API.
    response.setHeader(
      "Content-Security-Policy",
      isDocsPath(request.path ?? "", docsPaths)
        ? DOCS_CONTENT_SECURITY_POLICY
        : STRICT_CONTENT_SECURITY_POLICY,
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
