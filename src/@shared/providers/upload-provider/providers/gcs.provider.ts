import { Inject, Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@/@shared/classes/result';
import { DefaultException } from '@/@shared/errors/abstract-application-exception';
import {
  IGetFileBufferResultModel,
  IGetUrlResultModel,
  IStorageOptionsModel,
  IUploadFileDtoModel,
  IUploadProviderOptionsModel,
  IUploadResultModel,
  TUploadProvider,
  UPLOAD_PROVIDER_OPTIONS,
} from '../models/upload-provider.struct';

/**
 * GcsStorageProvider
 *
 * Stores files in Google Cloud Storage. storageId is encoded as `<bucket>/<key>`
 * so a single string round-trips through the application without needing a
 * separate field, mirroring AwsS3StorageProvider.
 */
@Injectable()
export class GcsStorageProvider implements TUploadProvider {
  private client: Storage;
  private signedUrlExpiresIn: number;

  constructor(
    @Inject(UPLOAD_PROVIDER_OPTIONS)
    private readonly options: IUploadProviderOptionsModel,
  ) {
    this.client = new Storage({
      projectId: this.options.gcsProjectId,
      keyFilename: this.options.gcsKeyFile,
    });
    this.signedUrlExpiresIn = this.options.signedUrlExpiresIn ?? 3600;
  }

  private parseStorageId(storageId: string): { bucket: string; key: string } {
    const idx = storageId.indexOf('/');
    if (idx <= 0) {
      return { bucket: this.options.defaultBucket, key: storageId };
    }
    return {
      bucket: storageId.slice(0, idx),
      key: storageId.slice(idx + 1),
    };
  }

  async uploadFile(dto: IUploadFileDtoModel): Promise<Result<IUploadResultModel>> {
    try {
      const fileId = uuidv4();
      const ext = dto.file.originalname.includes('.') ? dto.file.originalname.split('.').pop() : '';
      const key = ext ? `${dto.bucket}/${fileId}.${ext}` : `${dto.bucket}/${fileId}`;
      const targetBucket = this.options.defaultBucket;

      await this.client.bucket(targetBucket).file(key).save(dto.file.buffer, {
        contentType: dto.file.mimetype,
      });

      const storageId = `${targetBucket}/${key}`;
      return Result.success({
        key,
        url: `https://storage.googleapis.com/${targetBucket}/${key}`,
        bucket: dto.bucket,
        storageId,
        fileId,
      });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(`Failed to upload file: ${error.message}`, 'UploadException', 500),
      );
    }
  }

  async getFileUrl(payload: IStorageOptionsModel): Promise<Result<IGetUrlResultModel>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      const [url] = await this.client
        .bucket(bucket)
        .file(key)
        .getSignedUrl({
          action: 'read',
          expires: Date.now() + this.signedUrlExpiresIn * 1000,
        });
      return Result.success({ url, expiresIn: this.signedUrlExpiresIn });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(`Failed to sign URL: ${error.message}`, 'UploadSignUrlException', 500),
      );
    }
  }

  async getFileBuffer(payload: IStorageOptionsModel): Promise<Result<IGetFileBufferResultModel>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      const file = this.client.bucket(bucket).file(key);
      const [metadata] = await file.getMetadata();
      const [buffer] = await file.download();
      return Result.success({
        buffer,
        mimeType: metadata.contentType ?? 'application/octet-stream',
        size: Number(metadata.size ?? 0),
      });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(`Failed to read file: ${error.message}`, 'UploadReadException', 500),
      );
    }
  }

  async deleteFile(payload: IStorageOptionsModel): Promise<Result<void>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      await this.client.bucket(bucket).file(key).delete();
      return Result.success();
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to delete file: ${error.message}`,
          'UploadDeleteException',
          500,
        ),
      );
    }
  }
}
