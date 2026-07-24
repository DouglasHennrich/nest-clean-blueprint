import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthenticateGuard } from './jwt-authenticate.guard';

describe('JwtAuthenticateGuard', () => {
  let guard: JwtAuthenticateGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let superCanActivateSpy: jest.SpyInstance;

  const buildContext = (): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthenticateGuard(reflector as any);
    superCanActivateSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow access immediately for public routes without checking the token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).not.toHaveBeenCalled();
  });

  it('should delegate to the passport JWT strategy for non-public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    superCanActivateSpy.mockResolvedValue(true);
    const context = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
  });

  it('should delegate to the passport JWT strategy when no metadata is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    superCanActivateSpy.mockResolvedValue(true);
    const context = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when the passport strategy rejects', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    superCanActivateSpy.mockRejectedValue(new Error('invalid token'));
    const context = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when the passport strategy throws synchronously', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    superCanActivateSpy.mockImplementation(() => {
      throw new Error('boom');
    });
    const context = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
