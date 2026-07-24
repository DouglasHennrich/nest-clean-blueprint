import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { TCurrentUser } from '@/modules/authenticate/models/current-user.struct';

/**
 * `createParamDecorator` factories are not directly exported by Nest —
 * the framework stores the factory function as route-arg metadata on the
 * target's constructor. This extracts it the same way Nest's own
 * `ExecutionContextHost` does at request time, so we can unit test the
 * actual extraction logic without spinning up an HTTP server.
 */
function extractFactory<T>(
  decorator: () => ParameterDecorator,
): (data: unknown, ctx: ExecutionContext) => T {
  class Dummy {
    method(@decorator() _value: unknown) {
      return _value;
    }
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Dummy, 'method') as
    | Record<string, { factory: (data: unknown, ctx: ExecutionContext) => T }>
    | undefined;

  const entry = Object.values(metadata ?? {})[0];
  if (!entry) {
    throw new Error('Could not locate decorator factory via ROUTE_ARGS_METADATA');
  }

  return entry.factory;
}

describe('CurrentUser decorator', () => {
  const buildContext = (req: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  it('should return req.currentUser when present', () => {
    const user: TCurrentUser = { id: 'user-1', email: 'user@example.com' };
    const context = buildContext({ currentUser: user });

    const factory = extractFactory<TCurrentUser | undefined>(CurrentUser);
    const result = factory(undefined, context);

    expect(result).toEqual(user);
  });

  it('should return undefined when req.currentUser is not set', () => {
    const context = buildContext({});

    const factory = extractFactory<TCurrentUser | undefined>(CurrentUser);
    const result = factory(undefined, context);

    expect(result).toBeUndefined();
  });

  it('should ignore the data argument passed to the decorator', () => {
    const user: TCurrentUser = { id: 'user-2' };
    const context = buildContext({ currentUser: user });

    const factory = extractFactory<TCurrentUser | undefined>(CurrentUser);
    const result = factory('irrelevant-data', context);

    expect(result).toEqual(user);
  });
});
