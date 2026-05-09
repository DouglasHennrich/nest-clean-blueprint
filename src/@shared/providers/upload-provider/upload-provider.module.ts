import { Module } from "@nestjs/common";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import {
  IUploadProviderOptions,
  TUploadProvider,
  UPLOAD_PROVIDER_OPTIONS,
} from "./models/upload-provider.struct";
import { AwsS3StorageProvider } from "./providers/aws-s3.provider";

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: UPLOAD_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IUploadProviderOptions => ({
        region: env.get("AWS_REGION"),
        accessKeyId: env.get("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env.get("AWS_SECRET_ACCESS_KEY"),
        defaultBucket: env.get("AWS_S3_BUCKET") ?? "app-default-bucket",
        signedUrlExpiresIn: 3600,
      }),
      inject: [TEnvService],
    },
    { provide: TUploadProvider, useClass: AwsS3StorageProvider },
  ],
  exports: [TUploadProvider],
})
export class UploadProviderModule {}
