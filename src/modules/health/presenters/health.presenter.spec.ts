import { HealthCheckResult } from '@nestjs/terminus';
import { HealthPresenter } from './health.presenter';

describe('HealthPresenter', () => {
  let presenter: HealthPresenter;

  beforeEach(() => {
    presenter = new HealthPresenter();
  });

  it('should return the entity unchanged (identity transform)', () => {
    const entity: HealthCheckResult = {
      status: 'ok',
      info: {
        database: { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
      },
    };

    const result = presenter.present({ entity });

    expect(result).toBe(entity);
    expect(result).toEqual(entity);
  });

  it('should return an errored health check result unchanged', () => {
    const entity: HealthCheckResult = {
      status: 'error',
      info: {},
      error: {
        database: { status: 'down', message: 'connection refused' },
      },
      details: {
        database: { status: 'down', message: 'connection refused' },
      },
    };

    const result = presenter.present({ entity });

    expect(result).toBe(entity);
    expect(result.status).toBe('error');
  });

  it('should ignore the options parameter (identity transform regardless of options)', () => {
    const entity: HealthCheckResult = {
      status: 'ok',
      info: {},
      error: {},
      details: {},
    };

    const result = presenter.present({ entity, options: { withoutRelations: true } });

    expect(result).toBe(entity);
  });
});
