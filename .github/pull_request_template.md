## Descripcion

Agrega una descripcion clara de que cambia y por que cambia.

## Descripcion obligatoria

CI rechaza PRs sin descripcion real. Explica que cambia, por que cambia, riesgos, rollback, pruebas ejecutadas y evidencia para QA si aplica.

Closes: [ABC-123]

## Tipo de cambio

- [ ] Bugfix
- [ ] Feature
- [ ] Refactor
- [ ] Documentacion
- [ ] DevOps / CI/CD
- [ ] Seguridad

## Pruebas y evidencia

Describe las pruebas ejecutadas y pega evidencia relevante:

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:coverage`
- [ ] `pnpm test:integration` si aplica
- [ ] `pnpm test:e2e` si aplica
- [ ] `pnpm openapi:diff` si cambia contrato

## Riesgo y rollback

Describe el riesgo principal, plan de rollback o por que no aplica.

## Seguridad

Describe impacto de seguridad, IAM, secrets, auth, datos sensibles o por que no aplica.

- [ ] No introduce suppressions o excepciones de seguridad permanentes.
- [ ] Toda excepcion incluye issue, owner, controles compensatorios y fecha de expiracion.

## QA / Staging

Indica como QA debe validar el cambio en staging, Postman, Scalar, smoke o evidencia funcional.
