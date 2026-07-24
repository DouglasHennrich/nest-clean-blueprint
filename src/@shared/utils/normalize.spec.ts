import type { Request } from 'express';
import { Normalize } from './normalize';

describe('Normalize', () => {
  describe('email', () => {
    it('should trim whitespace and lowercase the email', () => {
      expect(Normalize.email('  John.Doe@Example.com  ')).toBe('john.doe@example.com');
    });
  });

  describe('name', () => {
    it('should slugify the name with underscore separators', () => {
      expect(Normalize.name('João Da Silva')).toBe('joao_da_silva');
    });

    it('should return an empty string for empty input', () => {
      expect(Normalize.name('')).toBe('');
    });
  });

  describe('captilizeFirstLetter', () => {
    it('should capitalize the first letter and lowercase the rest', () => {
      expect(Normalize.captilizeFirstLetter('hELLO')).toBe('Hello');
    });
  });

  describe('onlyNumbers', () => {
    it('should strip all non-digit characters', () => {
      expect(Normalize.onlyNumbers('R$ 1.234,56')).toBe('123456');
    });

    it('should return an empty string when there are no digits', () => {
      expect(Normalize.onlyNumbers('abc')).toBe('');
    });
  });

  describe('companyName', () => {
    it('should slugify the company name', () => {
      expect(Normalize.companyName('Acme & Co.')).toBe('acme_and_co');
    });
  });

  describe('snakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(Normalize.snakeCase('myVariableName')).toBe('my_variable_name');
    });

    it('should convert spaces and hyphens to underscores', () => {
      expect(Normalize.snakeCase('my variable-name')).toBe('my_variable_name');
    });
  });

  describe('realIp', () => {
    const buildReq = (overrides: Record<string, unknown> = {}): Request =>
      ({
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        ...overrides,
      }) as unknown as Request;

    it('should use the first ip from x-forwarded-for when present as a string', () => {
      const req = buildReq({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });

      expect(Normalize.realIp(req)).toBe('1.2.3.4');
    });

    it('should use the first ip from x-forwarded-for when present as an array', () => {
      const req = buildReq({ headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] } });

      expect(Normalize.realIp(req)).toBe('1.2.3.4');
    });

    it('should fall back to x-real-ip when x-forwarded-for is absent', () => {
      const req = buildReq({ headers: { 'x-real-ip': '9.9.9.9' } });

      expect(Normalize.realIp(req)).toBe('9.9.9.9');
    });

    it('should use the first entry when x-real-ip is an array', () => {
      const req = buildReq({ headers: { 'x-real-ip': ['9.9.9.9', '8.8.8.8'] } });

      expect(Normalize.realIp(req)).toBe('9.9.9.9');
    });

    it('should fall back to req.ip and strip the ::ffff: IPv6 prefix', () => {
      const req = buildReq({ ip: '::ffff:127.0.0.1' });

      expect(Normalize.realIp(req)).toBe('127.0.0.1');
    });

    it('should fall back to socket.remoteAddress when req.ip is missing', () => {
      const req = buildReq({ ip: undefined, socket: { remoteAddress: '10.0.0.1' } });

      expect(Normalize.realIp(req)).toBe('10.0.0.1');
    });

    it('should return "unknown" when no ip source is available', () => {
      const req = buildReq({ ip: undefined, socket: { remoteAddress: undefined } });

      expect(Normalize.realIp(req)).toBe('unknown');
    });
  });

  describe('httpFilename', () => {
    it('should strip diacritics and non-ascii characters', () => {
      expect(Normalize.httpFilename('Relatório_Ação.pdf')).toBe('Relatorio_Acao.pdf');
    });

    it('should trim surrounding whitespace', () => {
      expect(Normalize.httpFilename('  file.pdf  ')).toBe('file.pdf');
    });
  });
});
