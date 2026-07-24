import { Result } from './result';
import { DefaultException } from '../errors/abstract-application-exception';

describe('Result', () => {
  describe('success', () => {
    it('should create a successful result with a value', () => {
      const result = Result.success<number>(42);

      expect(result.error).toBeUndefined();
      expect(result.getValue()).toBe(42);
    });

    it('should create a successful result without a value', () => {
      const result = Result.success<void>();

      expect(result.error).toBeUndefined();
      expect(result.getValue()).toBeNull();
    });

    it('should treat an explicit undefined value the same as no value', () => {
      const result = Result.success<string | undefined>(undefined);

      expect(result.getValue()).toBeNull();
    });
  });

  describe('fail', () => {
    it('should create a failed result carrying an AbstractApplicationException', () => {
      const error = new DefaultException('Something went wrong');
      const result = Result.fail<number>(error);

      expect(result.error).toBe(error);
      expect(result.getValue()).toBeNull();
    });

    it('should create a failed result carrying a plain Error', () => {
      const error = new Error('plain error');
      const result = Result.fail<number>(error);

      expect(result.error).toBe(error);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('immutability', () => {
    it('should freeze the instance so properties cannot be reassigned', () => {
      const result = Result.success<number>(1);

      expect(Object.isFrozen(result)).toBe(true);
      expect(() => {
        (result as unknown as { error: unknown }).error = new Error('mutated');
      }).toThrow();
    });
  });
});
