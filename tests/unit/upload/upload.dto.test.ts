import { uploadCreatePresignedUrlRequestDto } from "@/upload/application/dtos/upload-create-presigned-url.request.dto";

describe("uploadCreatePresignedUrlRequestDto", () => {
  it("acepta un documento valido para subir directo a S3", () => {
    const result = uploadCreatePresignedUrlRequestDto.safeParse({
      file_name: "reporte.csv",
      mime_type: "text/csv",
      purpose: "document",
      size_bytes: 1024,
    });

    expect(result.success).toBe(true);
  });

  it("rechaza rutas en file_name para evitar path traversal y PII en keys", () => {
    const result = uploadCreatePresignedUrlRequestDto.safeParse({
      file_name: "../secret.csv",
      mime_type: "text/csv",
      purpose: "document",
      size_bytes: 1024,
    });

    expect(result.success).toBe(false);
  });

  it("rechaza MIME no permitido para el proposito", () => {
    const result = uploadCreatePresignedUrlRequestDto.safeParse({
      file_name: "avatar.pdf",
      mime_type: "application/pdf",
      purpose: "avatar",
      size_bytes: 1024,
    });

    expect(result.success).toBe(false);
  });
});
