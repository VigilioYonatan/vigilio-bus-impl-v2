import { z } from "zod";
import { uploadPurposeSchema } from "../schemas/upload.schema";

export const uploadCreatePresignedUrlResponseDto = z.object({
  success: z.literal(true),
  upload: z.object({
    bucket: z.string().min(1),
    cache_control: z.string().min(1),
    expires_in: z.number().int().positive().max(3600),
    headers: z.record(z.string(), z.string()),
    key: z.string().min(1),
    max_size_bytes: z.number().int().positive(),
    method: z.literal("PUT"),
    purpose: uploadPurposeSchema,
    url: z.url(),
  }),
});

export type UploadCreatePresignedUrlResponseDto = z.infer<
  typeof uploadCreatePresignedUrlResponseDto
>;
