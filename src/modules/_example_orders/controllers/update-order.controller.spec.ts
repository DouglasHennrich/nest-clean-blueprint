import { UpdateOrderController } from './update-order.controller';
import { TUpdateOrderService } from '../services/update-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { Result } from '@/@shared/classes/result';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { OrderNotFoundException } from '../errors/order-not-found.exception';

describe('UpdateOrderController', () => {
  let controller: UpdateOrderController;
  let updateOrderService: jest.Mocked<TUpdateOrderService>;
  let orderPresenter: jest.Mocked<IOrderPresenter>;

  const id = '123e4567-e89b-12d3-a456-426614174000';
  const order: IOrderModel = {
    id,
    code: 'ORD-ABCD1234',
    customerName: 'Jane Doe',
    amount: 100,
    status: OrderStatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    updateOrderService = { execute: jest.fn() };
    orderPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new UpdateOrderController(updateOrderService, orderPresenter);
  });

  it('should merge the route param id into the body before calling the service', async () => {
    updateOrderService.execute.mockResolvedValue(Result.success(order));
    orderPresenter.present.mockReturnValue({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });

    const response = await controller.updateOrder({ id }, { customerName: 'Jane Doe' });

    expect(updateOrderService.execute).toHaveBeenCalledWith({ id, customerName: 'Jane Doe' });
    expect(orderPresenter.present).toHaveBeenCalledWith({ entity: order });
    expect(response.customerName).toBe('Jane Doe');
  });

  it('should throw the Result error when the order is not found', async () => {
    const error = new OrderNotFoundException(id);
    updateOrderService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.updateOrder({ id }, { customerName: 'Jane Doe' })).rejects.toThrow(
      error,
    );
    expect(orderPresenter.present).not.toHaveBeenCalled();
  });
});
