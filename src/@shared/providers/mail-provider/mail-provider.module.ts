import { Module } from "@nestjs/common";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import {
  IMailProviderOptions,
  MAIL_PROVIDER_OPTIONS,
  TMailProvider,
} from "./models/mail-provider.struct";
import { AwsSesMailProvider } from "./providers/aws-ses.provider";

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: MAIL_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IMailProviderOptions => ({
        region: env.get("AWS_REGION"),
        accessKeyId: env.get("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env.get("AWS_SECRET_ACCESS_KEY"),
        defaultFrom: env.get("AWS_SES_FROM_EMAIL") ?? "noreply@example.com",
      }),
      inject: [TEnvService],
    },
    { provide: TMailProvider, useClass: AwsSesMailProvider },
  ],
  exports: [TMailProvider],
})
export class MailProviderModule {}
