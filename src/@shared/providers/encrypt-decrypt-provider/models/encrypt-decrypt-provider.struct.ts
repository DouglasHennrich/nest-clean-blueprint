export interface IEncryptDecryptProviderOptions {
  algorithm: string;
  encryptionKey: string;
  iv: string;
}

export const ENCRYPT_DECRYPT_PROVIDER_OPTIONS =
  "ENCRYPT_DECRYPT_PROVIDER_OPTIONS";

/**
 * TEncryptDecryptProvider
 *
 * Symmetric encryption used to protect sensitive fields stored in the
 * database (PII, tokens, etc.). The default implementation uses Node's
 * built-in crypto module.
 */
export abstract class TEncryptDecryptProvider {
  abstract encrypt(text: string): string;
  abstract decrypt(encryptedText: string): string;
}
