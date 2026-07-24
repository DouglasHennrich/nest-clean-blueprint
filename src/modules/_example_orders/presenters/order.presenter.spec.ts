import { OrderPresenter } from './order.presenter';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { IOrderModel } from '../models/order.struct';

describe('OrderPresenter', () => {
  let presenter: OrderPresenter;

  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const order: IOrderModel = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'ORD-ABCD1234',
    customerName: 'John Doe',
    amount: '100.50' as unknown as number, // numeric columns come back as strings from TypeORM
    status: OrderStatusEnum.PENDING,
    createdAt,
    updatedAt,
  };

  beforeEach(() => {
    presenter = new OrderPresenter();
  });

  describe('present', () => {
    it('should map an order model to the response shape', () => {
      const result = presenter.present({ entity: order });

      expect(result).toEqual({
        id: order.id,
        code: order.code,
        customerName: order.customerName,
        amount: 100.5,
        status: OrderStatusEnum.PENDING,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
    });

    it('should coerce the amount to a number', () => {
      const result = presenter.present({ entity: order });

      expect(typeof result.amount).toBe('number');
    });
  });

  describe('presentMany', () => {
    it('should map a list of order models', () => {
      const results = presenter.presentMany({ entities: [order, { ...order, id: 'other-id' }] });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(order.id);
      expect(results[1].id).toBe('other-id');
    });

    it('should return an empty array for an empty list', () => {
      expect(presenter.presentMany({ entities: [] })).toEqual([]);
    });
  });

  describe('presentWithoutRelations', () => {
    it('should delegate to present with the withoutRelations option', () => {
      const result = presenter.presentWithoutRelations(order);

      expect(result.id).toBe(order.id);
    });
  });

  describe('presentSuccess', () => {
    it('should wrap data in a success envelope', () => {
      expect(presenter.presentSuccess({ foo: 'bar' })).toEqual({
        success: true,
        data: { foo: 'bar' },
      });
    });

    it('should omit data when none is provided', () => {
      expect(presenter.presentSuccess()).toEqual({ success: true });
    });
  });
});
