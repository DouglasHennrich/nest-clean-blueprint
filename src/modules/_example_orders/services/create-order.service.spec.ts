import { CreateOrderService } from './create-order.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { ILogger } from '@/@shared/classes/custom-logger';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';

describe('CreateOrderService', () => {
  let service: CreateOrderService;
  let ordersRepository: jest.Mocked<IOrdersRepository>;
  let logger: jest.Mocked<ILogger>;

  const order: IOrderModel = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'ORD-ABCD1234',
    customerName: 'John Doe',
    amount: 100,
    status: OrderStatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    ordersRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<IOrdersRepository>;

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new CreateOrderService(ordersRepository, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('CreateOrderService');
  });

  it('should create an order and return it wrapped in a successful Result', async () => {
    ordersRepository.create.mockResolvedValue(order);

    const result = await service.execute({ customerName: 'John Doe', amount: 100 });

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(order);
    expect(ordersRepository.create).toHaveBeenCalledTimes(1);
    const callArgs = ordersRepository.create.mock.calls[0][0];
    expect(callArgs.data.customerName).toBe('John Doe');
    expect(callArgs.data.amount).toBe(100);
    expect(callArgs.data.status).toBe(OrderStatusEnum.PENDING);
    expect(callArgs.data.code).toMatch(/^ORD-[A-F0-9]{8}$/);
  });

  it('should log a message when creating an order', async () => {
    ordersRepository.create.mockResolvedValue(order);

    await service.execute({ customerName: 'John Doe', amount: 100 });

    expect(logger.log).toHaveBeenCalledWith('Creating order for John Doe');
  });

  it('should return a failed Result and skip repository call on invalid dto', async () => {
    const result = await service.execute({ customerName: '', amount: -5 });

    expect(result.error).toBeDefined();
    expect(result.getValue()).toBeNull();
    expect(ordersRepository.create).not.toHaveBeenCalled();
  });
});
