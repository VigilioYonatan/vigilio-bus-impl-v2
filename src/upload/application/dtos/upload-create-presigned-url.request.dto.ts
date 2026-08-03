import type { z } from "zod";
import { uploadCreatePresignedUrlSchema } from "../schemas/upload.schema";

export const uploadCreatePresignedUrlRequestDto = uploadCreatePresignedUrlSchema;

export type UploadCreatePresignedUrlRequestDto = z.infer<typeof uploadCreatePresignedUrlRequestDto>;
