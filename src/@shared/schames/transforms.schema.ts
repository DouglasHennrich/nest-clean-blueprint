import z from 'zod';

export const stringToBooleanSchema = z.union([
  z.string().transform((value) => value === 'true' || value === '1'),
  z.boolean(),
]);

export const stringToNumberSchema = z.union([
  z.string().transform((value) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }),
  z.number(),
]);

export const stringToArraySchema = z.preprocess((value): unknown => {
  // If already an array, return as is
  if (Array.isArray(value)) {
    return value as unknown[];
  }

  // If not a string, wrap in array
  if (typeof value !== 'string') {
    return [value] as unknown[];
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(value);
    // If parsed successfully but not an array, wrap it
    if (!Array.isArray(parsed)) {
      return [parsed] as unknown[];
    }
    return parsed as unknown[];
  } catch {
    // If not JSON, try comma-separated
    const values = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // If no comma was found, return the original value as a single-item array
    return values.length > 0 ? values : [value];
  }
}, z.array(z.any()));

export const stringToTypedArraySchema = <T>(itemSchema: z.ZodSchema<T>) =>
  z.preprocess((value): unknown => {
    // If already an array, return as is
    if (Array.isArray(value)) {
      return value as unknown[];
    }

    // If not a string, wrap in array
    if (typeof value !== 'string') {
      return [value] as unknown[];
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      // If parsed successfully but not an array, wrap it
      if (!Array.isArray(parsed)) {
        return [parsed] as unknown[];
      }
      return parsed as unknown[];
    } catch {
      // If not JSON, try comma-separated
      const values = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // If no comma was found, return the original value as a single-item array
      return values.length > 0 ? values : [value];
    }
  }, z.array(itemSchema));
