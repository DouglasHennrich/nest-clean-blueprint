import { DeleteOrderService } from './delete-order.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { ILogger } from '@/@shared/classes/custom-logger';
import { OrderNotFoundException } from '../errors/order-not-found.exception';
import { OrderAlreadyCancelledException } from '../errors/order-already-cancelled.exception';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { RequestContext } from '@/@shared/context/request.context';

describe('DeleteOrderService', () => {
  let service: DeleteOrderService;
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
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<IOrdersRepository>;

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new DeleteOrderService(ordersRepository, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('DeleteOrderService');
  });

  it('should soft delete the order and return a successful empty Result', async () => {
    ordersRepository.findById.mockResolvedValue(order);
    ordersRepository.softDelete.mockResolvedValue(undefined);

    const result = await service.execute({ id });

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toBeNull();
    expect(ordersRepository.softDelete).toHaveBeenCalledWith(id);
  });

  it('should return a failed Result with OrderNotFoundException when the order does not exist', async () => {
    ordersRepository.findById.mockResolvedValue(undefined);

    await RequestContext.run({ requestId: 'req-1', startedAt: new Date() }, async () => {
      const result = await service.execute({ id });

      expect(result.error).toBeInstanceOf(OrderNotFoundException);
      expect(ordersRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  it('should return a failed Result with OrderAlreadyCancelledException when the order is already cancelled', async () => {
    ordersRepository.findById.mockResolvedValue({ ...order, status: OrderStatusEnum.CANCELLED });

    await RequestContext.run({ requestId: 'req-1', startedAt: new Date() }, async () => {
      const result = await service.execute({ id });

      expect(result.error).toBeInstanceOf(OrderAlreadyCancelledException);
      expect(ordersRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  it('should return a failed Result and skip repository calls on invalid dto', async () => {
    const result = await service.execute({ id: 'not-a-uuid' });

    expect(result.error).toBeDefined();
    expect(ordersRepository.findById).not.toHaveBeenCalled();
    expect(ordersRepository.softDelete).not.toHaveBeenCalled();
  });
});
