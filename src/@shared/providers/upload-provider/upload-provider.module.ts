import { Module } from '@nestjs/common';
import { EnvModule } from '@/modules/env/env.module';
import { TEnvService } from '@/modules/env/services/env.service';
import {
  IUploadProviderOptionsModel,
  TUploadProvider,
  UPLOAD_PROVIDER_OPTIONS,
} from './models/upload-provider.struct';
import { AwsS3StorageProvider } from './providers/aws-s3.provider';
import { GcsStorageProvider } from './providers/gcs.provider';

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: UPLOAD_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IUploadProviderOptionsModel => ({
        region: env.get('EXTERNAL_AWS_S3_REGION'),
        accessKeyId: env.get('EXTERNAL_AWS_ACCESS_KEY_ID'),
        secretAccessKey: env.get('EXTERNAL_AWS_SECRET_ACCESS_KEY'),
        defaultBucket:
          env.get('UPLOAD_PROVIDER') === 'gcs'
            ? (env.get('EXTERNAL_GCS_BUCKET') ??
              env.get('EXTERNAL_AWS_S3_BUCKET') ??
              'app-default-bucket')
            : (env.get('EXTERNAL_AWS_S3_BUCKET') ?? 'app-default-bucket'),
        signedUrlExpiresIn: 3600,
        gcsProjectId: env.get('EXTERNAL_GCS_PROJECT_ID'),
        gcsKeyFile: env.get('EXTERNAL_GCS_KEY_FILE'),
      }),
      inject: [TEnvService],
    },
    {
      provide: TUploadProvider,
      useFactory: (options: IUploadProviderOptionsModel, env: TEnvService): TUploadProvider =>
        env.get('UPLOAD_PROVIDER') === 'gcs'
          ? new GcsStorageProvider(options)
          : new AwsS3StorageProvider(options),
      inject: [UPLOAD_PROVIDER_OPTIONS, TEnvService],
    },
  ],
  exports: [TUploadProvider],
})
export class UploadProviderModule {}
