import type { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";
import type {
  CreatePresignedUploadInput,
  IUploadStorageProvider,
} from "@/upload/application/providers/upload-storage.provider.interface";
import { UploadApplicationService } from "@/upload/application/service/upload.application-service";

describe("UploadApplicationService", () => {
  it("crea una URL presignada sin exponer el nombre original del archivo en el key", async () => {
    const storageProvider: IUploadStorageProvider = {
      createPresignedUpload: vi.fn(async (input: CreatePresignedUploadInput) => ({
        bucket: input.bucket,
        cache_control: input.cache_control,
        expires_in: input.expires_in,
        headers: {
          "cache-control": input.cache_control,
          "content-type": input.mime_type,
          "x-amz-server-side-encryption": "AES256",
        },
        key: input.key,
        method: "PUT" as const,
        url: `https://s3.local/${input.bucket}/${input.key}?signature=test`,
      })),
    };
    const configService = createUploadConfigService({
      UPLOAD_BUCKET_NAME: "rimac-test-uploads",
      UPLOAD_KEY_PREFIX: "uploads",
      UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS: 900,
    });
    const service = new UploadApplicationService(storageProvider, configService);

    const response = await service.createPresignedUrl(77, {
      file_name: "dni-cliente.pdf",
      mime_type: "application/pdf",
      purpose: "document",
      size_bytes: 2048,
    });

    expect(response.success).toBe(true);
    expect(response.upload.bucket).toBe("rimac-test-uploads");
    expect(response.upload.cache_control).toBe("private, no-store");
    expect(response.upload.expires_in).toBe(900);
    expect(response.upload.headers["content-type"]).toBe("application/pdf");
    expect(response.upload.key).toMatch(
      /^uploads\/document\/77\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/i,
    );
    expect(response.upload.key).not.toContain("dni-cliente");
    expect(storageProvider.createPresignedUpload).toHaveBeenCalledWith({
      bucket: "rimac-test-uploads",
      cache_control: "private, no-store",
      expires_in: 900,
      key: response.upload.key,
      mime_type: "application/pdf",
    });
  });

  it("usa cache largo para imagenes versionadas de producto", async () => {
    const storageProvider: IUploadStorageProvider = {
      createPresignedUpload: vi.fn(async (input: CreatePresignedUploadInput) => ({
        bucket: input.bucket,
        cache_control: input.cache_control,
        expires_in: input.expires_in,
        headers: {},
        key: input.key,
        method: "PUT" as const,
        url: `https://s3.local/${input.bucket}/${input.key}?signature=test`,
      })),
    };
    const configService = createUploadConfigService({
      UPLOAD_BUCKET_NAME: "rimac-test-uploads",
      UPLOAD_KEY_PREFIX: "cdn-assets",
      UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS: 300,
    });
    const service = new UploadApplicationService(storageProvider, configService);

    const response = await service.createPresignedUrl(15, {
      file_name: "producto.webp",
      mime_type: "image/webp",
      purpose: "product_image",
      size_bytes: 500_000,
    });

    expect(response.upload.cache_control).toBe("private, max-age=604800, immutable");
    expect(response.upload.key).toMatch(/^cdn-assets\/product_image\/15\//);
  });
});

function createUploadConfigService(
  values: Record<string, number | string>,
): ConfigService<EnvironmentVariables, true> {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService<EnvironmentVariables, true>;
}
