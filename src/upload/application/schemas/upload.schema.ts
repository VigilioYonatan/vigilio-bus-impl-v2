import { z } from "zod";

export const uploadPurposeSchema = z.enum(["avatar", "document", "product_image", "evidence"]);

export const uploadMimeTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/zip",
  "text/csv",
]);

export type UploadPurposeSchema = z.infer<typeof uploadPurposeSchema>;
export type UploadMimeTypeSchema = z.infer<typeof uploadMimeTypeSchema>;

export type UploadRuleSchema = {
  max_size_bytes: number;
  mime_types: readonly UploadMimeTypeSchema[];
  cache_control: string;
};

export const UPLOAD_RULES = {
  avatar: {
    cache_control: "private, max-age=86400",
    max_size_bytes: 2 * 1024 * 1024,
    mime_types: ["image/jpeg", "image/png", "image/webp"],
  },
  document: {
    cache_control: "private, no-store",
    max_size_bytes: 50 * 1024 * 1024,
    mime_types: ["application/pdf", "application/zip", "text/csv"],
  },
  evidence: {
    cache_control: "private, no-store",
    max_size_bytes: 25 * 1024 * 1024,
    mime_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
  product_image: {
    cache_control: "private, max-age=604800, immutable",
    max_size_bytes: 5 * 1024 * 1024,
    mime_types: ["image/jpeg", "image/png", "image/webp"],
  },
} satisfies Record<UploadPurposeSchema, UploadRuleSchema>;

export const uploadCreatePresignedUrlSchema = z
  .object({
    file_name: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine((value) => !/[\\/]/.test(value), {
        message: "file_name no debe incluir rutas",
      }),
    mime_type: uploadMimeTypeSchema,
    purpose: uploadPurposeSchema,
    size_bytes: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
  })
  .superRefine((body, context) => {
    const rule = UPLOAD_RULES[body.purpose];
    const allowed_mime_types: readonly UploadMimeTypeSchema[] = rule.mime_types;

    if (!allowed_mime_types.includes(body.mime_type)) {
      context.addIssue({
        code: "custom",
        message: `mime_type no permitido para ${body.purpose}`,
        path: ["mime_type"],
      });
    }

    if (body.size_bytes > rule.max_size_bytes) {
      context.addIssue({
        code: "custom",
        message: `size_bytes excede el limite de ${rule.max_size_bytes} bytes`,
        path: ["size_bytes"],
      });
    }
  });

export type UploadCreatePresignedUrlSchema = z.infer<typeof uploadCreatePresignedUrlSchema>;

export function fileExtensionFromMime(mime_type: UploadMimeTypeSchema): string {
  const extensions = {
    "application/pdf": "pdf",
    "application/zip": "zip",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "text/csv": "csv",
  } satisfies Record<UploadMimeTypeSchema, string>;

  return extensions[mime_type];
}
