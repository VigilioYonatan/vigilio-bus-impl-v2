export type CreatePresignedUploadInput = {
  bucket: string;
  cache_control: string;
  expires_in: number;
  key: string;
  mime_type: string;
};

export type PresignedUpload = {
  bucket: string;
  cache_control: string;
  expires_in: number;
  headers: Record<string, string>;
  key: string;
  method: "PUT";
  url: string;
};

export interface IUploadStorageProvider {
  createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload>;
}
