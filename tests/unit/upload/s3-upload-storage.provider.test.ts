import { ServiceUnavailableException } from "@nestjs/common";
import { S3UploadStorageProvider } from "@/upload/infrastructure/s3/s3-upload-storage.provider";

const mocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.getSignedUrl }));
vi.mock("@/shared/infrastructure/aws/s3.client", () => ({
  createS3Client: () => ({ destroy: mocks.destroy }),
}));

describe("S3UploadStorageProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("genera URL con headers de cifrado y cache firmados", async () => {
    mocks.getSignedUrl.mockResolvedValue("https://s3.local/signed");
    const provider = new S3UploadStorageProvider();

    await expect(
      provider.createPresignedUpload({
        bucket: "rimac-uploads",
        cache_control: "private, no-store",
        expires_in: 900,
        key: "uploads/document/10/file.pdf",
        mime_type: "application/pdf",
      }),
    ).resolves.toEqual({
      bucket: "rimac-uploads",
      cache_control: "private, no-store",
      expires_in: 900,
      headers: {
        "cache-control": "private, no-store",
        "content-type": "application/pdf",
        "x-amz-server-side-encryption": "AES256",
      },
      key: "uploads/document/10/file.pdf",
      method: "PUT",
      url: "https://s3.local/signed",
    });
    expect(mocks.getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 900,
    });
  });

  it("convierte fallos del SDK en error estable y destruye el cliente", async () => {
    mocks.getSignedUrl.mockRejectedValue(new Error("AWS unavailable"));
    const provider = new S3UploadStorageProvider();

    await expect(
      provider.createPresignedUpload({
        bucket: "rimac-uploads",
        cache_control: "private, no-store",
        expires_in: 900,
        key: "uploads/file.pdf",
        mime_type: "application/pdf",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    provider.onModuleDestroy();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
