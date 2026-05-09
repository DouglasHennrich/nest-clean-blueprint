# Encrypt-decrypt provider

Symmetric encryption for sensitive fields stored in the database (PII, third-party tokens, secrets that need to round-trip). Uses Node's built-in `crypto`.

## Module

```typescript
imports: [EncryptDecryptProviderModule]
```

## Configuration (env)

| Var | Default | Notes |
|---|---|---|
| `ENCRYPT_ALGORITHM` | `aes-256-cbc` | Any algorithm `crypto.createCipheriv` accepts |
| `ENCRYPT_KEY` | — | 32 bytes for AES-256 |
| `ENCRYPT_IV` | — | 16 bytes for AES-256-CBC |

Generate keys:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # KEY
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  # IV
```

> ⚠️ Treat `ENCRYPT_KEY` and `ENCRYPT_IV` as production secrets. Rotate by re-encrypting affected rows; keep old keys around to decrypt legacy data.

## Inject

```typescript
constructor(private encryptDecryptProvider: TEncryptDecryptProvider) {}

const enc = this.encryptDecryptProvider.encrypt('sensitive');     // hex string
const plain = this.encryptDecryptProvider.decrypt(enc);
```

## Storage strategy

Store the hex string in a regular `varchar` / `text` column. Decrypt on read in the repository or a custom TypeORM `transformer`:

```typescript
@Column({
  type: 'text',
  transformer: {
    to: (val: string) => encryptProvider.encrypt(val),
    from: (val: string) => encryptProvider.decrypt(val),
  },
})
ssn: string;
```

(Wire `encryptProvider` via a TypeORM subscriber or static singleton — TypeORM transformers don't go through Nest DI.)

## API

```typescript
abstract class TEncryptDecryptProvider {
  encrypt(text: string): string;        // returns hex; '' for empty input
  decrypt(encryptedText: string): string; // returns plaintext; '' on failure
}
```

`decrypt` returns `''` instead of throwing so callers can decide how to react (e.g. mark the field as "rotation needed"). Audit log when this happens.

## Choosing an algorithm

`aes-256-cbc` works with the IV-based API and is widely supported. For new projects consider `aes-256-gcm` (authenticated encryption — protects against tampering). To switch:

1. Update `ENCRYPT_ALGORITHM` to `aes-256-gcm`.
2. Replace this provider's implementation to use `cipher.getAuthTag()` and prepend it to ciphertext (GCM requires the auth tag to decrypt).
3. Re-encrypt existing data.

## Tests

```typescript
const provider = new NodeCryptoProvider({
  algorithm: 'aes-256-cbc',
  encryptionKey: 'a'.repeat(32),
  iv: 'b'.repeat(16),
});

const enc = provider.encrypt('hello');
expect(provider.decrypt(enc)).toBe('hello');
expect(provider.decrypt('garbage')).toBe(''); // graceful fail
```
