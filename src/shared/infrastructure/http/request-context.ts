import type { Request } from "express";

export type RequestContext = {
  ip_address: string | null;
  user_agent: string | null;
};

const MAX_USER_AGENT_LENGTH = 255;

/**
 * Extrae IP y user agent de la peticion para auditoria y rate limiting.
 *
 * Usa `request.ip`, que Express resuelve segun `trust proxy`. Ese ajuste se
 * configura en `main.ts` con `TRUSTED_PROXY_HOPS`. Leer `X-Forwarded-For` a mano
 * y quedarse con el primer valor seria falsificable por el cliente: cualquiera
 * puede enviar esa cabecera y saltarse el bloqueo por IP.
 */
export function readRequestContext(request: Request): RequestContext {
  const userAgent = request.header("user-agent")?.trim();

  return {
    ip_address: normalizeIp(request.ip),
    user_agent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}

/**
 * PostgreSQL `inet` rechaza el formato IPv4 mapeado en IPv6 (`::ffff:127.0.0.1`)
 * que Node entrega en dual-stack, asi que se reduce a IPv4.
 */
function normalizeIp(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);

  return mappedIpv4?.[1] ?? ip;
}
