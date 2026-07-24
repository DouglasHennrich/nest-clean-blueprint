import { ConfigService } from '@nestjs/config';
import { EnvService } from './env.service';
import { IEnvSchema } from '../env';

describe('EnvService', () => {
  let service: EnvService;
  let configService: jest.Mocked<ConfigService<IEnvSchema, true>>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService<IEnvSchema, true>>;

    service = new EnvService(configService);
  });

  it('should delegate to ConfigService.get with type inference enabled', () => {
    configService.get.mockReturnValue('development');

    const result = service.get('INFRA_ENVIRONMENT');

    expect(configService.get).toHaveBeenCalledWith('INFRA_ENVIRONMENT', { infer: true });
    expect(result).toBe('development');
  });

  it('should return a numeric env var as-is', () => {
    configService.get.mockReturnValue(100);

    const result = service.get('UTILITIES_PAGINATION_LIMIT');

    expect(configService.get).toHaveBeenCalledWith('UTILITIES_PAGINATION_LIMIT', {
      infer: true,
    });
    expect(result).toBe(100);
  });

  it('should return a boolean env var as-is', () => {
    configService.get.mockReturnValue(false);

    const result = service.get('DATABASE_IGNORE_MIGRATIONS');

    expect(result).toBe(false);
  });

  it('should return undefined for an optional env var that is not set', () => {
    configService.get.mockReturnValue(undefined);

    const result = service.get('SENTRY_DSN');

    expect(configService.get).toHaveBeenCalledWith('SENTRY_DSN', { infer: true });
    expect(result).toBeUndefined();
  });

  it('should call ConfigService.get independently for each key requested', () => {
    configService.get.mockReturnValueOnce('http://localhost').mockReturnValueOnce(3000);

    const url = service.get('INFRA_URL');
    const port = service.get('INFRA_PORT');

    expect(configService.get).toHaveBeenCalledTimes(2);
    expect(url).toBe('http://localhost');
    expect(port).toBe(3000);
  });
});
