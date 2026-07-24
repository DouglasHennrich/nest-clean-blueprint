import { z } from 'zod';
import {
  stringToBooleanSchema,
  stringToNumberSchema,
  stringToArraySchema,
  stringToTypedArraySchema,
} from './transforms.schema';

describe('transforms.schema', () => {
  describe('stringToBooleanSchema', () => {
    it('should transform "true" and "1" strings to true', () => {
      expect(stringToBooleanSchema.parse('true')).toBe(true);
      expect(stringToBooleanSchema.parse('1')).toBe(true);
    });

    it('should transform any other string to false', () => {
      expect(stringToBooleanSchema.parse('false')).toBe(false);
      expect(stringToBooleanSchema.parse('nope')).toBe(false);
    });

    it('should pass booleans through unchanged', () => {
      expect(stringToBooleanSchema.parse(true)).toBe(true);
      expect(stringToBooleanSchema.parse(false)).toBe(false);
    });
  });

  describe('stringToNumberSchema', () => {
    it('should transform a numeric string into a number', () => {
      expect(stringToNumberSchema.parse('42')).toBe(42);
    });

    it('should transform a non-numeric string into undefined', () => {
      expect(stringToNumberSchema.parse('abc')).toBeUndefined();
    });

    it('should pass numbers through unchanged', () => {
      expect(stringToNumberSchema.parse(7)).toBe(7);
    });
  });

  describe('stringToArraySchema', () => {
    it('should pass an array through unchanged', () => {
      expect(stringToArraySchema.parse(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('should wrap a non-string, non-array value in an array', () => {
      expect(stringToArraySchema.parse(5)).toEqual([5]);
    });

    it('should parse a JSON array string', () => {
      expect(stringToArraySchema.parse('["a","b"]')).toEqual(['a', 'b']);
    });

    it('should wrap a JSON non-array value in an array', () => {
      expect(stringToArraySchema.parse('5')).toEqual([5]);
    });

    it('should split a comma-separated string', () => {
      expect(stringToArraySchema.parse('a, b, c')).toEqual(['a', 'b', 'c']);
    });

    it('should wrap a plain string with no comma in a single-item array', () => {
      expect(stringToArraySchema.parse('single')).toEqual(['single']);
    });
  });

  describe('stringToTypedArraySchema', () => {
    const numberArraySchema = stringToTypedArraySchema(z.coerce.number());

    it('should pass an array through and validate each item', () => {
      expect(numberArraySchema.parse([1, 2])).toEqual([1, 2]);
    });

    it('should wrap a non-string, non-array value in an array', () => {
      expect(numberArraySchema.parse(5)).toEqual([5]);
    });

    it('should parse a JSON array string and validate items', () => {
      expect(numberArraySchema.parse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should split a comma-separated string and validate items', () => {
      expect(numberArraySchema.parse('1,2,3')).toEqual([1, 2, 3]);
    });

    it('should wrap a plain string with no comma in a single-item array', () => {
      const stringArraySchema = stringToTypedArraySchema(z.string());
      expect(stringArraySchema.parse('single')).toEqual(['single']);
    });

    it('should throw when an item fails the item schema', () => {
      expect(() => numberArraySchema.parse(['not-a-number'])).toThrow();
    });
  });
});
