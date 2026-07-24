import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { IHealthPresenter } from '../presenters/health.presenter';

describe('HealthController', () => {
  let controller: HealthController;
  let health: jest.Mocked<HealthCheckService>;
  let db: jest.Mocked<TypeOrmHealthIndicator>;
  let memory: jest.Mocked<MemoryHealthIndicator>;
  let disk: jest.Mocked<DiskHealthIndicator>;
  let healthPresenter: jest.Mocked<IHealthPresenter>;

  const healthResult: HealthCheckResult = {
    status: 'ok',
    info: { database: { status: 'up' } },
    error: {},
    details: { database: { status: 'up' } },
  };

  beforeEach(() => {
    health = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;

    db = {
      pingCheck: jest.fn(),
    } as unknown as jest.Mocked<TypeOrmHealthIndicator>;

    memory = {
      checkRSS: jest.fn(),
      checkHeap: jest.fn(),
    } as unknown as jest.Mocked<MemoryHealthIndicator>;

    disk = {
      checkStorage: jest.fn(),
    } as unknown as jest.Mocked<DiskHealthIndicator>;

    healthPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new HealthController(health, db, memory, disk, healthPresenter);
  });

  it('should run the health checks and present the result', async () => {
    health.check.mockImplementation(
      async (indicators: HealthIndicatorFunction[]): Promise<HealthCheckResult> => {
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      },
    );
    healthPresenter.present.mockReturnValue(healthResult);

    const result = await controller.check();

    expect(health.check).toHaveBeenCalledTimes(1);
    expect(healthPresenter.present).toHaveBeenCalledWith({ entity: healthResult });
    expect(result).toBe(healthResult);
  });

  it('should invoke each health indicator with the expected parameters', async () => {
    let capturedIndicators: HealthIndicatorFunction[] = [];
    health.check.mockImplementation(
      async (indicators: HealthIndicatorFunction[]): Promise<HealthCheckResult> => {
        capturedIndicators = indicators;
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      },
    );
    healthPresenter.present.mockReturnValue(healthResult);

    await controller.check();

    expect(capturedIndicators).toHaveLength(4);
    expect(db.pingCheck).toHaveBeenCalledWith('database', { timeout: 1500 });
    expect(memory.checkRSS).toHaveBeenCalledWith('mem_rss', 1024 * 2 ** 20);
    expect(memory.checkHeap).toHaveBeenCalledWith('mem_heap', 512 * 2 ** 20);
    expect(disk.checkStorage).toHaveBeenCalledWith('disk', {
      path: '/',
      thresholdPercent: 0.9,
    });
  });

  it('should propagate errors thrown by the health check service', async () => {
    const error = new Error('health check failed');
    health.check.mockRejectedValue(error);

    await expect(controller.check()).rejects.toThrow('health check failed');
    expect(healthPresenter.present).not.toHaveBeenCalled();
  });
});
