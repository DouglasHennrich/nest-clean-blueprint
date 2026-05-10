import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import basicAuth from "express-basic-auth";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import { RedisConnectionHelper } from "@/@shared/helpers/redis-connection.helper";
import {
  TExampleSchedulerService,
  ExampleSchedulerService,
} from "./services/example-scheduler.service";
import { ExampleProcessor } from "./processors/example.processor";

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
      name: "example-queue",
    }),

    /// Bull Board UI
    BullBoardModule.forRootAsync({
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (env: TEnvService) => ({
        route: "/admin/queues",
        adapter: ExpressAdapter,
        middleware: basicAuth({
          challenge: true,
          users: {
            [env.get("BULL_BOARD_USERNAME") ?? "admin"]: env.get(
              "BULL_BOARD_PASSWORD",
            ),
          },
        }),
      }),
    }),
    BullBoardModule.forFeature({
      name: "example-queue",
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    {
      provide: TExampleSchedulerService,
      useClass: ExampleSchedulerService,
    },
    ExampleProcessor,
  ],
  exports: [TExampleSchedulerService],
})
export class QueuesModule {}
