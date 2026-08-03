import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "@/shared/infrastructure/config/environment.schema";
import type { UploadCreatePresignedUrlRequestDto } from "../dtos/upload-create-presigned-url.request.dto";
import type { UploadCreatePresignedUrlResponseDto } from "../dtos/upload-create-presigned-url.response.dto";
import type { IUploadStorageProvider } from "../providers/upload-storage.provider.interface";
import { UPLOAD_STORAGE_PROVIDER } from "../providers/upload-storage.provider.token";
import { fileExtensionFromMime, UPLOAD_RULES } from "../schemas/upload.schema";

@Injectable()
export class UploadApplicationService {
  private readonly logger = new Logger(UploadApplicationService.name);

  constructor(
    @Inject(UPLOAD_STORAGE_PROVIDER)
    private readonly storageProvider: IUploadStorageProvider,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createPresignedUrl(
    user_id: number,
    body: UploadCreatePresignedUrlRequestDto,
  ): Promise<UploadCreatePresignedUrlResponseDto> {
    const bucket = this.configService.get("UPLOAD_BUCKET_NAME", { infer: true });
    const expires_in = this.configService.get("UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS", {
      infer: true,
    });
    const key_prefix = this.configService.get("UPLOAD_KEY_PREFIX", { infer: true });
    const rule = UPLOAD_RULES[body.purpose];
    const extension = fileExtensionFromMime(body.mime_type);
    const key = this.buildObjectKey({
      extension,
      key_prefix,
      purpose: body.purpose,
      user_id,
    });

    const upload = await this.storageProvider.createPresignedUpload({
      bucket,
      cache_control: rule.cache_control,
      expires_in,
      key,
      mime_type: body.mime_type,
    });

    this.logger.log(
      {
        action: "upload.create_presigned_url",
        cache_control: upload.cache_control,
        max_size_bytes: rule.max_size_bytes,
        purpose: body.purpose,
        user_id,
      },
      "Created S3 presigned upload URL",
    );

    return {
      success: true,
      upload: {
        ...upload,
        max_size_bytes: rule.max_size_bytes,
        purpose: body.purpose,
      },
    };
  }

  private buildObjectKey(input: {
    extension: string;
    key_prefix: string;
    purpose: string;
    user_id: number;
  }): string {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const prefix = input.key_prefix.replace(/^\/+|\/+$/g, "");

    return `${prefix}/${input.purpose}/${input.user_id}/${year}/${month}/${randomUUID()}.${input.extension}`;
  }
}
