# Reglas de implementación bus-impl-v2

Estado: Kubernetes + Terraform externo, actualizado 2026.

- Mantener el monolito modular NestJS y los contratos Zod browser-safe.
- API, worker y migración salen de la misma imagen/digest.
- El worker es un proceso reusable, no otra app. SQS es at-least-once: idempotencia, retry, DLQ y correlación son obligatorios.
- AWS local se prueba con Floci. No usar LocalStack ni presentar Floci como evidencia AWS real.
- La aplicación no conoce Terraform, Helm, AWS accounts ni nombres de clusters.
- Infraestructura AWS vive en `infra/modules/aws`; Azure/GCP deberán tener módulos hermanos y el mismo contrato de outputs.
- Despliegue vive en `deploy/helm` y `deploy/gitops`; solo se promueven digests firmados.
- Cambios de plataforma se validan con plan, políticas, Helm/Kubeconform y revisión; cambios de aplicación con lint, tipos, coverage, integración, BDD, E2E, OpenAPI y build.
