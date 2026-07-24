import { uuidParamSchema } from './uuid-param.schema';

describe('uuidParamSchema', () => {
  it('should accept a valid UUID', () => {
    const result = uuidParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    }
  });

  it('should reject an invalid UUID string', () => {
    const result = uuidParamSchema.safeParse({ id: 'not-a-uuid' });

    expect(result.success).toBe(false);
  });

  it('should reject when id is missing', () => {
    const result = uuidParamSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
