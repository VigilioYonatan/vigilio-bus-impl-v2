import { Module } from "@nestjs/common";
import { UPLOAD_STORAGE_PROVIDER } from "./application/providers/upload-storage.provider.token";
import { UploadApplicationService } from "./application/service/upload.application-service";
import { UploadController } from "./infrastructure/http/controllers/upload.controller";
import { S3UploadStorageProvider } from "./infrastructure/s3/s3-upload-storage.provider";

@Module({
  controllers: [UploadController],
  providers: [
    UploadApplicationService,
    {
      provide: UPLOAD_STORAGE_PROVIDER,
      useClass: S3UploadStorageProvider,
    },
  ],
})
export class UploadModule {}
