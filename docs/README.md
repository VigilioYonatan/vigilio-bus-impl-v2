# bus-impl-v2 docs

La arquitectura central vive en:

- https://vigiliyonatan.github.io/vigilio-docs/backend-node-nest/

Las skills se distribuyen mediante `@vigilioyonatan/vigilio-skills`. Las referencias extensas no se
duplican dentro del proyecto.

## Documentos locales

- [`prompt-rules.md`](./prompt-rules.md): límites de aplicación/plataforma, runtime único API-worker-migración, Floci y portabilidad cloud.
- [`openapi/openapi.json`](./openapi/openapi.json): contrato generado.
- [`security-vulnerability-management.md`](./security-vulnerability-management.md): ownership,
  SLA, excepciones y cierre de vulnerabilidades.

## DevSecOps operativo

```bash
pnpm test:devsecops
pnpm devsecops:dora
pnpm devsecops:governance-audit
pnpm devsecops:provenance
pnpm devsecops:security-exceptions
```

- DORA escribe `reports/dora-metrics.json` y `reports/dora-metrics.md`.
- Drift escribe `reports/github-governance-drift.json` y su resumen Markdown.
- Provenance escribe una declaracion in-toto/SLSA v1 firmada por Cosign/KMS en CI.
- Las excepciones versionadas viven en `.github/security-exceptions.json` y expiran.

## Configuracion externa

- `GOVERNANCE_AUDIT_TOKEN`: GitHub App o token de lectura con acceso a configuracion del
  repositorio.
- `GOVERNANCE_DRIFT_ENFORCE=true`: variable de repositorio para bloquear ante drift.
- `AUDIT_EVIDENCE_BUCKET`: bucket central con Object Lock y cifrado por defecto para evidencia WORM.
- Ruleset activo con `Required CI Gate`.
- Push Protection y Secret Scanning activos.
- Reviewers y `prevent_self_review` activos en `staging` y `production`.

La politica esperada esta en `.github/governance-policy.json`.
