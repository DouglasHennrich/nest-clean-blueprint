import { Result } from '@/@shared/classes/result';

export interface IUploadFileDtoModel {
  /** Logical bucket / folder. Map to your concrete S3 buckets in the provider. */
  bucket: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

export interface IUploadResultModel {
  key: string;
  url: string;
  bucket: string;
  storageId: string;
  fileId: string;
}

export interface IGetUrlResultModel {
  url: string;
  expiresIn: number;
}

export interface IGetFileBufferResultModel {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface IStorageOptionsModel {
  storageId: string;
}

export abstract class TUploadProvider {
  abstract uploadFile(dto: IUploadFileDtoModel): Promise<Result<IUploadResultModel>>;
  abstract getFileUrl(payload: IStorageOptionsModel): Promise<Result<IGetUrlResultModel>>;
  abstract getFileBuffer(payload: IStorageOptionsModel): Promise<Result<IGetFileBufferResultModel>>;
  abstract deleteFile(payload: IStorageOptionsModel): Promise<Result<void>>;
}

export const UPLOAD_PROVIDER_OPTIONS = 'UPLOAD_PROVIDER_OPTIONS';

export interface IUploadProviderOptionsModel {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultBucket: string;
  /** Pre-signed URL TTL in seconds. */
  signedUrlExpiresIn?: number;
  /** GCS project id. Only used by GcsStorageProvider. */
  gcsProjectId?: string;
  /** Path to a GCS service-account JSON key file. Only used by GcsStorageProvider. */
  gcsKeyFile?: string;
}
