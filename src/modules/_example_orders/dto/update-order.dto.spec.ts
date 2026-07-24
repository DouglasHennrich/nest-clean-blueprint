import {
  updateOrderParamDtoSchema,
  updateOrderDtoSchema,
  updateOrderServiceDtoSchema,
} from './update-order.dto';
import { OrderStatusEnum } from '../enums/order-status.enum';

describe('updateOrderParamDtoSchema', () => {
  it('should parse a valid uuid', () => {
    const result = updateOrderParamDtoSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject a non-uuid id', () => {
    const result = updateOrderParamDtoSchema.safeParse({ id: 'nope' });

    expect(result.success).toBe(false);
  });
});

describe('updateOrderDtoSchema', () => {
  it('should parse a valid partial payload', () => {
    const result = updateOrderDtoSchema.safeParse({
      customerName: 'Jane Doe',
      status: OrderStatusEnum.PAID,
    });

    expect(result.success).toBe(true);
  });

  it('should parse an empty payload since all fields are optional', () => {
    const result = updateOrderDtoSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should reject an invalid status', () => {
    const result = updateOrderDtoSchema.safeParse({ status: 'INVALID' });

    expect(result.success).toBe(false);
  });

  it('should reject a non-positive amount', () => {
    const result = updateOrderDtoSchema.safeParse({ amount: -5 });

    expect(result.success).toBe(false);
  });
});

describe('updateOrderServiceDtoSchema', () => {
  it('should parse a valid payload including id', () => {
    const result = updateOrderServiceDtoSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'Jane Doe',
    });

    expect(result.success).toBe(true);
  });

  it('should reject a payload missing id', () => {
    const result = updateOrderServiceDtoSchema.safeParse({ customerName: 'Jane Doe' });

    expect(result.success).toBe(false);
  });
});
