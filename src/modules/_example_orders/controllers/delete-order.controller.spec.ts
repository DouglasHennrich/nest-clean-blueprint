import { DeleteOrderController } from './delete-order.controller';
import { TDeleteOrderService } from '../services/delete-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { Result } from '@/@shared/classes/result';
import { OrderNotFoundException } from '../errors/order-not-found.exception';

describe('DeleteOrderController', () => {
  let controller: DeleteOrderController;
  let deleteOrderService: jest.Mocked<TDeleteOrderService>;
  let orderPresenter: jest.Mocked<IOrderPresenter>;

  const id = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    deleteOrderService = { execute: jest.fn() };
    orderPresenter = {
      present: jest.fn(),
      presentMany: jest.fn(),
      presentWithoutRelations: jest.fn(),
      presentSuccess: jest.fn(),
    };

    controller = new DeleteOrderController(deleteOrderService, orderPresenter);
  });

  it('should call the service and present a success envelope', async () => {
    deleteOrderService.execute.mockResolvedValue(Result.success());
    orderPresenter.presentSuccess.mockReturnValue({ success: true });

    const response = await controller.deleteOrder({ id });

    expect(deleteOrderService.execute).toHaveBeenCalledWith({ id });
    expect(orderPresenter.presentSuccess).toHaveBeenCalled();
    expect(response).toEqual({ success: true });
  });

  it('should throw the Result error when the order is not found', async () => {
    const error = new OrderNotFoundException(id);
    deleteOrderService.execute.mockResolvedValue(Result.fail(error));

    await expect(controller.deleteOrder({ id })).rejects.toThrow(error);
    expect(orderPresenter.presentSuccess).not.toHaveBeenCalled();
  });
});
