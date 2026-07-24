import { z, ZodError } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  it('should return the parsed value on valid input', () => {
    const pipe = new ZodValidationPipe(schema);

    const result = pipe.transform({ name: 'Jane', age: 30 });

    expect(result).toEqual({ name: 'Jane', age: 30 });
  });

  it('should throw a ZodError on invalid input', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ name: 'Jane', age: 'not-a-number' })).toThrow(ZodError);
  });

  it('should wrap a non-ZodError thrown by schema.parse in a ZodError', () => {
    const brokenSchema = {
      parse: () => {
        throw new Error('unexpected failure');
      },
    } as unknown as z.ZodSchema;
    const pipe = new ZodValidationPipe(brokenSchema);

    try {
      pipe.transform({});
      throw new Error('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).issues[0].message).toBe('Validation failed');
    }
  });
});
