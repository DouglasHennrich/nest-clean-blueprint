import { HttpStatus } from '@nestjs/common';
import { AbstractApplicationException, DefaultException } from './abstract-application-exception';
import { RequestContext, IRequestContextModel } from '../context/request.context';

class TestException extends AbstractApplicationException {
  constructor(message: string) {
    super(message, 'TestException', HttpStatus.CONFLICT);
  }
}

class DefaultsException extends AbstractApplicationException {
  constructor(message: string) {
    super(message);
  }
}

describe('AbstractApplicationException', () => {
  it('should set message, name and statusCode from the constructor arguments', () => {
    const exception = new TestException('Conflict happened');

    expect(exception.message).toBe('Conflict happened');
    expect(exception.name).toBe('TestException');
    expect(exception.statusCode).toBe(HttpStatus.CONFLICT);
    expect(exception).toBeInstanceOf(Error);
  });

  it('should fall back to default name and 500 status code when not provided', () => {
    const exception = new DefaultsException('Something broke');

    expect(exception.name).toBe('AbstractApplicationException');
    expect(exception.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should have an undefined context when constructed outside of a RequestContext.run()', () => {
    const exception = new TestException('No context here');

    expect(exception.context).toBeUndefined();
  });

  it('should capture the active RequestContext when constructed inside a RequestContext.run()', () => {
    const context: IRequestContextModel = {
      requestId: 'req-123',
      startedAt: new Date(),
      userId: 'user-1',
    };

    const exception = RequestContext.run(context, () => new TestException('Inside context'));

    expect(exception.context).toBe(context);
    expect(exception.context?.requestId).toBe('req-123');
  });
});

describe('DefaultException', () => {
  it('should default to name "DefaultException" and status 400', () => {
    const exception = new DefaultException('Validation failed');

    expect(exception.name).toBe('DefaultException');
    expect(exception.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.message).toBe('Validation failed');
  });

  it('should allow overriding the name and statusCode', () => {
    const exception = new DefaultException('Custom error', 'CustomError', HttpStatus.FORBIDDEN);

    expect(exception.name).toBe('CustomError');
    expect(exception.statusCode).toBe(HttpStatus.FORBIDDEN);
  });
});
