import { createOrderDtoSchema } from './create-order.dto';

describe('createOrderDtoSchema', () => {
  it('should parse a valid payload', () => {
    const result = createOrderDtoSchema.safeParse({
      customerName: 'John Doe',
      amount: 100.5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ customerName: 'John Doe', amount: 100.5 });
    }
  });

  it('should reject an empty customerName', () => {
    const result = createOrderDtoSchema.safeParse({
      customerName: '',
      amount: 100,
    });

    expect(result.success).toBe(false);
  });

  it('should reject a non-positive amount', () => {
    const result = createOrderDtoSchema.safeParse({
      customerName: 'John Doe',
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = createOrderDtoSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
