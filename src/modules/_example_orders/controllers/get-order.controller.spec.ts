import { GetOrderController } from './get-order.controller';
import { TGetOrderService } from '../services/get-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { Result } from '@/@shared/classes/result';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { OrderNotFoundException } from '../errors/order-not-found.exception';

describe('GetOrderController', () => {
  let controller: GetOrderController;
  let getOrderService: jest.Mocked<TGetOrderService>;
  let orderPresenter: jest.Mocked<IOrderPresenter>;

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
    getOrderService = { execute: jest.fn() };
    orderPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new GetOrderController(getOrderService, orderPresenter);
  });

  it('should call the service and present the order on success', async () => {
    getOrderService.execute.mockResolvedValue(Result.success(order));
    orderPresenter.present.mockReturnValue({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });

    const response = await controller.getOrder({ id });

    expect(getOrderService.execute).toHaveBeenCalledWith({ id });
    expect(orderPresenter.present).toHaveBeenCalledWith({ entity: order });
    expect(response.id).toBe(order.id);
  });

  it('should throw the Result error when the order is not found', async () => {
    const error = new OrderNotFoundException(id);
    getOrderService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.getOrder({ id })).rejects.toThrow(error);
    expect(orderPresenter.present).not.toHaveBeenCalled();
  });
});
