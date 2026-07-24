import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { ResponseLogInterceptor } from './response-log.interceptor';

describe('ResponseLogInterceptor', () => {
  let interceptor: ResponseLogInterceptor;

  const buildContext = (req: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  const buildHandler = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  beforeEach(() => {
    interceptor = new ResponseLogInterceptor();
  });

  it('should not touch req for GET requests and pass the value through', async () => {
    const req: Record<string, unknown> = { method: 'GET' };
    const context = buildContext(req);
    const handler = buildHandler({ id: 'abc' });

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ id: 'abc' });
    expect(req['__responseBody']).toBeUndefined();
  });

  it('should capture a snapshot with id for POST responses with a simple object', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    const handler = buildHandler({ id: 'order-1', name: 'Order' });

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ id: 'order-1', name: 'Order' });
    expect(req['__responseBody']).toBe(JSON.stringify({ id: 'order-1' }));
  });

  it('should capture ids for a paginated response ({ data: [...] })', async () => {
    const req: Record<string, unknown> = { method: 'PUT' };
    const context = buildContext(req);
    const value = { data: [{ id: '1' }, { id: '2' }] };
    const handler = buildHandler(value);

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBe(JSON.stringify({ ids: ['1', '2'] }));
  });

  it('should capture ids for a direct array response', async () => {
    const req: Record<string, unknown> = { method: 'PATCH' };
    const context = buildContext(req);
    const value = [{ id: 'a' }, { id: 'b' }];
    const handler = buildHandler(value);

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBe(JSON.stringify({ ids: ['a', 'b'] }));
  });

  it('should not set __responseBody when the paginated data array has no ids', async () => {
    const req: Record<string, unknown> = { method: 'DELETE' };
    const context = buildContext(req);
    const value = { data: [{ name: 'no-id' }] };
    const handler = buildHandler(value);

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBeUndefined();
  });

  it('should not set __responseBody for a body without id/data/array shape', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    const handler = buildHandler({ message: 'ok' });

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBeUndefined();
  });

  it('should not set __responseBody for non-object bodies', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    const handler = buildHandler('a plain string');

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBeUndefined();
  });

  it('should not set __responseBody for null bodies', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    const handler = buildHandler(null);

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBeUndefined();
  });

  it('should propagate errors from the handler without throwing internally', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    const handler: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toThrow('boom');
    expect(req['__responseBody']).toBeUndefined();
  });

  it('should swallow snapshot extraction errors and not interrupt the response', async () => {
    const req: Record<string, unknown> = { method: 'POST' };
    const context = buildContext(req);
    // A BigInt id makes JSON.stringify throw inside the tap's try/catch
    const value = { data: [{ id: BigInt(1) }] };
    const handler = buildHandler(value);

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBe(value);
    expect(req['__responseBody']).toBeUndefined();
  });

  it('should treat a missing method as an empty string and skip snapshotting', async () => {
    const req: Record<string, unknown> = {};
    const context = buildContext(req);
    const handler = buildHandler({ id: 'x' });

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(req['__responseBody']).toBeUndefined();
  });
});
