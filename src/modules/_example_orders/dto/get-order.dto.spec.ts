import { getOrderDtoSchema } from './get-order.dto';

describe('getOrderDtoSchema', () => {
  it('should parse a valid uuid', () => {
    const result = getOrderDtoSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject a non-uuid id', () => {
    const result = getOrderDtoSchema.safeParse({ id: 'not-a-uuid' });

    expect(result.success).toBe(false);
  });

  it('should reject a missing id', () => {
    const result = getOrderDtoSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
