import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CustomLogger, ILogger } from "@/@shared/classes/custom-logger";
import { TDataCacheService } from "@/@shared/modules/cache/services/data-cache.service";

const CLEANUP_LOCK_KEY = "cron:lock:cleanup-expired";
const CLEANUP_LOCK_TTL_SECONDS = 5 * 60; // 5 minutes max job duration

@Injectable()
export class CleanupExpiredRecordsCronService {
  public logger: ILogger = new CustomLogger(
    CleanupExpiredRecordsCronService.name,
  );

  constructor(private readonly cacheService: TDataCacheService) {}

  /**
   * Runs every hour. Protected by a distributed Redis lock so that
   * only one instance runs at a time in multi-pod deployments.
   *
   * Replace the TODO block with your actual cleanup logic
   * (e.g., calling a TypeORM repository to delete soft-deleted records).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const acquired = await this.acquireLock();
    if (!acquired) {
      this.logger.warn("Cleanup lock already held — skipping this run");
      return;
    }

    this.logger.log("Starting cleanup of expired records");

    try {
      // TODO: inject and call your domain repository/service here
      // e.g., await this.recordsRepository.deleteExpiredBefore(new Date());
      this.logger.log("Cleanup of expired records completed");
    } catch (error) {
      this.logger.error(`Cleanup failed: ${(error as Error).message}`);
    } finally {
      await this.releaseLock();
    }
  }

  private async acquireLock(): Promise<boolean> {
    const existing =
      await this.cacheService.getSimple<string>(CLEANUP_LOCK_KEY);
    if (existing) return false;

    await this.cacheService.setSimple<string>(
      CLEANUP_LOCK_KEY,
      "locked",
      CLEANUP_LOCK_TTL_SECONDS,
    );
    return true;
  }

  private async releaseLock(): Promise<void> {
    await this.cacheService.delete(CLEANUP_LOCK_KEY);
  }
}
