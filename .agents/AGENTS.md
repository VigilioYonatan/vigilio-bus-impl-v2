# Compatibilidad De Agentes

La fuente canonica de instrucciones persistentes es `../AGENTS.md` en la raiz del repositorio.

Los workflows especializados viven en `.agents/skills/`:

- `$node-nest-build-feature`
- `$node-nest-persistence`
- `$node-nest-testing`
- `$node-nest-security-aws`
- `$token-context-compression`

Se sincronizan desde `@vigilioyonatan/vigilio-skills` con `pnpm skills:sync`. Leer y aplicar
primero `../AGENTS.md`; despues cargar el skill que corresponda a la tarea.
