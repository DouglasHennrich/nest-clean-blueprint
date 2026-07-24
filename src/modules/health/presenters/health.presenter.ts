import { HealthCheckResult } from '@nestjs/terminus';
import { AbstractPresenter } from '@/@shared/classes/presenter';

/**
 * HealthPresenter
 *
 * The health check result is already a plain, stable shape (Terminus'
 * HealthCheckResult), so present() is an identity transform — it exists to
 * satisfy the "controllers must go through a presenter" convention without
 * altering the response body load balancers/probes expect.
 */
export abstract class IHealthPresenter extends AbstractPresenter<
  HealthCheckResult,
  HealthCheckResult
> {}

export class HealthPresenter extends IHealthPresenter {
  present({ entity }: { entity: HealthCheckResult; options?: any }): HealthCheckResult {
    return entity;
  }
}
