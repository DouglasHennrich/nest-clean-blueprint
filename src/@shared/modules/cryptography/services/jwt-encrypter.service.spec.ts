import { JwtService } from '@nestjs/jwt';
import { JwtEncrypter } from './jwt-encrypter.service';

describe('JwtEncrypter', () => {
  let jwtService: JwtService;
  let encrypter: JwtEncrypter;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    encrypter = new JwtEncrypter(jwtService);
  });

  describe('encrypt', () => {
    it('should delegate to JwtService.signAsync and return a token', async () => {
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');

      const token = await encrypter.encrypt({ sub: 'user-1' });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
      expect(signAsyncSpy).toHaveBeenCalledWith({ sub: 'user-1' });
    });
  });

  describe('decrypt', () => {
    it('should delegate to JwtService.verifyAsync and return the decoded payload', async () => {
      const token = await encrypter.encrypt({ sub: 'user-1', role: 'admin' });

      const payload = await encrypter.decrypt(token);

      expect(payload.sub).toBe('user-1');
      expect(payload.role).toBe('admin');
    });

    it('should reject when the token is invalid', async () => {
      await expect(encrypter.decrypt('not-a-valid-token')).rejects.toThrow();
    });
  });
});
