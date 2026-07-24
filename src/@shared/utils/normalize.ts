import slugify from 'slugify';
import { Request } from 'express';

export const Normalize = {
  email: (email: string): string => {
    return email.trim().toLowerCase();
  },

  name: (name: string): string => {
    return slugify(name, {
      lower: true,
      replacement: '_',
      strict: true,
    });
  },

  captilizeFirstLetter: (value: string): string => {
    const lowerCasedValue = value.toLowerCase();

    return lowerCasedValue.charAt(0).toUpperCase() + lowerCasedValue.slice(1);
  },

  onlyNumbers: (value: string): string => {
    return value.replace(/\D/g, '');
  },

  companyName: (name: string): string => {
    return slugify(name, {
      lower: true,
      replacement: '_',
      strict: true,
    });
  },

  snakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase -> snake_case
      .replace(/[\s-]+/g, '_') // spaces and hyphens -> underscore
      .toLowerCase();
  },

  realIp(req: Request): string {
    // Attempts to extract the real IP from common proxy headers
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIp = req.headers['x-real-ip'];

    if (xForwardedFor) {
      // x-forwarded-for may contain multiple IPs, we take the first one
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
      return ips.trim();
    }

    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    // Remove o prefixo ::ffff: do IPv6 se presente
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ip.replace('::ffff:', '');
  },

  httpFilename: (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  },
};
