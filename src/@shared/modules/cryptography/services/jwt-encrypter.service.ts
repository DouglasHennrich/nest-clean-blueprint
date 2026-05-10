import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * TEncrypter — DI token for JWT token creation.
 */
export abstract class TEncrypter {
  abstract encrypt(payload: Record<string, unknown>): Promise<string>;
  abstract decrypt(token: string): Promise<Record<string, unknown>>;
}

@Injectable()
export class JwtEncrypter implements TEncrypter {
  constructor(private jwtService: JwtService) {}

  async encrypt(payload: Record<string, unknown>): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async decrypt(token: string): Promise<Record<string, unknown>> {
    return this.jwtService.verifyAsync(token);
  }
}
