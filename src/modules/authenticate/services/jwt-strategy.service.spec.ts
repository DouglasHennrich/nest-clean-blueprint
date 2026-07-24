import { ZodError } from 'zod';
import { JwtStrategy } from './jwt-strategy.service';

describe('JwtStrategy', () => {
  let envService: { get: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    envService = {
      get: jest.fn().mockReturnValue(Buffer.from('public-key').toString('base64')),
    };
    strategy = new JwtStrategy(envService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should read the JWT public key from the env service', () => {
    expect(envService.get).toHaveBeenCalledWith('AUTH_JWT_PUBLIC_KEY');
  });

  it('should return the parsed payload when it contains a valid uuid sub', () => {
    const payload = { sub: '123e4567-e89b-12d3-a456-426614174000' };

    const result = strategy.validate(payload);

    expect(result).toEqual(payload);
  });

  it('should strip unexpected properties not defined in the schema', () => {
    const payload = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      extra: 'should-be-removed-by-zod-parse',
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({ sub: payload.sub });
  });

  it('should throw a ZodError when sub is not a valid uuid', () => {
    expect(() => strategy.validate({ sub: 'not-a-uuid' })).toThrow(ZodError);
  });

  it('should throw a ZodError when sub is missing', () => {
    expect(() => strategy.validate({})).toThrow(ZodError);
  });

  it('should throw a ZodError when payload is not an object', () => {
    expect(() => strategy.validate(null)).toThrow(ZodError);
    expect(() => strategy.validate('token-string')).toThrow(ZodError);
  });
});
