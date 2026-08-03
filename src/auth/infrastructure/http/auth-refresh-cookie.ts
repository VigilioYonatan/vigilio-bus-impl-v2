import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Request, Response } from "express";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  for (const part of cookieHeader?.split(";") ?? []) {
    const separator = part.indexOf("=");

    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }

    const encodedValue = part.slice(separator + 1).trim();

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return null;
    }
  }

  return null;
}

@Injectable()
export class AuthRefreshCookie {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  read(request: Request): string | null {
    return readCookie(request.headers.cookie, this.name());
  }

  write(response: Response, refreshToken: string, expiresAt: string): void {
    response.cookie(this.name(), refreshToken, {
      ...this.options(),
      expires: new Date(expiresAt),
    });
  }

  clear(response: Response): void {
    response.clearCookie(this.name(), this.options());
  }

  private name(): string {
    return this.configService.get("AUTH_REFRESH_COOKIE_NAME", { infer: true });
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      path: this.configService.get("AUTH_REFRESH_COOKIE_PATH", { infer: true }),
      sameSite: "lax",
      secure: this.configService.get("APP_STAGE", { infer: true }) !== "local",
    };
  }
}
