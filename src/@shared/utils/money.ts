import { Decimal } from 'decimal.js';
import { Normalize } from './normalize';

class ExtendedCurrency {
  private _decimal: Decimal;

  private _intValue: number;

  // AlreadyFormatted mean that the value is like 123.45 so we need to multiply by 100
  constructor(value: number | string, alreadyFormatted = false) {
    if (alreadyFormatted) {
      this._decimal = new Decimal(value);
      this._intValue = this._decimal.times(100).round().toNumber();
    } else {
      const normalizedValue = Number(Normalize.onlyNumbers(`${value}`));
      this._intValue = normalizedValue;
      this._decimal = new Decimal(normalizedValue).div(100);
    }
  }

  // Expor todos os métodos originais com compatibilidade
  get value() {
    return this._decimal.toNumber();
  }

  get intValue() {
    return this._intValue;
  }

  get dollars() {
    return this._decimal.floor().toNumber();
  }

  get cents() {
    return this._intValue % 100;
  }

  add(value: number | string | ExtendedCurrency) {
    if (value instanceof ExtendedCurrency) {
      return new ExtendedCurrency(this._intValue + value.intValue);
    }

    const valueAsDecimal = new Decimal(value);
    const newIntValue =
      this._intValue + valueAsDecimal.times(100).round().toNumber();
    return new ExtendedCurrency(newIntValue);
  }

  subtract(value: number | string | ExtendedCurrency) {
    if (value instanceof ExtendedCurrency) {
      return new ExtendedCurrency(this._intValue - value.intValue);
    }

    const valueAsDecimal = new Decimal(value);
    const newIntValue =
      this._intValue - valueAsDecimal.times(100).round().toNumber();
    return new ExtendedCurrency(newIntValue);
  }

  multiply(value: number | ExtendedCurrency) {
    if (value instanceof ExtendedCurrency) {
      const result = this._decimal.times(value._decimal);
      return new ExtendedCurrency(result.times(100).round().toNumber());
    }

    const result = this._decimal.times(value);
    return new ExtendedCurrency(result.times(100).round().toNumber());
  }

  divide(value: number | ExtendedCurrency) {
    if (value instanceof ExtendedCurrency) {
      const result = this._decimal.dividedBy(value._decimal);
      // Cria uma nova instância preservando frações de centavos
      return this.createWithDecimalCents(result.times(100));
    }

    const result = this._decimal.dividedBy(value);
    // Cria uma nova instância preservando frações de centavos
    return this.createWithDecimalCents(result.times(100));
  }

  // Método privado para criar instâncias com frações de centavos
  private createWithDecimalCents(centsDecimal: Decimal): ExtendedCurrency {
    const instance = new ExtendedCurrency(0);
    instance._decimal = centsDecimal.div(100);
    instance._intValue = centsDecimal.round().toNumber();
    return instance;
  }

  distribute(count: number): Array<ExtendedCurrency> {
    const countDecimal = new Decimal(count);
    const baseAmount = new Decimal(this._intValue)
      .dividedBy(countDecimal)
      .floor()
      .toNumber();
    const remainder = this._intValue % count;

    const results: ExtendedCurrency[] = [];
    for (let i = 0; i < count; i += 1) {
      const amount = i < remainder ? baseAmount + 1 : baseAmount;
      results.push(new ExtendedCurrency(amount));
    }

    return results;
  }

  toString(precision?: number) {
    const value = this._decimal.toFixed(precision || 2);

    return `${parseFloat(value).toLocaleString('pt-BR', {
      minimumFractionDigits: precision || 2,
      maximumFractionDigits: precision || 2,
    })}`;
  }

  // Método para obter representação com precisão completa
  toStringExact() {
    const value = this._decimal.toFixed();

    return value;
  }

  format(opts?: {
    symbol?: string;
    separator?: string;
    decimal?: string;
  }): string {
    const symbol = opts?.symbol || '';
    const separator = opts?.separator || '.';
    const decimal = opts?.decimal || ',';

    const value = this._decimal.toFixed(2);
    const [integerPart, decimalPart] = value.split('.');

    // Adiciona separadores de milhares
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      separator,
    );

    return `${symbol}${formattedInteger}${decimal}${decimalPart}`;
  }

  toJSON() {
    return this._decimal.toNumber();
  }

  toDatabase(): string {
    return this._intValue.toString();
  }

  toMoney(): string {
    return this.format({
      symbol: 'R$ ',
      separator: '.',
      decimal: ',',
    });
  }

  isZero(): boolean {
    return this._intValue === 0;
  }

  isPositive(): boolean {
    return this._intValue > 0;
  }

  isNegative(): boolean {
    return this._intValue < 0;
  }
}

const BRL = (value: number | string, alreadyFormatted = false) =>
  new ExtendedCurrency(value, alreadyFormatted);

export { BRL, ExtendedCurrency };

// Fluxo de uso:
/*
1 - sempre remover as pontuações do valor para ser utilizado -> 1.234,56 -> 123456 -> BRL(123456)
2 - para salvar no banco de dados, transformar para intValue + toString() -> BRL(123456).intValue.toString()

*/
