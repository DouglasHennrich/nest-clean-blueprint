import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { EnvModule } from './modules/env/env.module';

import { LoggerModule } from './@shared/modules/logger/logger.module';
import { CacheModule } from './@shared/modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { AuthenticateModule } from './modules/authenticate/authenticate.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { QueuesModule } from './modules/queues/queues.module';
import { CronjobsModule } from './modules/cronjobs/cronjobs.module';
import { PublicRateLimitGuard } from './@shared/guards/public-rate-limit.guard';

import { MailProviderModule } from './@shared/providers/mail-provider/mail-provider.module';
import { EncryptDecryptProviderModule } from './@shared/providers/encrypt-decrypt-provider/encrypt-decrypt-provider.module';
import { UploadProviderModule } from './@shared/providers/upload-provider/upload-provider.module';

import { RequestIdMiddleware } from './@shared/middlewares/request-id.middleware';
import { RequestLoggerMiddleware } from './@shared/middlewares/request-logger.middleware';

import { OrdersModule } from './modules/_example_orders/orders.module';
import { AuditInterceptor } from './modules/backoffice/interceptors/backoffice-audit.interceptor';
import { ResponseLogInterceptor } from './@shared/interceptors/response-log.interceptor';
import { CreateRequestLogEntityMiddleware } from './@shared/middlewares/create-request-log-entity.middleware';
import { DatabaseModule } from './@database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './modules/env/env';
import { RequestLogHelper } from './@shared/helpers/request-log.helper';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EnvModule,
    LoggerModule,
    CacheModule,
    EventEmitterModule.forRoot({ wildcard: false, global: true }),
    DatabaseModule,
    MailProviderModule,
    EncryptDecryptProviderModule,
    UploadProviderModule,
    AuthenticateModule,
    AuthorizationModule,
    QueuesModule,
    CronjobsModule,
    OrdersModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PublicRateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    RequestIdMiddleware,
    RequestLoggerMiddleware,
    CreateRequestLogEntityMiddleware,
    RequestLogHelper,
  ],
  exports: [RequestLogHelper],
})
export class AppModule {}
