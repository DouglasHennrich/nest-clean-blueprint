import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { ReqContext } from './request-context.decorator';
import { RequestContext, IRequestContextModel } from '@/@shared/context/request.context';

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

describe('ReqContext decorator', () => {
  const buildContext = (req: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  const req = {
    ip: '10.0.0.1',
    headers: { 'user-agent': 'jest-agent' },
  };

  it('should build context from RequestContext + request when async context is present', () => {
    const asyncCtx: IRequestContextModel = {
      requestId: 'req-123',
      userId: 'user-1',
      userTimezone: 'America/Sao_Paulo',
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const result = RequestContext.run(asyncCtx, () => {
      const factory = extractFactory<IRequestContextModel>(ReqContext);
      return factory(undefined, buildContext(req));
    });

    expect(result).toEqual({
      requestId: 'req-123',
      userId: 'user-1',
      userTimezone: 'America/Sao_Paulo',
      ip: '10.0.0.1',
      userAgent: 'jest-agent',
      startedAt: asyncCtx.startedAt,
    });
  });

  it('should fall back to default values when no async context is present', () => {
    const factory = extractFactory<IRequestContextModel>(ReqContext);
    const before = Date.now();
    const result = factory(undefined, buildContext(req));
    const after = Date.now();

    expect(result.requestId).toBe('no-request-id');
    expect(result.userId).toBeUndefined();
    expect(result.userTimezone).toBeUndefined();
    expect(result.ip).toBe('10.0.0.1');
    expect(result.userAgent).toBe('jest-agent');
    expect(result.startedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.startedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should read ip and userAgent straight from the request object', () => {
    const customReq = { ip: '192.168.0.5', headers: { 'user-agent': 'custom-agent' } };
    const factory = extractFactory<IRequestContextModel>(ReqContext);

    const result = factory(undefined, buildContext(customReq));

    expect(result.ip).toBe('192.168.0.5');
    expect(result.userAgent).toBe('custom-agent');
  });
});
