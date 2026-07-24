import { Argon2Hasher } from './argon2-hasher.service';

describe('Argon2Hasher', () => {
  let hasher: Argon2Hasher;

  beforeEach(() => {
    hasher = new Argon2Hasher();
  });

  describe('hash', () => {
    it('should produce an argon2id hash string different from the plaintext', async () => {
      const hash = await hasher.hash('my-plain-password');

      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('my-plain-password');
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
  });

  describe('compare', () => {
    it('should return true when the plaintext matches the hash', async () => {
      const hash = await hasher.hash('correct-password');

      const result = await hasher.compare('correct-password', hash);

      expect(result).toBe(true);
    });

    it('should return false when the plaintext does not match the hash', async () => {
      const hash = await hasher.hash('correct-password');

      const result = await hasher.compare('wrong-password', hash);

      expect(result).toBe(false);
    });
  });
});
