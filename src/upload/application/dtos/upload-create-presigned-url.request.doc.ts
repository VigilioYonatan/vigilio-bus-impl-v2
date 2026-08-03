import { createZodDto } from "nestjs-zod";
import { uploadCreatePresignedUrlRequestDto } from "./upload-create-presigned-url.request.dto";

export class UploadCreatePresignedUrlRequestDocDto extends createZodDto(
  uploadCreatePresignedUrlRequestDto,
) {}
