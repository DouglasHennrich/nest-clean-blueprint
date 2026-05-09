import { AbstractApplicationException } from "../errors/abstract-application-exception";

/**
 * Result<T>
 *
 * Wraps the outcome of an operation as either a success (with optional value)
 * or a failure (with an Error). Services in this codebase return Result<T>
 * instead of throwing — only Controllers throw.
 *
 * @example
 *   if (!order) return Result.fail(new OrderNotFoundException(id));
 *   return Result.success(order);
 */
export class Result<T> {
  public error?: AbstractApplicationException | Error;
  private value?: T;

  private constructor(
    isSuccess: boolean,
    error?: AbstractApplicationException | Error,
    value?: T,
  ) {
    this.error = error;
    this.value = value;

    Object.freeze(this);
  }

  public getValue(): T | null {
    return this.value ?? null;
  }

  public static success<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(
    error: AbstractApplicationException | Error,
  ): Result<U> {
    return new Result<U>(false, error, undefined);
  }
}
