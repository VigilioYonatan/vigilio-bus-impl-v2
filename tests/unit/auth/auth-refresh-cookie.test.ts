import type { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthRefreshCookie } from "@/auth/infrastructure/http/auth-refresh-cookie";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";

function createCookie(stage: EnvironmentVariables["APP_STAGE"]) {
  const config = {
    get: vi.fn((key: keyof EnvironmentVariables) => {
      if (key === "APP_STAGE") return stage;
      if (key === "AUTH_REFRESH_COOKIE_NAME") return "rimac_refresh";
      if (key === "AUTH_REFRESH_COOKIE_PATH") return "/auth";
      throw new Error(`Unexpected config key ${String(key)}`);
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  return new AuthRefreshCookie(config);
}

describe("AuthRefreshCookie", () => {
  it("reads the configured cookie and decodes its value", () => {
    const cookie = createCookie("local");
    const request = {
      headers: { cookie: "other=value; rimac_refresh=encoded%20token" },
    } as Request;

    expect(cookie.read(request)).toBe("encoded token");
  });

  it("writes local cookies without Secure and clears with the same path", () => {
    const cookie = createCookie("local");
    const response = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;

    cookie.write(response, "refresh-token", "2026-08-01T00:00:00.000Z");
    cookie.clear(response);

    expect(response.cookie).toHaveBeenCalledWith(
      "rimac_refresh",
      "refresh-token",
      expect.objectContaining({ httpOnly: true, path: "/auth", sameSite: "lax", secure: false }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      "rimac_refresh",
      expect.objectContaining({ httpOnly: true, path: "/auth", sameSite: "lax", secure: false }),
    );
  });

  it("marks non-local cookies Secure", () => {
    const cookie = createCookie("production");
    const response = { cookie: vi.fn() } as unknown as Response;

    cookie.write(response, "refresh-token", "2026-08-01T00:00:00.000Z");

    expect(response.cookie).toHaveBeenCalledWith(
      "rimac_refresh",
      "refresh-token",
      expect.objectContaining({ secure: true }),
    );
  });
});
