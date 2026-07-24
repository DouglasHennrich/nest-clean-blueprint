import { ListOrdersController } from './list-orders.controller';
import { TListOrdersService } from '../services/list-orders.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { Result } from '@/@shared/classes/result';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { IPaginationModel } from '@/@shared/classes/repository';
import { DefaultException } from '@/@shared/errors/abstract-application-exception';

describe('ListOrdersController', () => {
  let controller: ListOrdersController;
  let listOrdersService: jest.Mocked<TListOrdersService>;
  let orderPresenter: jest.Mocked<IOrderPresenter>;

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
    hasNextPage: true,
    total: 25,
  };

  beforeEach(() => {
    listOrdersService = { execute: jest.fn() };
    orderPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new ListOrdersController(listOrdersService, orderPresenter);
  });

  it('should call the service and present the paginated list on success', async () => {
    listOrdersService.execute.mockResolvedValue(Result.success(page));
    orderPresenter.presentMany.mockReturnValue([
      {
        id: order.id,
        code: order.code,
        customerName: order.customerName,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    ]);

    const response = await controller.listOrders({});

    expect(listOrdersService.execute).toHaveBeenCalledWith({});
    expect(orderPresenter.presentMany).toHaveBeenCalledWith({ entities: page.data });
    expect(response.data).toHaveLength(1);
    expect(response.hasNextPage).toBe(true);
    expect(response.total).toBe(25);
  });

  it('should throw the Result error when the service fails', async () => {
    const error = new DefaultException('Validation failed', 'ValidationError', 400);
    listOrdersService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.listOrders({})).rejects.toThrow(error);
    expect(orderPresenter.presentMany).not.toHaveBeenCalled();
  });
});
