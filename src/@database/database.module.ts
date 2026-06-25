import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TEnvService } from '@/modules/env/services/env.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [TEnvService],
      useFactory: (envService: TEnvService) => {
        // const ignoreMigrations = envService.get('DATABASE_IGNORE_MIGRATIONS');

        return {
          type: 'postgres',
          host: envService.get('DATABASE_HOST'),
          port: envService.get('DATABASE_PORT'),
          username: envService.get('DATABASE_USER'),
          password: envService.get('DATABASE_PASSWORD'),
          database: envService.get('DATABASE_DB_NAME'),
          timezone: 'UTC',
          extra: {
            timezone: 'UTC',
            connectionTimeZone: 'UTC',
            max: 30,
            min: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          },
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
