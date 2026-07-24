import { BRL, ExtendedCurrency } from './money';

describe('money (ExtendedCurrency / BRL)', () => {
  describe('construction', () => {
    it('should treat a raw integer as cents by default', () => {
      const value = BRL(12345);

      expect(value.value).toBe(123.45);
      expect(value.intValue).toBe(12345);
    });

    it('should treat a string with punctuation as cents after stripping non-digits', () => {
      const value = BRL('1.234,56');

      expect(value.intValue).toBe(123456);
      expect(value.value).toBe(1234.56);
    });

    it('should treat the value as already formatted (decimal) when alreadyFormatted is true', () => {
      const value = BRL(123.45, true);

      expect(value.intValue).toBe(12345);
      expect(value.value).toBe(123.45);
    });

    it('should preserve a leading minus sign on a negative raw-cents string', () => {
      const value = BRL('-500');

      expect(value.intValue).toBe(-500);
      expect(value.value).toBe(-5);
      expect(value.isNegative()).toBe(true);
    });
  });

  describe('dollars/cents', () => {
    it('should split the integer and cents parts', () => {
      const value = BRL(12345);

      expect(value.dollars).toBe(123);
      expect(value.cents).toBe(45);
    });
  });

  describe('add', () => {
    it('should add another ExtendedCurrency instance', () => {
      const a = BRL(100);
      const b = BRL(50);

      expect(a.add(b).intValue).toBe(150);
    });

    it('should add a plain number (interpreted as a decimal amount)', () => {
      const result = BRL(100).add(1);

      expect(result.intValue).toBe(200);
    });
  });

  describe('subtract', () => {
    it('should subtract another ExtendedCurrency instance', () => {
      const a = BRL(150);
      const b = BRL(50);

      expect(a.subtract(b).intValue).toBe(100);
    });

    it('should subtract a plain number', () => {
      const result = BRL(200).subtract(1);

      expect(result.intValue).toBe(100);
    });
  });

  describe('multiply', () => {
    it('should multiply by a plain number', () => {
      const result = BRL(100).multiply(3);

      expect(result.intValue).toBe(300);
    });

    it('should multiply by another ExtendedCurrency instance', () => {
      // BRL(100) -> decimal 1.00; BRL(200, true) -> decimal 200.00
      // 1.00 * 200.00 = 200.00 -> stored as 20000 cents
      const result = BRL(100).multiply(BRL(200, true));

      expect(result.intValue).toBe(20000);
    });
  });

  describe('divide', () => {
    it('should divide by a plain number, preserving cent fractions', () => {
      const result = BRL(100).divide(4);

      expect(result.intValue).toBe(25);
    });

    it('should divide by another ExtendedCurrency instance', () => {
      const result = BRL(100).divide(BRL(2, true));

      expect(result.intValue).toBe(50);
    });
  });

  describe('distribute', () => {
    it('should split an amount evenly when it divides cleanly', () => {
      const parts = BRL(300).distribute(3);

      expect(parts.map((p) => p.intValue)).toEqual([100, 100, 100]);
    });

    it('should distribute the remainder to the first entries', () => {
      const parts = BRL(100).distribute(3);

      expect(parts.map((p) => p.intValue)).toEqual([34, 33, 33]);
      const total = parts.reduce((sum, p) => sum + p.intValue, 0);
      expect(total).toBe(100);
    });
  });

  describe('toString', () => {
    it('should format using pt-BR locale with 2 decimals by default', () => {
      const value = BRL(123456);

      expect(value.toString()).toBe('1.234,56');
    });

    it('should respect a custom non-zero precision', () => {
      const value = BRL(123456);

      expect(value.toString(3)).toBe('1.234,560');
    });

    it('should respect an explicit precision of 0 (no decimals) instead of falling back to 2', () => {
      const value = BRL(123456);

      expect(value.toString(0)).toBe('1.235');
    });
  });

  describe('toStringExact', () => {
    it('should return the full precision decimal representation', () => {
      const value = BRL(12345);

      expect(value.toStringExact()).toBe('123.45');
    });
  });

  describe('format', () => {
    it('should use default separators when no options are given', () => {
      const value = BRL(123456);

      expect(value.format()).toBe('1.234,56');
    });

    it('should apply a custom symbol, separator and decimal marker', () => {
      const value = BRL(123456);

      expect(value.format({ symbol: '$', separator: ',', decimal: '.' })).toBe('$1,234.56');
    });
  });

  describe('toJSON', () => {
    it('should return the numeric decimal value', () => {
      expect(BRL(12345).toJSON()).toBe(123.45);
    });
  });

  describe('toDatabase', () => {
    it('should return the integer cents value as a string', () => {
      expect(BRL(12345).toDatabase()).toBe('12345');
    });
  });

  describe('toMoney', () => {
    it('should format as Brazilian currency with the R$ symbol', () => {
      expect(BRL(123456).toMoney()).toBe('R$ 1.234,56');
    });
  });

  describe('isZero / isPositive / isNegative', () => {
    it('should report zero correctly', () => {
      const zero = BRL(0);
      expect(zero.isZero()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(zero.isNegative()).toBe(false);
    });

    it('should report positive values correctly', () => {
      const positive = BRL(100);
      expect(positive.isPositive()).toBe(true);
      expect(positive.isZero()).toBe(false);
      expect(positive.isNegative()).toBe(false);
    });

    it('should report negative values correctly (constructed via alreadyFormatted)', () => {
      const negative = BRL(-1, true);
      expect(negative.isNegative()).toBe(true);
      expect(negative.isZero()).toBe(false);
      expect(negative.isPositive()).toBe(false);
    });
  });

  describe('ExtendedCurrency class export', () => {
    it('should be constructible directly', () => {
      const value = new ExtendedCurrency(500);

      expect(value.intValue).toBe(500);
    });
  });
});
