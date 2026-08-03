import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";
import type { UserTokenSubjectSchema } from "@/user/application/schemas/user.schema";

const authTokenPayloadDto = z.object({
  sub: z.string(),
  email: z.email(),
  role: z.enum(["admin", "operador", "auditor", "soporte"]),
  typ: z.enum(["access", "refresh"]),
  // Identificador unico del token. Es la clave de revocacion del refresh token.
  jti: z.string().min(1),
  // Familia de rotacion: agrupa todos los refresh derivados de un mismo login.
  fam: z.string().min(1),
  exp: z.number().int().positive(),
});

export type AuthTokenPayload = z.infer<typeof authTokenPayloadDto>;

export type SignedTokenPair = {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_in: number;
  /** Metadatos del refresh token para que el servicio persista la sesion. */
  refresh_jti: string;
  refresh_family_id: string;
  refresh_token_hash: string;
  refresh_expires_at: string;
};

@Injectable()
export class AuthTokenService {
  private readonly issuer = "bus-impl-v2";
  private readonly audience = "bus-impl-v2-api";
  private readonly accessTokenSeconds = 900;

  constructor(
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Emite un par access/refresh.
   *
   * `familyId` se pasa al rotar para conservar el linaje del login original.
   * Si se omite, se abre una familia nueva (login, register o google).
   */
  async signTokenPair(user: UserTokenSubjectSchema, familyId?: string): Promise<SignedTokenPair> {
    const family_id = familyId ?? randomUUID();
    const refresh_jti = randomUUID();

    const access_token = await this.sign(
      user,
      "access",
      this.accessTokenTtl(),
      randomUUID(),
      family_id,
    );
    const refresh_token = await this.sign(
      user,
      "refresh",
      this.refreshTokenTtl(),
      refresh_jti,
      family_id,
    );

    return {
      token_type: "Bearer" as const,
      access_token,
      refresh_token,
      expires_in: this.accessTokenSeconds,
      refresh_jti,
      refresh_family_id: family_id,
      refresh_token_hash: AuthTokenService.hashToken(refresh_token),
      refresh_expires_at: await this.expirationOf(refresh_token),
    };
  }

  async verify(token: string, expectedType: AuthTokenPayload["typ"]): Promise<AuthTokenPayload> {
    try {
      const result = await jwtVerify(token, this.secret(), {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ["HS256"],
      });
      const payload = authTokenPayloadDto.parse(result.payload);

      if (payload.typ !== expectedType) {
        throw new UnauthorizedException("Tipo de token invalido");
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Token invalido o expirado");
    }
  }

  /**
   * SHA-256 del token. Se guarda esto en vez del token en claro para que un
   * volcado de la tabla de sesiones no entregue credenciales utilizables.
   */
  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async expirationOf(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.secret(), {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ["HS256"],
    });

    if (typeof payload.exp !== "number") {
      throw new Error("El token emitido no contiene exp");
    }

    return new Date(payload.exp * 1000).toISOString();
  }

  private accessTokenTtl(): string {
    return this.configService?.get("JWT_ACCESS_TOKEN_TTL", { infer: true }) ?? "15m";
  }

  private refreshTokenTtl(): string {
    return this.configService?.get("JWT_REFRESH_TOKEN_TTL", { infer: true }) ?? "7d";
  }

  private sign(
    user: UserTokenSubjectSchema,
    type: AuthTokenPayload["typ"],
    ttl: string,
    jti: string,
    familyId: string,
  ): Promise<string> {
    return new SignJWT({
      email: user.email,
      role: user.role,
      typ: type,
      fam: familyId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setJti(jti)
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime(ttl)
      .sign(this.secret());
  }

  private secret(): Uint8Array {
    const secret =
      this.configService?.get("JWT_SECRET", { infer: true }) ??
      "local-development-secret-change-me-please";

    if (secret.length < 32) {
      throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
    }

    return new TextEncoder().encode(secret);
  }
}
