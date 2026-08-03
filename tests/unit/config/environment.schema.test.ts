import { validateEnvironment } from "@/shared/infrastructure/config/environment.schema";

describe("validateEnvironment", () => {
  it("aplica defaults seguros para desarrollo local", () => {
    const environment = validateEnvironment({ NODE_ENV: "test" });

    expect(environment.APP_STAGE).toBe("local");
    expect(environment.PORT).toBe(3000);
    expect(environment.AWS_REGION).toBe("us-east-1");
    expect(environment.DATABASE_POOL_MAX).toBe(10);
    expect(environment.API_DOCS_ENABLED).toBeUndefined();
    expect(environment.CORS_ALLOWED_ORIGINS).toEqual(["http://localhost:4200"]);
  });

  it("exige que access key y secret key se configuren juntos", () => {
    expect(() =>
      validateEnvironment({
        AWS_ACCESS_KEY_ID: "test-key",
        NODE_ENV: "test",
      }),
    ).toThrow("AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY deben configurarse juntos");
  });

  it("rechaza defaults, credenciales estaticas y falta de DB en production", () => {
    expect(() =>
      validateEnvironment({
        APP_STAGE: "production",
        AWS_ACCESS_KEY_ID: "static-key",
        AWS_SECRET_ACCESS_KEY: "static-secret",
        NODE_ENV: "production",
      }),
    ).toThrow("SECURITY FATAL");
  });

  it("acepta production con secreto fuerte, DB y rol IAM", () => {
    const environment = validateEnvironment({
      APP_STAGE: "production",
      DATABASE_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:db",
      JWT_SECRET: "a-production-secret-with-more-than-32-characters",
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://backoffice.rimac.test",
    });

    expect(environment.APP_STAGE).toBe("production");
    expect(environment.AWS_ACCESS_KEY_ID).toBeUndefined();
  });

  it("normaliza multiples origenes CORS", () => {
    expect(
      validateEnvironment({
        CORS_ALLOWED_ORIGINS: "http://localhost:4200, https://preview.rimac.test",
      }).CORS_ALLOWED_ORIGINS,
    ).toEqual(["http://localhost:4200", "https://preview.rimac.test"]);
  });

  it("rechaza localhost CORS en production", () => {
    expect(() =>
      validateEnvironment({
        APP_STAGE: "production",
        CORS_ALLOWED_ORIGINS: "http://localhost:4200",
        DATABASE_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:db",
        JWT_SECRET: "a-production-secret-with-more-than-32-characters",
        NODE_ENV: "production",
      }),
    ).toThrow("CORS_ALLOWED_ORIGINS");
  });

  it("rechaza limites operacionales fuera de rango", () => {
    expect(() => validateEnvironment({ PORT: 70_000 })).toThrow("Variables de entorno invalidas");
    expect(() => validateEnvironment({ BEDROCK_TEMPERATURE: 2 })).toThrow(
      "Variables de entorno invalidas",
    );
  });

  it("convierte flags booleanos sin tratar false como true", () => {
    expect(validateEnvironment({ API_DOCS_ENABLED: "false" }).API_DOCS_ENABLED).toBe(false);
    expect(validateEnvironment({ API_DOCS_ENABLED: "true" }).API_DOCS_ENABLED).toBe(true);
  });
});
