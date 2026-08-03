# `@vigilioyonatan/bus-v2-contracts`

Contratos HTTP públicos de `bus-impl-v2`: schemas Zod y tipos inferidos. El paquete no exporta
NestJS, Swagger, `nestjs-zod` ni archivos `*.doc.ts`.

## Desarrollo local en tiempo real

Desde `bus-impl-v2`, genera el barrel y deja TypeScript observando cambios:

```powershell
pnpm dev:contracts
```

En `web-mfe`, una sola vez:

```powershell
pnpm link ..\bus-impl-v2\packages\contracts
```

Los cambios en schemas/DTOs existentes se recompilan hacia `dist`. Si agregas o eliminas un
archivo de contrato, reinicia `pnpm dev:contracts` para regenerar el barrel.

## CI y producción

Publica el paquete desde este directorio y fija una versión exacta en el consumidor. No uses
`link:`, `file:`, `workspace:*` ni `latest` en CI o producción.

```powershell
pnpm build:contracts
pnpm --filter @vigilioyonatan/bus-v2-contracts pack --dry-run
pnpm --filter @vigilioyonatan/bus-v2-contracts publish --no-git-checks
```
