import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, type OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import { createS3Client } from "@/shared/infrastructure/aws/s3.client";
import type {
  CreatePresignedUploadInput,
  IUploadStorageProvider,
  PresignedUpload,
} from "@/upload/application/providers/upload-storage.provider.interface";

@Injectable()
export class S3UploadStorageProvider implements IUploadStorageProvider, OnModuleDestroy {
  private readonly client = createS3Client();

  async createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload> {
    const headers = {
      "cache-control": input.cache_control,
      "content-type": input.mime_type,
      "x-amz-server-side-encryption": "AES256",
    };

    const command = new PutObjectCommand({
      Bucket: input.bucket,
      CacheControl: input.cache_control,
      ContentType: input.mime_type,
      Key: input.key,
      ServerSideEncryption: "AES256",
    });

    let url: string;

    try {
      url = await getSignedUrl(this.client, command, {
        expiresIn: input.expires_in,
      });
    } catch {
      throw new ServiceUnavailableException("No se pudo generar la URL presignada de S3.");
    }

    return {
      bucket: input.bucket,
      cache_control: input.cache_control,
      expires_in: input.expires_in,
      headers,
      key: input.key,
      method: "PUT",
      url,
    };
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
