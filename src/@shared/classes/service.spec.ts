import { z } from 'zod';
import { AbstractService } from './service';
import { Result } from './result';
import { DefaultException } from '../errors/abstract-application-exception';

interface ITestDtoModel {
  name: string;
}

interface ITestResponseModel {
  greeting: string;
}

class TestService extends AbstractService<ITestDtoModel, ITestResponseModel> {
  async execute(payload: ITestDtoModel): Promise<Result<ITestResponseModel>> {
    await Promise.resolve();
    return Result.success({ greeting: `Hello, ${payload.name}` });
  }
}

describe('AbstractService', () => {
  describe('execute', () => {
    it('should be implemented by subclasses and return a Result', async () => {
      const service = new TestService();

      const result = await service.execute({ name: 'World' });

      expect(result.getValue()).toEqual({ greeting: 'Hello, World' });
      expect(result.error).toBeUndefined();
    });
  });

  describe('logger', () => {
    it('should allow an optional logger to be assigned', () => {
      const service = new TestService();
      const logger = { warn: jest.fn() } as unknown as NonNullable<TestService['logger']>;

      service.logger = logger;

      expect(service.logger).toBe(logger);
    });
  });

  describe('validateDto', () => {
    const schema = z.object({ name: z.string().min(1) });

    it('should return undefined when the payload is valid', () => {
      const result = AbstractService.validateDto(schema, { name: 'Douglas' });

      expect(result).toBeUndefined();
    });

    it('should return a failed Result with a DefaultException when the payload is invalid', () => {
      const result = AbstractService.validateDto(schema, { name: '' });

      expect(result).toBeInstanceOf(Result);
      expect(result?.error).toBeInstanceOf(DefaultException);
      expect(result?.error?.message).toBe('Validation failed');
      expect((result?.error as DefaultException).statusCode).toBe(400);
      expect(result?.getValue()).toBeNull();
    });

    it('should return a failed Result when the payload is not an object at all', () => {
      const result = AbstractService.validateDto(schema, undefined);

      expect(result?.error).toBeInstanceOf(DefaultException);
    });
  });
});
