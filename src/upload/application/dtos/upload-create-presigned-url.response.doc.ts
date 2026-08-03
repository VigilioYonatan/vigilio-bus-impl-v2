import { createZodDto } from "nestjs-zod";
import { uploadCreatePresignedUrlResponseDto } from "./upload-create-presigned-url.response.dto";

export class UploadCreatePresignedUrlResponseDocDto extends createZodDto(
  uploadCreatePresignedUrlResponseDto,
) {}
