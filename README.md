# bus-impl-v2

Backend NestJS 11 y Node.js 24 ejecutado en EKS como monolito modular. Conserva los contratos,
seguridad y pruebas de `bus-impl`, pero separa la aplicación de la infraestructura: no contiene CDK,
Terraform ni manifiestos Kubernetes dentro de la app.

## Arquitectura ejecutable

Una compilación y una imagen inmutable contienen tres entrypoints del mismo deployable:

| Proceso | Entrypoint | Operación |
| --- | --- | --- |
| API | `node dist/src/main.js` | Argo Rollouts, HPA y análisis SLO |
| Worker | `node dist/src/worker.main.js` | Deployment y KEDA por backlog SQS |
| Migración | `node dist/src/database/migrate.js` | Job Argo CD `PreSync` |

El worker no es otra app ni otra imagen. Tiene ServiceAccount y AWS Pod Identity independientes,
long polling y entrega SQS *at-least-once*. Un mensaje solo se elimina después de procesarse; cada
handler de negocio debe ser idempotente y los fallos agotados terminan en la DLQ.

Responsabilidades del monorepo:

- `apps/bus-impl-v2`: dominio, adapters, Drizzle, contratos y pruebas.
- `infra`: Terraform por proveedor y ambiente; hoy implementa AWS.
- `deploy`: Helm, Argo CD, políticas, observabilidad, SLO y caos.
- `docker/bus-impl-v2`: una imagen y dependencias locales.
- `platform-actions`: workflows reutilizables de CI, OCI, Terraform, Helm y GitOps.

## Cómo consume cloud

`bus-impl` v1 despliega AWS desde `apps/bus-impl/cdk`. `bus-impl-v2` no lee archivos Terraform en
runtime: Terraform crea AWS y sus identidades; Helm/Argo CD inyectan URLs, ARN y configuración; los
pods acceden con EKS Pod Identity y AWS SDK, sin access keys persistentes.

El proveedor ejecutable actual es AWS: SQS, S3, Bedrock, SSM Parameter Store y Secrets Manager.
Azure y GCP son extensiones previstas, no implementaciones existentes. Incorporarlos exige módulos
`infra/modules/<provider>`, ambientes, Workload Identity y adapters concretos detrás de los puertos
de aplicación. El dominio no debe contener condicionales `if aws/azure/gcp`.

## Desarrollo local

Requisitos: Node.js `24.16.0`, pnpm `11.7.0`, Podman y acceso de lectura a los paquetes privados
`@vigilioyonatan` en GitHub Packages.

Desde la raíz del monorepo:

```powershell
Copy-Item apps/bus-impl-v2/.env.example apps/bus-impl-v2/.env
podman compose -f docker/bus-impl-v2/compose.local.yaml up -d
Set-Location apps/bus-impl-v2
pnpm install --frozen-lockfile
pnpm db:local:setup
pnpm start:dev
```

Para ejecutar el worker, cree primero la cola en Floci y arránquelo en otra terminal:

```powershell
aws --endpoint-url http://127.0.0.1:4566 sqs create-queue --queue-name bus-impl-v2-events
pnpm start:worker
```

Floci `1.5.12` emula únicamente los contratos AWS usados en integración local. LocalStack no forma
parte del proyecto y Floci no constituye evidencia de una prueba en una cuenta AWS real.

En Podman Desktop para Windows, si el reenvío de puertos WSL queda interrumpido después de reiniciar
la máquina, use temporalmente la IPv4 de `eth0` como host de `E2E_DATABASE_ADMIN_URL`,
`E2E_DATABASE_URL` y `AWS_ENDPOINT_URL`; no cambie archivos ni use LocalStack. La construcción OCI
con workaround automatizado se ejecuta desde la raíz con:

```powershell
.\docker\bus-impl-v2\build-podman-windows.ps1 -Tag localhost/bus-impl-v2:local
```

Validación completa de aplicación:

