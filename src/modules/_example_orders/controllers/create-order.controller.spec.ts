import { CreateOrderController } from './create-order.controller';
import { TCreateOrderService } from '../services/create-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { Result } from '@/@shared/classes/result';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';
import { DefaultException } from '@/@shared/errors/abstract-application-exception';

describe('CreateOrderController', () => {
  let controller: CreateOrderController;
  let createOrderService: jest.Mocked<TCreateOrderService>;
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

  beforeEach(() => {
    createOrderService = { execute: jest.fn() };
    orderPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new CreateOrderController(createOrderService, orderPresenter);
  });

  it('should call the service and present the created order on success', async () => {
    createOrderService.execute.mockResolvedValue(Result.success(order));
    orderPresenter.present.mockReturnValue({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });

    const dto = { customerName: 'John Doe', amount: 100 };
    const response = await controller.createOrder(dto);

    expect(createOrderService.execute).toHaveBeenCalledWith(dto);
    expect(orderPresenter.present).toHaveBeenCalledWith({ entity: order });
    expect(response.id).toBe(order.id);
  });

  it('should throw the Result error when the service fails', async () => {
    const error = new DefaultException('Validation failed', 'ValidationError', 400);
    createOrderService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.createOrder({ customerName: 'John Doe', amount: 100 })).rejects.toThrow(
      error,
    );
    expect(orderPresenter.present).not.toHaveBeenCalled();
  });
});
