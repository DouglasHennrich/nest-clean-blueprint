import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

/**
 * THasher — DI token for password hashing operations.
 */
export abstract class THasher {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}

@Injectable()
export class BcryptHasher implements THasher {
  private readonly saltRounds = 10;

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
