import { Result } from "@/@shared/classes/result";

export interface IUploadFileDto {
  /** Logical bucket / folder. Map to your concrete S3 buckets in the provider. */
  bucket: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

export interface IUploadResult {
  key: string;
  url: string;
  bucket: string;
  storageId: string;
  fileId: string;
}

export interface IGetUrlResult {
  url: string;
  expiresIn: number;
}

export interface IGetFileBufferResult {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface IStorageOptions {
  storageId: string;
}

export abstract class TUploadProvider {
  abstract uploadFile(dto: IUploadFileDto): Promise<Result<IUploadResult>>;
  abstract getFileUrl(payload: IStorageOptions): Promise<Result<IGetUrlResult>>;
  abstract getFileBuffer(
    payload: IStorageOptions,
  ): Promise<Result<IGetFileBufferResult>>;
  abstract deleteFile(payload: IStorageOptions): Promise<Result<void>>;
}

export const UPLOAD_PROVIDER_OPTIONS = "UPLOAD_PROVIDER_OPTIONS";

export interface IUploadProviderOptions {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultBucket: string;
  /** Pre-signed URL TTL in seconds. */
  signedUrlExpiresIn?: number;
}
