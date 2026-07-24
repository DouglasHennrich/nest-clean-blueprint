import { IRequestContextModel, RequestContext } from './request.context';

describe('RequestContext', () => {
  const buildContext = (overrides: Partial<IRequestContextModel> = {}): IRequestContextModel => ({
    requestId: 'req-1',
    startedAt: new Date(),
    ...overrides,
  });

  describe('getContext / getRequestId / getUserId / getUserTimezone', () => {
    it('should return undefined when called outside of a run() call', () => {
      expect(RequestContext.getContext()).toBeUndefined();
      expect(RequestContext.getRequestId()).toBeUndefined();
      expect(RequestContext.getUserId()).toBeUndefined();
      expect(RequestContext.getUserTimezone()).toBeUndefined();
    });

    it('should expose the seeded context values while inside run()', () => {
      const context = buildContext({ userId: 'user-1', userTimezone: 'America/Sao_Paulo' });

      RequestContext.run(context, () => {
        expect(RequestContext.getContext()).toBe(context);
        expect(RequestContext.getRequestId()).toBe('req-1');
        expect(RequestContext.getUserId()).toBe('user-1');
        expect(RequestContext.getUserTimezone()).toBe('America/Sao_Paulo');
      });
    });

    it('should return undefined again once run() has completed', () => {
      RequestContext.run(buildContext(), () => {
        // no-op, just entering the context
      });

      expect(RequestContext.getContext()).toBeUndefined();
    });
  });

  describe('run', () => {
    it('should return the value produced by the callback', () => {
      const value = RequestContext.run(buildContext(), () => 42);

      expect(value).toBe(42);
    });

    it('should propagate context through nested async calls', async () => {
      const context = buildContext({ requestId: 'async-req' });

      const result = await RequestContext.run(context, async () => {
        await Promise.resolve();
        return RequestContext.getRequestId();
      });

      expect(result).toBe('async-req');
    });

    it('should not leak context between two concurrent run() calls', async () => {
      const observedA: (string | undefined)[] = [];
      const observedB: (string | undefined)[] = [];

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const taskA = RequestContext.run(buildContext({ requestId: 'request-A' }), async () => {
        observedA.push(RequestContext.getRequestId());
        await delay(20);
        observedA.push(RequestContext.getRequestId());
        await delay(5);
        observedA.push(RequestContext.getRequestId());
      });

      const taskB = RequestContext.run(buildContext({ requestId: 'request-B' }), async () => {
        observedB.push(RequestContext.getRequestId());
        await delay(10);
        observedB.push(RequestContext.getRequestId());
        await delay(15);
        observedB.push(RequestContext.getRequestId());
      });

      await Promise.all([taskA, taskB]);

      expect(observedA).toEqual(['request-A', 'request-A', 'request-A']);
      expect(observedB).toEqual(['request-B', 'request-B', 'request-B']);
    });

    it('should isolate nested run() calls from their parent context', () => {
      const outer = buildContext({ requestId: 'outer' });
      const inner = buildContext({ requestId: 'inner' });

      RequestContext.run(outer, () => {
        expect(RequestContext.getRequestId()).toBe('outer');

        RequestContext.run(inner, () => {
          expect(RequestContext.getRequestId()).toBe('inner');
        });

        expect(RequestContext.getRequestId()).toBe('outer');
      });
    });
  });

  describe('set / get', () => {
    it('should store and retrieve an arbitrary key on the active context', () => {
      RequestContext.run(buildContext(), () => {
        RequestContext.set('customKey', 'customValue');
        expect(RequestContext.get('customKey')).toBe('customValue');
      });
    });

    it('should be a no-op when set() is called outside of a run() call', () => {
      expect(() => RequestContext.set('customKey', 'value')).not.toThrow();
      expect(RequestContext.get('customKey')).toBeUndefined();
    });
  });
});
