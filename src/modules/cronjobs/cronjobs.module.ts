import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@/@shared/modules/cache/cache.module";
import { CleanupExpiredRecordsCronService } from "./services/cleanup-expired-records-cron.service";

/**
 * CronjobsModule
 *
 * Registers all scheduled tasks. Uses the global CacheModule (already global,
 * so import here is fine for explicit documentation — NestJS deduplicates global imports).
 *
 * Adding a new cron job:
 * 1. Create src/modules/cronjobs/services/my-task-cron.service.ts
 * 2. Add the service to the providers[] array below
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule, // for TDataCacheService — distributed lock support
  ],
  providers: [CleanupExpiredRecordsCronService],
})
export class CronjobsModule {}
