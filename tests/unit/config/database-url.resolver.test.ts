import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { resolveDatabaseUrl } from "@/shared/infrastructure/database/database-url.resolver";

const baseConfiguration = {
  APP_STAGE: "production" as const,
  AWS_REGION: "us-east-1",
  DATABASE_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:rds",
  DATABASE_URL: undefined,
};

describe("resolveDatabaseUrl", () => {
  it("prioriza DATABASE_URL sin consultar Secrets Manager", async () => {
    const send = vi.fn();

    await expect(
      resolveDatabaseUrl(
        { ...baseConfiguration, DATABASE_URL: "postgresql://direct/database" },
        { send },
      ),
    ).resolves.toBe("postgresql://direct/database");
    expect(send).not.toHaveBeenCalled();
  });

  it("construye una URL PostgreSQL TLS desde el secreto generado por RDS", async () => {
    const send = vi.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        dbname: "bus_impl",
        host: "cluster.internal",
        password: "p@ss/word",
        port: 5432,
        username: "bus_impl_admin",
      }),
    });

    const url = new URL(await resolveDatabaseUrl(baseConfiguration, { send }));

    expect(url.hostname).toBe("cluster.internal");
    expect(url.pathname).toBe("/bus_impl");
    expect(url.port).toBe("5432");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.username).toBe("bus_impl_admin");
    expect(send).toHaveBeenCalledWith(expect.any(GetSecretValueCommand));
  });

  it("solo permite fallback localhost en APP_STAGE local", async () => {
    const localUrl = new URL(
      await resolveDatabaseUrl({
        APP_STAGE: "local",
        AWS_REGION: "us-east-1",
        DATABASE_SECRET_ARN: undefined,
        DATABASE_URL: undefined,
      }),
    );
    expect(localUrl.hostname).toBe("127.0.0.1");
    expect(localUrl.pathname).toBe("/bus_impl");

    await expect(
      resolveDatabaseUrl({ ...baseConfiguration, DATABASE_SECRET_ARN: undefined }),
    ).rejects.toThrow("obligatorio fuera de local");
  });

  it("falla cerrado ante secretos vacios o malformados", async () => {
    await expect(
      resolveDatabaseUrl(baseConfiguration, {
        send: vi.fn().mockResolvedValue({ SecretString: "{}" }),
      }),
    ).rejects.toThrow("No se pudo resolver la conexion PostgreSQL");
  });
});
