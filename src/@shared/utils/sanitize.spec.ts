import { Sanitize } from './sanitize';

describe('Sanitize', () => {
  describe('data', () => {
    it('should mask sensitive keys', () => {
      const input = {
        password: '123',
        token: 'secret-token',
        user: {
          name: 'John',
          password: '456',
        },
        list: [{ token: 'abc' }, { normal: 'def' }],
      };

      const result = Sanitize.data(input);
      const parsed = JSON.parse(result!);

      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.token).toBe('[REDACTED]');
      expect(parsed.user.password).toBe('[REDACTED]');
      expect(parsed.user.name).toBe('John');
      expect(parsed.list[0].token).toBe('[REDACTED]');
      expect(parsed.list[1].normal).toBe('def');
    });

    it('should mask sensitive keys case-insensitively', () => {
      const input = {
        PASSWORD: '123',
        ConfirmPassword: '456',
        'auth-token': 'abc', // Not in list yet, but let's check one that is
        SSN: '789',
      };

      const result = Sanitize.data(input);
      const parsed = JSON.parse(result!);

      expect(parsed.PASSWORD).toBe('[REDACTED]');
      expect(parsed.ConfirmPassword).toBe('[REDACTED]');
      expect(parsed.SSN).toBe('[REDACTED]');
    });

    it('should return undefined if input is empty or null', () => {
      expect(Sanitize.data(null)).toBeUndefined();
      expect(Sanitize.data(undefined)).toBeUndefined();
      expect(Sanitize.data({})).toBeUndefined();
    });

    it('should return undefined on error', () => {
      // Create a circular reference to trigger JSON.stringify error
      const circular: any = {};
      circular.self = circular;
      expect(Sanitize.data(circular)).toBeUndefined();
    });
  });

  describe('headers', () => {
    it('should mask sensitive headers', () => {
      const headers = {
        authorization: 'Bearer token',
        api_key: 'key-123',
        'content-type': 'application/json',
      };

      const result = Sanitize.headers(headers);
      const parsed = JSON.parse(result!);

      expect(parsed.authorization).toBe('[REDACTED]');
      expect(parsed.api_key).toBe('[REDACTED]');
      expect(parsed['content-type']).toBe('application/json');
    });
  });

  describe('file', () => {
    it('should extract metadata from a single file', () => {
      const file = {
        fieldname: 'avatar',
        originalname: 'profile.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('abc'),
        size: 100,
        filename: 'random-name.png',
        path: '/tmp/random-name.png',
      };

      const result = Sanitize.file(file);
      const parsed = JSON.parse(result!);

      expect(parsed).toEqual({
        fieldname: 'avatar',
        originalname: 'profile.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 100,
        filename: 'random-name.png',
      });
      expect(parsed.buffer).toBeUndefined();
      expect(parsed.path).toBeUndefined();
    });

    it('should return undefined if file is invalid', () => {
      expect(Sanitize.file(null)).toBeUndefined();
      expect(Sanitize.file({})).toBeUndefined();
    });
  });

  describe('files', () => {
    it('should handle an array of files', () => {
      const files = [
        {
          fieldname: 'docs',
          originalname: 'doc1.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 200,
          filename: 'doc1.pdf',
        },
        {
          fieldname: 'docs',
          originalname: 'doc2.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 300,
          filename: 'doc2.pdf',
        },
      ];

      const result = Sanitize.files(files);
      const parsed = JSON.parse(result!);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].originalname).toBe('doc1.pdf');
    });

    it('should handle keyed objects of files', () => {
      const files = {
        avatar: [
          {
            fieldname: 'avatar',
            originalname: 'me.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            size: 50,
            filename: 'me.jpg',
          },
        ],
        gallery: [
          {
            fieldname: 'gallery',
            originalname: 'pic1.jpg',
            size: 150,
            filename: 'pic1.jpg',
          },
        ],
      };

      const result = Sanitize.files(files);
      const parsed = JSON.parse(result!);

      expect(parsed.avatar).toBeDefined();
      expect(parsed.avatar[0].originalname).toBe('me.jpg');
      expect(parsed.gallery[0].originalname).toBe('pic1.jpg');
    });

    it('should return undefined if input is invalid', () => {
      expect(Sanitize.files(null)).toBeUndefined();
      expect(Sanitize.files([])).toBeUndefined();
    });
  });
});
