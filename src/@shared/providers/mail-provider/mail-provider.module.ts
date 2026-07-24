import { Module } from '@nestjs/common';
import { EnvModule } from '@/modules/env/env.module';
import { TEnvService } from '@/modules/env/services/env.service';
import {
  IMailProviderOptionsModel,
  MAIL_PROVIDER_OPTIONS,
  TMailProvider,
} from './models/mail-provider.struct';
import { AwsSesMailProvider } from './providers/aws-ses.provider';

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: MAIL_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IMailProviderOptionsModel => ({
        region: env.get('EXTERNAL_AWS_SES_REGION'),
        accessKeyId: env.get('EXTERNAL_AWS_SES_ACCESS_KEY_ID'),
        secretAccessKey: env.get('EXTERNAL_AWS_SES_SECRET_ACCESS_KEY'),
        defaultFrom: env.get('EXTERNAL_AWS_SES_FROM_EMAIL') ?? 'noreply@example.com',
      }),
      inject: [TEnvService],
    },
    { provide: TMailProvider, useClass: AwsSesMailProvider },
  ],
  exports: [TMailProvider],
})
export class MailProviderModule {}
