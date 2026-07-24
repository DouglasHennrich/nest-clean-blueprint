import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicRateLimitGuard } from './public-rate-limit.guard';
import { TDataCacheService } from '@/@shared/modules/cache/services/data-cache.service';
import { IS_PUBLIC_KEY } from '@/@shared/decorators/public.decorator';

describe('PublicRateLimitGuard', () => {
  let guard: PublicRateLimitGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let cacheService: { getSimple: jest.Mock; setSimple: jest.Mock };

  const buildContext = (req: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    cacheService = { getSimple: jest.fn(), setSimple: jest.fn() };

    guard = new PublicRateLimitGuard(
      reflector as unknown as Reflector,
      cacheService as unknown as TDataCacheService,
    );
  });

  it('should allow non-public routes without touching the cache', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = buildContext({ ip: '1.2.3.4', path: '/orders' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(cacheService.getSimple).not.toHaveBeenCalled();
    expect(cacheService.setSimple).not.toHaveBeenCalled();
  });

  it('should check IS_PUBLIC_KEY metadata on handler and class', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const handler = jest.fn();
    const klass = jest.fn();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ ip: '1.2.3.4', path: '/orders' }) }),
      getHandler: () => handler,
      getClass: () => klass,
    } as unknown as ExecutionContext;

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, klass]);
  });

  it('should allow the request through and increment the counter when under the limit', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(5);
    const context = buildContext({ ip: '1.2.3.4', path: '/public/route' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(cacheService.getSimple).toHaveBeenCalledWith('ratelimit:1.2.3.4:/public/route');
    expect(cacheService.setSimple).toHaveBeenCalledWith('ratelimit:1.2.3.4:/public/route', 6, 60);
  });

  it('should default the counter to 0 when nothing is cached yet', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(undefined);
    const context = buildContext({ ip: '1.2.3.4', path: '/public/route' });

    await guard.canActivate(context);

    expect(cacheService.setSimple).toHaveBeenCalledWith('ratelimit:1.2.3.4:/public/route', 1, 60);
  });

  it('should throw HttpException 429 when the limit is reached', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(60);
    const context = buildContext({ ip: '1.2.3.4', path: '/public/route' });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(cacheService.setSimple).not.toHaveBeenCalled();
  });

  it('should throw when the limit is exceeded (above max)', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(100);
    const context = buildContext({ ip: '1.2.3.4', path: '/public/route' });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should fall back to socket.remoteAddress when req.ip is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(0);
    const context = buildContext({
      ip: undefined,
      socket: { remoteAddress: '9.9.9.9' },
      path: '/public/route',
    });

    await guard.canActivate(context);

    expect(cacheService.getSimple).toHaveBeenCalledWith('ratelimit:9.9.9.9:/public/route');
  });

  it('should fall back to "unknown" when neither ip nor socket address is available', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    cacheService.getSimple.mockResolvedValue(0);
    const context = buildContext({
      ip: undefined,
      socket: {},
      path: '/public/route',
    });

    await guard.canActivate(context);

    expect(cacheService.getSimple).toHaveBeenCalledWith('ratelimit:unknown:/public/route');
  });
});
