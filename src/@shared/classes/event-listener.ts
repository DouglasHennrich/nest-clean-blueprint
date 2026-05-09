import { ILogger } from "./custom-logger";

/**
 * AbstractEventListener<Dto>
 *
 * Base contract for every event listener. Decorate the handle method with
 * @OnEvent(EVENT_CONSTANT, { async: true }) to subscribe to domain events
 * emitted via EventEmitter2.
 *
 * @example
 *   @OnEvent(ORDER_CREATED, { async: true })
 *   async handle(event: OrderCreatedEvent): Promise<void> { ... }
 */
export abstract class AbstractEventListener<Dto> {
  logger?: ILogger;

  handle: (payload: Dto) => Promise<void>;
}
