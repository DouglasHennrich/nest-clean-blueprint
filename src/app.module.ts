import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { EnvModule } from "./modules/env/env.module";
import { TEnvService } from "./modules/env/services/env.service";

import { MailProviderModule } from "./@shared/providers/mail-provider/mail-provider.module";
import { EncryptDecryptProviderModule } from "./@shared/providers/encrypt-decrypt-provider/encrypt-decrypt-provider.module";
import { UploadProviderModule } from "./@shared/providers/upload-provider/upload-provider.module";

import { RequestIdMiddleware } from "./@shared/middlewares/request-id.middleware";

import { OrdersModule } from "./modules/_example_orders/orders.module";

@Module({
  imports: [
    EnvModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (env: TEnvService) => ({
        type: "postgres",
        host: env.get("DATABASE_HOST"),
        port: env.get("DATABASE_PORT"),
        username: env.get("DATABASE_USERNAME"),
        password: env.get("DATABASE_PASSWORD"),
        database: env.get("DATABASE_NAME"),
        autoLoadEntities: true,
        synchronize: false, // ALWAYS false — manual migrations only.
      }),
    }),
    MailProviderModule,
    EncryptDecryptProviderModule,
    UploadProviderModule,
    OrdersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // RequestIdMiddleware MUST run first so AsyncContext is seeded for everything else.
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
