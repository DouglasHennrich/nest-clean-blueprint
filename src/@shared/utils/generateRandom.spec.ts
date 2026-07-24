import { GenerateRandom } from './generateRandom';

describe('GenerateRandom', () => {
  describe('number', () => {
    it('should generate a number within the range for the default length', () => {
      const value = GenerateRandom.number();

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(10 ** 16 - 1);
    });

    it('should generate a number within the range for a custom length', () => {
      const value = GenerateRandom.number(2);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
    });
  });

  describe('text', () => {
    it('should generate a string using only allowed characters', () => {
      const value = GenerateRandom.text(16);

      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(/^[A-Za-z0-9.-]*$/.test(value)).toBe(true);
    });

    it('should respect a custom length (before trimming)', () => {
      const value = GenerateRandom.text(5);

      expect(value.length).toBeLessThanOrEqual(6);
    });
  });

  describe('mixed', () => {
    it('should generate a string of the requested length using the mixed charset', () => {
      const value = GenerateRandom.mixed(30);

      expect(value).toHaveLength(30);
    });

    it('should respect a custom length', () => {
      const value = GenerateRandom.mixed(10);

      expect(value).toHaveLength(10);
    });
  });

  describe('id', () => {
    it('should generate a valid v4 uuid', () => {
      const value = GenerateRandom.id();

      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('hexColor', () => {
    it('should generate a valid hex color string', () => {
      const value = GenerateRandom.hexColor();

      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should generate different-looking colors across calls (sanity check over multiple runs)', () => {
      const colors = new Set(Array.from({ length: 20 }, () => GenerateRandom.hexColor()));

      // Not a strict uniqueness guarantee, but with 20 samples over a large
      // hue range we expect more than one distinct color.
      expect(colors.size).toBeGreaterThan(1);
    });
  });
});
