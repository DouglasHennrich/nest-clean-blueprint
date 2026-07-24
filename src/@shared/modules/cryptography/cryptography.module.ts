import { Module } from '@nestjs/common';
import { THasher, Argon2Hasher } from './services/argon2-hasher.service';
import { TEncrypter, JwtEncrypter } from './services/jwt-encrypter.service';

/**
 * CryptographyModule
 *
 * Provides THasher (argon2) and TEncrypter (JWT).
 * Import in AuthenticateModule — NOT global to keep scope clear.
 */
@Module({
  providers: [
    { provide: THasher, useClass: Argon2Hasher },
    { provide: TEncrypter, useClass: JwtEncrypter },
  ],
  exports: [THasher, TEncrypter],
})
export class CryptographyModule {}
