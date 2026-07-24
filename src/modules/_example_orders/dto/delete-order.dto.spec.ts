import { deleteOrderDtoSchema } from './delete-order.dto';

describe('deleteOrderDtoSchema', () => {
  it('should parse a valid uuid', () => {
    const result = deleteOrderDtoSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject a non-uuid id', () => {
    const result = deleteOrderDtoSchema.safeParse({ id: 'nope' });

    expect(result.success).toBe(false);
  });
});
