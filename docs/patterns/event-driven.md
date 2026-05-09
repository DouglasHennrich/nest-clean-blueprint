# Event-driven communication

Decouple modules through domain events emitted via `@nestjs/event-emitter` (EventEmitter2). Use this for cross-module side effects (e.g. `OrderCreated` → send confirmation email) instead of injecting one module's services into another.

## Emit

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(private eventEmitter: EventEmitter2) {}

await this.eventEmitter.emitAsync('order.created', new OrderCreatedEvent(order));
```

Use string constants for event names so listeners and emitters share the same source of truth:

```typescript
// events/order-events.constants.ts
export const ORDER_CREATED = 'order.created';
```

## Listen

Each listener extends `AbstractEventListener<Dto>`:

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { AbstractEventListener } from '@/@shared/classes/event-listener';

@Injectable()
export class SendOrderConfirmationEmailListener
  implements AbstractEventListener<OrderCreatedEvent>
{
  public logger: ILogger = new CustomLogger(SendOrderConfirmationEmailListener.name);

  constructor(private mailProvider: TMailProvider) {}

  @OnEvent(ORDER_CREATED, { async: true })
  async handle(event: OrderCreatedEvent): Promise<void> {
    const result = await this.mailProvider.sendTemplateEmail({ /* … */ });
    if (result.error) {
      this.logger.error(`Failed to send: ${result.error.message}`);
    }
  }
}
```

## Rules

- **Use events for side effects, not for the primary write path.** A list endpoint must not depend on an event listener returning data.
- **Listeners are fire-and-forget.** Wrap retry logic inside the listener, not in the emitter.
- **Always use `{ async: true }`** so listeners run on the next tick and don't block the emitter.
- **Use AsyncContext.run inside the listener** if you spawn further async work that needs the Correlation ID — `EventEmitter2` does not propagate AsyncLocalStorage by default.
