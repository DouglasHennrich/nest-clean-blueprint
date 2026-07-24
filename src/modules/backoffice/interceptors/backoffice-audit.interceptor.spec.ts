import { of, throwError, lastValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { BackofficeAuditInterceptor } from './backoffice-audit.interceptor';
import { AUDIT_METADATA_KEY } from '../decorators/audit.decorator';
import { Result } from '@/@shared/classes/result';

describe('BackofficeAuditInterceptor', () => {
  let interceptor: BackofficeAuditInterceptor;
  let reflector: { get: jest.Mock };
  let createAuditLogService: { execute: jest.Mock };

  const buildContext = (
    overrides: { type?: string; request?: Record<string, any> } = {},
  ): ExecutionContext => {
    const request = {
      method: 'GET',
      url: '/api/foods',
      body: {},
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      ...overrides.request,
    };

    return {
      getType: () => overrides.type ?? 'http',
      getHandler: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  };

  const buildCallHandler = (observable = of({ id: 'result-1' })): CallHandler => ({
    handle: jest.fn().mockReturnValue(observable),
  });

  beforeEach(() => {
    reflector = { get: jest.fn() };
    createAuditLogService = {
      execute: jest.fn().mockResolvedValue(Result.success({})),
    };
    interceptor = new BackofficeAuditInterceptor(reflector as any, createAuditLogService);
  });

  it('should bypass non-http contexts', async () => {
    const context = buildContext({ type: 'rpc' });
    const callHandler = buildCallHandler();

    const result = await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(callHandler.handle).toHaveBeenCalled();
    expect(reflector.get).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'result-1' });
  });

  it('should bypass requests matching a skip path', async () => {
    const context = buildContext({ request: { url: '/health' } });
    const callHandler = buildCallHandler();

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(callHandler.handle).toHaveBeenCalled();
    expect(createAuditLogService.execute).not.toHaveBeenCalled();
  });

  it('should bypass GET requests without audit metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const context = buildContext({ request: { method: 'GET' } });
    const callHandler = buildCallHandler();

    await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(callHandler.handle).toHaveBeenCalled();
    expect(createAuditLogService.execute).not.toHaveBeenCalled();
  });

  it('should proceed for GET requests that declare audit metadata and log the audit entry', async () => {
    reflector.get.mockReturnValue({
      action: 'READ',
      endpoint: 'LIST_FOODS',
    });
    const context = buildContext({ request: { method: 'GET' } });
    const callHandler = buildCallHandler();

    const result = await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(reflector.get).toHaveBeenCalledWith(AUDIT_METADATA_KEY, expect.anything());
    expect(result).toEqual({ id: 'result-1' });

    // tap() side-effects run asynchronously — flush microtasks.
    await new Promise((resolve) => setImmediate(resolve));

    expect(createAuditLogService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/foods',
        endpoint: 'LIST_FOODS',
        action: 'READ',
        statusCode: 200,
      }),
    );
  });

  it('should proceed for non-GET requests without needing audit metadata and log the audit entry', async () => {
    reflector.get.mockReturnValue(undefined);
    const context = buildContext({ request: { method: 'POST' } });
    const callHandler = buildCallHandler();

    const result = await lastValueFrom(interceptor.intercept(context, callHandler));

    expect(result).toEqual({ id: 'result-1' });

    await new Promise((resolve) => setImmediate(resolve));

    expect(createAuditLogService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/foods',
        action: 'CREATE',
        statusCode: 200,
      }),
    );
  });

  it('should propagate errors emitted downstream and still log the audit entry', async () => {
    reflector.get.mockReturnValue(undefined);
    const context = buildContext({ request: { method: 'POST' } });
    const error = Object.assign(new Error('downstream failure'), { status: 500 });
    const callHandler = buildCallHandler(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, callHandler))).rejects.toThrow(
      'downstream failure',
    );

    expect(createAuditLogService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/foods',
        statusCode: 500,
        errorMessage: 'downstream failure',
      }),
    );
  });
});
