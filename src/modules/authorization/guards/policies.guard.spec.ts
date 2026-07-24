import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PoliciesGuard } from './policies.guard';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let caslAbilityFactory: { defineAbility: jest.Mock };

  const buildContext = (request: Record<string, any> = {}): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    caslAbilityFactory = { defineAbility: jest.fn() };
    guard = new PoliciesGuard(reflector as any, caslAbilityFactory);
  });

  it('should allow access for public routes without checking policies', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const context = buildContext();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(caslAbilityFactory.defineAbility).not.toHaveBeenCalled();
  });

  it('should allow access when no policies are declared for the route', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    const context = buildContext({ currentUser: { id: 'u1' } });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(caslAbilityFactory.defineAbility).not.toHaveBeenCalled();
  });

  it('should allow access when the declared policies handler list is empty', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([]);
    const context = buildContext({ currentUser: { id: 'u1' } });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when policies are declared but there is no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([() => true]);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('No authenticated user'),
    );
  });

  it('should allow access when every function-based policy handler passes', () => {
    const ability = { can: jest.fn().mockReturnValue(true) };
    caslAbilityFactory.defineAbility.mockReturnValue(ability);
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([
        (a: { can: (...args: unknown[]) => boolean }) => a.can('read', 'orders'),
      ]);
    const context = buildContext({ currentUser: { id: 'u1' } });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(caslAbilityFactory.defineAbility).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('should allow access when every class-based policy handler passes', () => {
    const ability = {};
    caslAbilityFactory.defineAbility.mockReturnValue(ability);
    const classHandler = { handle: jest.fn().mockReturnValue(true) };
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([classHandler]);
    const context = buildContext({ currentUser: { id: 'u1' } });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(classHandler.handle).toHaveBeenCalledWith(ability);
  });

  it('should throw ForbiddenException when a policy handler fails', () => {
    const ability = { can: jest.fn().mockReturnValue(false) };
    caslAbilityFactory.defineAbility.mockReturnValue(ability);
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([
        (a: { can: (...args: unknown[]) => boolean }) => a.can('manage', 'all'),
      ]);
    const context = buildContext({ currentUser: { id: 'u1' } });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Insufficient permissions'),
    );
  });

  it('should throw ForbiddenException when at least one of multiple handlers fails', () => {
    const ability = {};
    caslAbilityFactory.defineAbility.mockReturnValue(ability);
    const passingHandler = { handle: jest.fn().mockReturnValue(true) };
    const failingHandler = { handle: jest.fn().mockReturnValue(false) };
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([passingHandler, failingHandler]);
    const context = buildContext({ currentUser: { id: 'u1' } });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
