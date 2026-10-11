import { z } from "zod";
import {
  providerAccountSchema,
  providerAccountSecretRefSchema,
} from "../schemas/provider-account.schema";

/**
 * Payload de creacion de una cuenta de proveedor
 * (`EP-PROVIDER-PROVIDER-ACCOUNTS-STORE-001`).
 *
 * Deriva del slice canonico las cuatro unicas superficies aceptadas por el
 * contrato — `provider_id` (referencia a un provider del MISMO tenant),
 * `external_account_id` (identidad del proveedor, 1..200, trim una sola vez),
 * `currency` (moneda de liquidacion ISO-4217, canonicalizada una sola vez:
 * trim + uppercase de un codigo de 3 letras; texto exacto, nunca numerico) y
 * `secret_ref` (referencia opaca al gestor de secretos, JAMAS un valor
 * secreto) — mas la proyeccion publica de los campos de identidad.
 *
 * Es una mutacion: los campos no declarados se rechazan en el borde
 * (`strictObject`) para impedir mass-assignment de `tenant_id`/`status`/
 * `version` por body; ningun header de sesion se acepta como alias de estos
 * campos y el tenant de la cuenta creada jamas viaja en la request. No
 * duplica defaults de base de datos (D5: el `status` inicial no esta
 * confirmado) y no fabrica maximos fuera del 1..200 declarado por la
 * autoridad canonica (GAP-11: la estrategia ISO-4217 completa — codigo vs
 * lista canonica — y el maximo de `secret_ref` quedan para el owner; aqui
 * solo vive la forma declarada).
 */
export const providerAccountsStoreRequestDto = z.strictObject({
  currency: providerAccountSchema.shape.currency,
  external_account_id: providerAccountSchema.shape.external_account_id,
  provider_id: providerAccountSchema.shape.provider_id,
  secret_ref: providerAccountSecretRefSchema,
});

export type ProviderAccountsStoreRequestDto = z.infer<typeof providerAccountsStoreRequestDto>;
