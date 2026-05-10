import { Global, Module } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { createKeyv } from "@keyv/redis";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import { RedisConnectionHelper } from "@/@shared/helpers/redis-connection.helper";
import {
  TDataCacheService,
  DataCacheService,
} from "./services/data-cache.service";

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (env: TEnvService) => ({
        stores: [createKeyv(RedisConnectionHelper.createCacheRedisUrl(env))],
        ttl: 3600,
      }),
    }),
  ],
  providers: [
    {
      provide: TDataCacheService,
      useClass: DataCacheService,
    },
  ],
  exports: [NestCacheModule, TDataCacheService],
})
export class CacheModule {}
