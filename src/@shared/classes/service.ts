import { Result } from "./result";
import { IRequestContext } from "../protocols/request-context.struct";
import { ILogger } from "./custom-logger";

/**
 * AbstractService<Dto, Response>
 *
 * Base contract for every business service. Each service exposes ONE method:
 *   execute(payload, context?) => Promise<Result<Response>>
 *
 * Services MUST NOT throw — wrap errors in Result.fail. Only controllers throw.
 *
 * Convention: define an abstract token T<Action><Entity>Service that extends
 * AbstractService<...>, then provide it via { provide, useClass } in the module.
 */
export abstract class AbstractService<Dto, Response> {
  logger?: ILogger;

  execute: (
    payload: Dto,
    context?: IRequestContext,
  ) => Promise<Result<Response>>;
}
