import { Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

const googleIdTokenPayloadDto = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().min(1).optional(),
});

export type GoogleIdTokenPayload = z.infer<typeof googleIdTokenPayloadDto>;

@Injectable()
export class GoogleIdTokenVerifier {
  private readonly jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

  constructor(
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService<EnvironmentVariables, true>,
  ) {}

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    const audience = this.configService?.get("GOOGLE_CLIENT_ID", { infer: true });

    if (!audience) {
      throw new Error("GOOGLE_CLIENT_ID no esta configurado");
    }

    try {
      const result = await jwtVerify(idToken, this.jwks, {
        audience,
        issuer: ["https://accounts.google.com", "accounts.google.com"],
      });
      const payload = googleIdTokenPayloadDto.parse(result.payload);

      if (!payload.email_verified) {
        throw new UnauthorizedException("El email de Google no esta verificado");
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Google id_token invalido");
    }
  }
}
