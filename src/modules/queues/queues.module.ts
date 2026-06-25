import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { EnvModule } from '@/modules/env/env.module';
import { TEnvService } from '@/modules/env/services/env.service';
import { RedisConnectionHelper } from '@/@shared/helpers/redis-connection.helper';
import {
  TExampleSchedulerService,
  ExampleSchedulerService,
} from './services/example-scheduler.service';
import { ExampleProcessor } from './processors/example.processor';
import {
  REQUEST_LOG_REDIS_CLIENT,
  RequestLogFlushSchedulerService,
  TRequestLogFlushSchedulerService,
} from './services/request-log-flush-scheduler.service';
import { RequestLogFlushProcessor } from './processors/request-log-flush.processor';

@Module({
  imports: [
    /// BullMQ root configuration — shared Redis connection for all queues
    BullModule.forRootAsync({
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (env: TEnvService) => ({
        connection: RedisConnectionHelper.createBullMQConnection(env),
      }),
    }),

    /// Queue registrations
    BullModule.registerQueue({
      name: 'example-queue',
    }),
    BullModule.registerQueue({
      name: 'request-log-flush',
    }),

    /// Bull Board UI
    BullBoardModule.forRootAsync({
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (envService: TEnvService) => ({
        route: '/admin/queues',
        adapter: ExpressAdapter,
        middleware: basicAuth({
          challenge: true,
          users: {
            [envService.get('SECRET_BULL_BOARD_USERNAME')]: envService.get(
              'SECRET_BULL_BOARD_PASSWORD',
            ),
          },
        }),
      }),
    }),
    BullBoardModule.forFeature({
      name: 'example-queue',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'request-log-flush',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    /// //////////////////////////
    //  Redis Client (for direct Redis operations)
    /// //////////////////////////
    {
      provide: REQUEST_LOG_REDIS_CLIENT,
      useFactory: (envService: TEnvService) =>
        RedisConnectionHelper.createDirectRedisClient(envService),
      inject: [TEnvService],
    },

    {
      provide: TExampleSchedulerService,
      useClass: ExampleSchedulerService,
    },

    /// //////////////////////////
    //  Processors
    /// //////////////////////////
    RequestLogFlushProcessor,
    ExampleProcessor,

    /// //////////////////////////
    //  Services
    /// //////////////////////////
    {
      provide: TRequestLogFlushSchedulerService,
      useClass: RequestLogFlushSchedulerService,
    },
  ],
  exports: [
    /// //////////////////////////
    //  BullMQ
    /// //////////////////////////
    BullModule,

    /// //////////////////////////
    //  Services
    /// //////////////////////////
    TRequestLogFlushSchedulerService,
    TExampleSchedulerService,
  ],
})
export class QueuesModule {}
