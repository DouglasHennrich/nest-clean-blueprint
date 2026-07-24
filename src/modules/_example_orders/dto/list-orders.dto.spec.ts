import { listOrdersDtoSchema } from './list-orders.dto';
import { OrderStatusEnum } from '../enums/order-status.enum';

describe('listOrdersDtoSchema', () => {
  it('should parse a valid payload with all fields', () => {
    const result = listOrdersDtoSchema.safeParse({
      page: '2',
      offset: '10',
      status: OrderStatusEnum.PAID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 2, offset: 10, status: OrderStatusEnum.PAID });
    }
  });

  it('should parse an empty payload since all fields are optional', () => {
    const result = listOrdersDtoSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should reject an invalid status', () => {
    const result = listOrdersDtoSchema.safeParse({ status: 'NOT_A_STATUS' });

    expect(result.success).toBe(false);
  });

  it('should reject a non-positive page', () => {
    const result = listOrdersDtoSchema.safeParse({ page: '-1' });

    expect(result.success).toBe(false);
  });
});
