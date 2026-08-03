import { expect, test } from "@playwright/test";

test.describe("security negative paths", () => {
  test("health y readiness son publicos @critical @smoke", async ({ request }) => {
    expect((await request.get("/health")).status()).toBe(200);
    expect((await request.get("/ready")).status()).toBe(200);
  });

  test("rechaza credenciales malformadas en endpoints protegidos @critical @security", async ({
    request,
  }) => {
    const missingToken = await request.get("/products", {
      headers: { Authorization: "Bearer" },
    });
    const wrongScheme = await request.get("/users", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    const invalidToken = await request.post("/uploads/presigned-url", {
      data: {
        file_name: "evidence.pdf",
        mime_type: "application/pdf",
        purpose: "document",
        size_bytes: 1024,
      },
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });

    expect(missingToken.status()).toBe(401);
    expect(wrongScheme.status()).toBe(401);
    expect(invalidToken.status()).toBe(401);
  });

  test("rechaza payloads de autenticacion invalidos @security", async ({ request }) => {
    const weakRegistration = await request.post("/auth/register", {
      data: {
        email: "not-an-email",
        full_name: "X",
        password: "short",
      },
    });
    const malformedLogin = await request.post("/auth/login", {
      data: { email: "not-an-email", password: "" },
    });
    const malformedRefresh = await request.post("/auth/refresh", {
      data: { refresh_token: "short" },
    });

    expect(weakRegistration.status()).toBe(400);
    expect(malformedLogin.status()).toBe(400);
    expect(malformedRefresh.status()).toBe(400);
  });

  test("refresh exige cookie HttpOnly @critical @security", async ({ request }) => {
    const withoutCookie = await request.post("/auth/refresh", { data: {} });
    const invalidCookie = await request.post("/auth/refresh", {
      data: {},
      headers: { Cookie: "rimac_refresh=invalid.jwt.token" },
    });

    expect(withoutCookie.status()).toBe(401);
    expect(invalidCookie.status()).toBe(401);
  });

  test("refresh rechaza el secreto legado enviado por body @security", async ({ request }) => {
    const suffix = Date.now();
    const registerResponse = await request.post("/auth/register", {
      data: {
        email: `refresh-body-${suffix}@rimac.com`,
        full_name: "Refresh Body E2E",
        password: "super-secure-password",
      },
    });
    expect(registerResponse.status()).toBe(201);

    const legacyBody = await request.post("/auth/refresh", {
      data: { refresh_token: "legacy-secret-must-not-be-accepted" },
    });
    expect(legacyBody.status()).toBe(400);

    const legacyLogoutBody = await request.post("/auth/logout", {
      data: { refresh_token: "legacy-secret-must-not-be-accepted" },
    });
    expect(legacyLogoutBody.status()).toBe(400);
  });
});
