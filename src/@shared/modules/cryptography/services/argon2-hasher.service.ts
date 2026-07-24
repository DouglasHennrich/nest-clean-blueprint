import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * THasher — DI token for password hashing operations.
 */
export abstract class THasher {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}

@Injectable()
export class Argon2Hasher implements THasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
