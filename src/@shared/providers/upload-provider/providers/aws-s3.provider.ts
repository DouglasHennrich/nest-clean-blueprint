import { Inject, Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { Result } from "@/@shared/classes/result";
import { DefaultException } from "@/@shared/errors/abstract-application-exception";
import {
  IGetFileBufferResult,
  IGetUrlResult,
  IStorageOptions,
  IUploadFileDto,
  IUploadProviderOptions,
  IUploadResult,
  TUploadProvider,
  UPLOAD_PROVIDER_OPTIONS,
} from "../models/upload-provider.struct";

/**
 * AwsS3StorageProvider
 *
 * Stores files in AWS S3. storageId is encoded as `<bucket>/<key>` so a single
 * string round-trips through the application without needing a separate field.
 */
@Injectable()
export class AwsS3StorageProvider implements TUploadProvider {
  private client: S3Client;
  private signedUrlExpiresIn: number;

  constructor(
    @Inject(UPLOAD_PROVIDER_OPTIONS)
    private readonly options: IUploadProviderOptions,
  ) {
    this.client = new S3Client({
      region: this.options.region,
      credentials:
        this.options.accessKeyId && this.options.secretAccessKey
          ? {
              accessKeyId: this.options.accessKeyId,
              secretAccessKey: this.options.secretAccessKey,
            }
          : undefined,
    });
    this.signedUrlExpiresIn = this.options.signedUrlExpiresIn ?? 3600;
  }

  private parseStorageId(storageId: string): { bucket: string; key: string } {
    const idx = storageId.indexOf("/");
    if (idx <= 0) {
      return { bucket: this.options.defaultBucket, key: storageId };
    }
    return {
      bucket: storageId.slice(0, idx),
      key: storageId.slice(idx + 1),
    };
  }

  async uploadFile(dto: IUploadFileDto): Promise<Result<IUploadResult>> {
    try {
      const fileId = uuidv4();
      const ext = dto.file.originalname.includes(".")
        ? dto.file.originalname.split(".").pop()
        : "";
      const key = ext
        ? `${dto.bucket}/${fileId}.${ext}`
        : `${dto.bucket}/${fileId}`;
      const targetBucket = this.options.defaultBucket;

      await this.client.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: key,
          Body: dto.file.buffer,
          ContentType: dto.file.mimetype,
        }),
      );

      const storageId = `${targetBucket}/${key}`;
      return Result.success({
        key,
        url: `https://${targetBucket}.s3.${this.options.region}.amazonaws.com/${key}`,
        bucket: dto.bucket,
        storageId,
        fileId,
      });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to upload file: ${error.message}`,
          "UploadException",
          500,
        ),
      );
    }
  }

  async getFileUrl(payload: IStorageOptions): Promise<Result<IGetUrlResult>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: this.signedUrlExpiresIn },
      );
      return Result.success({ url, expiresIn: this.signedUrlExpiresIn });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to sign URL: ${error.message}`,
          "UploadSignUrlException",
          500,
        ),
      );
    }
  }

  async getFileBuffer(
    payload: IStorageOptions,
  ): Promise<Result<IGetFileBufferResult>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      const obj = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of obj.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      return Result.success({
        buffer: Buffer.concat(chunks),
        mimeType: head.ContentType ?? "application/octet-stream",
        size: head.ContentLength ?? 0,
      });
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to read file: ${error.message}`,
          "UploadReadException",
          500,
        ),
      );
    }
  }

  async deleteFile(payload: IStorageOptions): Promise<Result<void>> {
    try {
      const { bucket, key } = this.parseStorageId(payload.storageId);
      await this.client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
      return Result.success();
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to delete file: ${error.message}`,
          "UploadDeleteException",
          500,
        ),
      );
    }
  }
}
