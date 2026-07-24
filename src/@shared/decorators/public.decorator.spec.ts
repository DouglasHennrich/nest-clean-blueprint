import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('should export IS_PUBLIC_KEY as "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should set isPublic metadata to true on a decorated class', () => {
    @Public()
    class DummyController {}

    const value = Reflect.getMetadata(IS_PUBLIC_KEY, DummyController);
    expect(value).toBe(true);
  });

  it('should set isPublic metadata to true on a decorated method', () => {
    class DummyController {
      @Public()
      handler() {
        return true;
      }
    }

    const value = Reflect.getMetadata(IS_PUBLIC_KEY, DummyController.prototype.handler);
    expect(value).toBe(true);
  });

  it('should return a new SetMetadata decorator instance on each call', () => {
    const first = Public();
    const second = Public();

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
  });
});
