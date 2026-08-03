# Reglas de agente — bus-impl-v2

## Fuente de verdad

1. Código y configuración ejecutable en `src/`, `scripts/`, `drizzle/` y `.github/workflows/`.
2. Pruebas que demuestran el comportamiento.
3. ADR y documentación vigente.

No implementar desde documentación si contradice código o tests.

## Stack

- Node.js 24.16.0, pnpm 11.7.0, ESM.
- NestJS 11, Zod 4, Drizzle/PostgreSQL, Pino, Biome, Vitest, Cucumber y Playwright.
- Una imagen con API, worker y migración; el worker no es un repositorio separado.
- AWS SDK con EKS Pod Identity. No CDK, access keys cloud ni LocalStack; integración local AWS con Floci.
- Terraform/OpenTofu, Helm y GitOps viven fuera de la aplicación.

## Reglas

- Mantener bounded contexts y `src/shared` solo para infraestructura técnica transversal.
- Contratos runtime con Zod; no `any`, secretos/PII en logs ni filas DB como responses.
- El worker asume entrega at-least-once: handler idempotente, acknowledge solo tras éxito, mensajes inválidos a reintento/DLQ y shutdown por SIGTERM.
- No introducir dependencias cloud en dominio. Nuevas nubes se agregan mediante adapters y módulos externos.
- No afirmar validaciones no ejecutadas.

## Validación mínima

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:integration
pnpm test:integration:aws
pnpm test:bdd
pnpm test:e2e:api
pnpm openapi:diff
pnpm build
```
