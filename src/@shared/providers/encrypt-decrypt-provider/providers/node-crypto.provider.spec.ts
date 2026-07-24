import { NodeCryptoProvider } from './node-crypto.provider';

describe('NodeCryptoProvider', () => {
  // aes-256-cbc requires a 32-byte key and a 16-byte iv.
  const options = {
    algorithm: 'aes-256-cbc',
    encryptionKey: '01234567890123456789012345678901',
    iv: '0123456789012345',
  };

  let provider: NodeCryptoProvider;

  beforeEach(() => {
    provider = new NodeCryptoProvider(options);
  });

  describe('encrypt', () => {
    it('should return an empty string for empty input', () => {
      expect(provider.encrypt('')).toBe('');
    });

    it('should return a hex string different from the plaintext', () => {
      const encrypted = provider.encrypt('hello world');

      expect(encrypted).not.toBe('hello world');
      expect(/^[0-9a-f]+$/i.test(encrypted)).toBe(true);
    });
  });

  describe('decrypt', () => {
    it('should return an empty string for empty input', () => {
      expect(provider.decrypt('')).toBe('');
    });

    it('should round-trip encrypt -> decrypt back to the original text', () => {
      const plain = 'sensitive-data-123';

      const encrypted = provider.encrypt(plain);
      const decrypted = provider.decrypt(encrypted);

      expect(decrypted).toBe(plain);
    });

    it('should return an empty string when decryption fails (invalid hex payload)', () => {
      const decrypted = provider.decrypt('not-valid-hex-ciphertext');

      expect(decrypted).toBe('');
    });
  });
});