```powershell
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:integration
pnpm test:integration:aws
pnpm test:bdd
pnpm test:e2e:api
pnpm openapi:export
pnpm openapi:diff
pnpm build
```

## Development, staging y production

Los tres ambientes ejecutan el mismo digest OCI; nunca se recompila para promover.

1. `platform-terraform-plan` revisa el ambiente en `infra/environments/aws/<stage>` con OIDC,
   Conftest y Trivy. `platform-terraform-apply` genera un plan binario, espera la aprobación del
   GitHub Environment y aplica exactamente ese artefacto.
2. Un merge a `main` que modifica la app o su Dockerfile ejecuta `bus-impl-v2-delivery`: build
   multi-arquitectura, SBOM, provenance, escaneo, firma keyless y publicación en ECR por digest.
3. Delivery abre una PR `gitops/promote-development-<digest-corto>` que solo cambia
   `deploy/gitops/apps/bus-impl-v2/development/values.yaml`.
4. El mismo digest se promueve manualmente a staging y production mediante
   `bus-impl-v2-promote`. Argo CD sincroniza Helm; production conserva aprobación humana, canary y
   análisis SLO.
5. `bus-impl-v2-verify-deployment` prueba el endpoint ya sincronizado. Un fallo requiere rollback
   al digest anterior, no reconstruir la imagen.

Antes de activar un ambiente deben reemplazarse todos los `REPLACE_WITH_*` de `backend.hcl`, tfvars y GitOps.

### Variables y Secretos requeridos en GitHub (`Settings -> Secrets and variables -> Actions`):

#### Variables del Repositorio (`vars`):
- `ECR_REPOSITORY_STAGING`: URI del repositorio ECR privado para ambiente staging (ej. `123456789012.dkr.ecr.us-east-1.amazonaws.com/bus-impl-v2-staging`).
- `ECR_REPOSITORY_DEVELOPMENT`: URI del repositorio ECR privado para ambiente desarrollo (ej. `123456789012.dkr.ecr.us-east-1.amazonaws.com/bus-impl-v2-dev`).
- `AWS_REGION`: Región AWS (predeterminado: `us-east-1`).
- `GITOPS_APP_CLIENT_ID`: App ID de la GitHub App encargada de abrir PRs de promoción en GitOps (`deploy/gitops/`).
- `GITOPS_BOT_ACTOR`: Nombre del bot para GitOps (predeterminado: `github-actions[bot]`).
- `APP_BASE_URL`: URL pública base de la API (configurada por Environment: `development`, `staging`, `production`) utilizada por smoke testing y OWASP ZAP DAST.

#### Secretos del Repositorio (`secrets`):
- `AWS_BUILD_ROLE_ARN`: ARN del rol IAM OIDC con permisos para autenticación ECR y push de imágenes container.
- `GITOPS_APP_PRIVATE_KEY`: Llave privada RSA de la GitHub App para firmar y abrir los Pull Requests de promoción GitOps.
- `GITHUB_PACKAGES_TOKEN`: (Opcional) Token de lectura para paquetes privados `@vigilioyonatan` en GitHub Packages.

No se permiten access keys AWS en staging/production. RDS se resuelve por `DATABASE_SECRET_ARN`; la configuración sensible opcional usa Secrets Manager y la configuración general puede usar SSM. Las asociaciones Pod Identity de API, worker y migración deben existir antes de sincronizar el chart.

## Estado funcional honesto

El evento ejecutable inicial es `bus.healthcheck.v1`, suficiente para comprobar transporte,
reintentos, DLQ y despliegue. No representa procesamiento de negocio. Cada tipo nuevo requiere
schema versionado, handler idempotente, pruebas unitarias/integración, métricas, alerta y runbook.

La guía operativa detallada del pipeline está en
[`../../docs/architecture/bus-impl-v2/CI-CD.md`](../../docs/architecture/bus-impl-v2/CI-CD.md).
