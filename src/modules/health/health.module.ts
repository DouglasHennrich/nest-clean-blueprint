import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./controllers/health.controller";

/**
 * HealthModule
 *
 * Provides GET /health endpoint for load balancer liveness/readiness probes.
 * Import in AppModule. No auth required (mark controller with @Public() after Auth flow).
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
