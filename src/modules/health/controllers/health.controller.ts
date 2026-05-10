import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "@/@decorators/public.decorator";

/**
 * HealthController
 *
 * Exposes GET /health (unversioned, no auth) for load balancer probes.
 *
 * Indicators:
 *   - database: TypeORM ping (1500ms timeout)
 *   - mem_rss:  RSS ≤ 1024 MB
 *   - mem_heap: Heap ≤ 512 MB
 *   - disk:     Disk usage ≤ 90%
 */
@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database", { timeout: 1500 }),
      () => this.memory.checkRSS("mem_rss", 1024 * 2 ** 20),
      () => this.memory.checkHeap("mem_heap", 512 * 2 ** 20),
      () =>
        this.disk.checkStorage("disk", {
          path: "/",
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
