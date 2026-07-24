import { AbstractEventListener } from './event-listener';
import { ILogger } from './custom-logger';

interface ITestEventDtoModel {
  orderId: string;
}

class TestEventListener extends AbstractEventListener<ITestEventDtoModel> {
  public handled: ITestEventDtoModel[] = [];

  async handle(payload: ITestEventDtoModel): Promise<void> {
    await Promise.resolve();
    this.logger?.debug(`Handling event for order ${payload.orderId}`);
    this.handled.push(payload);
  }
}

describe('AbstractEventListener', () => {
  it('should be implemented by subclasses and process the payload', async () => {
    const listener = new TestEventListener();

    await listener.handle({ orderId: 'order-1' });

    expect(listener.handled).toEqual([{ orderId: 'order-1' }]);
  });

  it('should allow an optional logger to be assigned and used', async () => {
    const listener = new TestEventListener();
    const debug = jest.fn();
    listener.logger = { debug } as unknown as ILogger;

    await listener.handle({ orderId: 'order-2' });

    expect(debug).toHaveBeenCalledWith('Handling event for order order-2');
  });

  it('should work without a logger assigned', async () => {
    const listener = new TestEventListener();

    await expect(listener.handle({ orderId: 'order-3' })).resolves.toBeUndefined();
  });
});
