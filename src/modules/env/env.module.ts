import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envSchema } from "./env";
import { EnvService, TEnvService } from "./services/env.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => envSchema.parse(raw),
    }),
  ],
  providers: [{ provide: TEnvService, useClass: EnvService }],
  exports: [TEnvService],
})
export class EnvModule {}
