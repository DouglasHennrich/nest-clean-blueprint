import { UpdateOrderService } from './update-order.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { ILogger } from '@/@shared/classes/custom-logger';
import { OrderNotFoundException } from '../errors/order-not-found.exception';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { RequestContext } from '@/@shared/context/request.context';

describe('UpdateOrderService', () => {
  let service: UpdateOrderService;
  let ordersRepository: jest.Mocked<IOrdersRepository>;
  let logger: jest.Mocked<ILogger>;

  const id = '123e4567-e89b-12d3-a456-426614174000';
  const order: IOrderModel = {
    id,
    code: 'ORD-ABCD1234',
    customerName: 'John Doe',
    amount: 100,
    status: OrderStatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    ordersRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IOrdersRepository>;

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new UpdateOrderService(ordersRepository, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('UpdateOrderService');
  });

  it('should update the order and return it wrapped in a successful Result', async () => {
    const updated = { ...order, customerName: 'Jane Doe' };
    ordersRepository.findById.mockResolvedValue(order);
    ordersRepository.update.mockResolvedValue(updated);

    const result = await service.execute({ id, customerName: 'Jane Doe' });

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(updated);
    expect(ordersRepository.findById).toHaveBeenCalledWith({ id });
    expect(ordersRepository.update).toHaveBeenCalledWith({
      id,
      data: { customerName: 'Jane Doe' },
    });
  });

  it('should return a failed Result with OrderNotFoundException when the order does not exist', async () => {
    ordersRepository.findById.mockResolvedValue(undefined);

    await RequestContext.run({ requestId: 'req-1', startedAt: new Date() }, async () => {
      const result = await service.execute({ id, customerName: 'Jane Doe' });

      expect(result.getValue()).toBeNull();
      expect(result.error).toBeInstanceOf(OrderNotFoundException);
      expect(ordersRepository.update).not.toHaveBeenCalled();
    });
  });

  it('should return a failed Result and skip repository calls on invalid dto', async () => {
    const result = await service.execute({ id: 'not-a-uuid' });

    expect(result.error).toBeDefined();
    expect(ordersRepository.findById).not.toHaveBeenCalled();
    expect(ordersRepository.update).not.toHaveBeenCalled();
  });
});
