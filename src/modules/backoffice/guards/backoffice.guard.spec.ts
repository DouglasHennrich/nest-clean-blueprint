import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BackofficeGuard, BACKOFFICE_TOKEN_HEADER } from './backoffice.guard';

describe('BackofficeGuard', () => {
  let guard: BackofficeGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let envService: { get: jest.Mock };

  const VALID_TOKEN = 'super-secret-backoffice-token';

  const buildContext = (headers: Record<string, string> = {}): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    envService = { get: jest.fn().mockReturnValue(VALID_TOKEN) };
    guard = new BackofficeGuard(reflector as any, envService);
  });

  it('should allow access when the route has no backoffice metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = buildContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(envService.get).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when the token header is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when the token does not match', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({ [BACKOFFICE_TOKEN_HEADER]: 'wrong-token' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when the token has a different length', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({ [BACKOFFICE_TOKEN_HEADER]: 'short' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when the token matches', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({ [BACKOFFICE_TOKEN_HEADER]: VALID_TOKEN });

    expect(guard.canActivate(context)).toBe(true);
  });
});
