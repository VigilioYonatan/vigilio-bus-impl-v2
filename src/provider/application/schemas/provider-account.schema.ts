import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

/**
 * Estados del ciclo de vida del agregado `provider_account`.
 *
 * Vocabulario canonico aceptado (`class.md` §2): `ACTIVE | DISABLED`. El
 * valor inicial persistido por la creacion (D5) NO esta confirmado por el
 * owner y este pack no lo improvisa: el schema solo expone el vocabulario, la
 * columna Drizzle no declara default y la migracion versionada (S2) debe
 * materializar el valor confirmado antes de cualquier activacion.
 */
export const providerAccountStatusValues = ["ACTIVE", "DISABLED"] as const;

/**
 * Referencia de secreto aceptada por el alta (`secret_ref`, input-only).
 *
 * Referencia a un secreto gestionado por el proveedor de secretos, JAMAS un
 * valor secreto: el uso canonico es `secret_ref` como referencia opaca que
 * nunca se resuelve, transporta ni registra material secreto. La autoridad
 * canonica no declara maximo ni formato (GAP-11): el boundary solo exige un
 * string requerido no vacio (trim una sola vez) y no fabrica maximos.
 *
 * D6 (NO confirmado): la exposicion de esta referencia en la proyeccion
 * publica confirmada esta pendiente de aprobacion del owner; el default
 * fail-closed (A) NO transporta ningun campo de secreto ni de referencia de
 * secreto en la respuesta. Por eso este shape es input-only y no forma parte
 * de {@link providerAccountSchema}.
 */
export const providerAccountSecretRefSchema = z.string().trim().min(1);

/**
 * Proyeccion publica confirmada del agregado `provider_account` del contexto
 * `provider`.
 *
 * Slice canonico aceptado por `class.md` §2: identidad inmutable (`id`),
 * pertenencia al tenant (`tenant_id`, resuelta siempre desde el contexto de
 * confianza y jamas desde la request), referencia a un provider del MISMO
 * tenant (`provider_id`), identidad del proveedor
 * (`external_account_id` 1..200), moneda de liquidacion ISO-4217
 * canonicalizada una sola vez en el borde (trim + uppercase, codigo de 3
 * letras — texto exacto, nunca numerico, sin autoridad de punto flotante),
 * estado de ciclo de vida, version de concurrencia optimista y timestamps
 * UTC. No expone columnas internas.
 *
 * D6 (NO confirmado) — fail-closed default (A): la proyeccion NO transporta
 * `secret_ref` ni ningun otro campo relacionado con secretos (lectura
 * estricta de `class.md` §7: los refs/valores de secreto jamas entran en
 * response DTOs, logs ni events). La columna fisica `secret_ref` existe en el
 * agregado persistido como referencia opaca y la migracion versionada (S2) la
 * materializa; si el owner confirma la opcion B (eco de la referencia opaca),
 * el campo se agrega a esta proyeccion con el contrato versionado
 * correspondiente. Mientras tanto la request si acepta la referencia
 * ({@link providerAccountSecretRefSchema}) porque es parte del contrato de
 * creacion aceptado.
 *
 * D4 (NO confirmado): la identidad de negocio durable tenant-local del alta
 * (recomendacion `(tenant_id, provider_id, external_account_id)`) no esta
 * confirmada; este schema no declara constraints ni nombres fisicos y la
 * migracion (S2) los materializa con la semantica confirmada. La forma fisica
 * de tabla, constraints e indices requiere evidencia de migracion real
 * (`drizzle/**` fuera de `allowed_paths`).
 */
export const providerAccountSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  external_account_id: z.string().trim().min(1).max(200),
  id: z.uuid(),
  provider_id: z.uuid(),
  status: z.enum(providerAccountStatusValues),
  tenant_id: z.uuid(),
  version: z.number().int().min(1),
  ...timestampSchema.shape,
});

export type ProviderAccountSchema = z.infer<typeof providerAccountSchema>;
export type ProviderAccountStatus = (typeof providerAccountStatusValues)[number];
