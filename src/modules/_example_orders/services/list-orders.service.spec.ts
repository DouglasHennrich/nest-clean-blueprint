import { ListOrdersService } from './list-orders.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TEnvService } from '@/modules/env/services/env.service';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { IPaginationModel } from '@/@shared/classes/repository';

describe('ListOrdersService', () => {
  let service: ListOrdersService;
  let ordersRepository: jest.Mocked<IOrdersRepository>;
  let envService: jest.Mocked<TEnvService>;
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

  const page: IPaginationModel<IOrderModel> = {
    data: [order],
    hasNextPage: false,
    total: 1,
  };

  beforeEach(() => {
    ordersRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<IOrdersRepository>;

    envService = {
      get: jest.fn(),
    };

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new ListOrdersService(envService, ordersRepository, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('ListOrdersService');
  });

  it('should return a paginated list wrapped in a successful Result', async () => {
    ordersRepository.find.mockResolvedValue(page);

    const result = await service.execute({ page: 1, offset: 10 });

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(page);
    expect(ordersRepository.find).toHaveBeenCalledWith({
      where: undefined,
      page: 1,
      offset: 10,
      order: { createdAt: 'DESC' },
    });
  });

  it('should filter by status when provided', async () => {
    ordersRepository.find.mockResolvedValue(page);

    await service.execute({ status: OrderStatusEnum.PAID });

    expect(ordersRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: OrderStatusEnum.PAID } }),
    );
  });

  it('should return a failed Result and skip repository call on invalid dto', async () => {
    const result = await service.execute({ status: 'INVALID' } as never);

    expect(result.error).toBeDefined();
    expect(ordersRepository.find).not.toHaveBeenCalled();
  });
});
