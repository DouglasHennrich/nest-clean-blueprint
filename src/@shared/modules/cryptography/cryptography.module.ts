import { Module } from "@nestjs/common";
import { THasher, BcryptHasher } from "./services/bcrypt-hasher.service";
import { TEncrypter, JwtEncrypter } from "./services/jwt-encrypter.service";

/**
 * CryptographyModule
 *
 * Provides THasher (bcrypt) and TEncrypter (JWT).
 * Import in AuthenticateModule — NOT global to keep scope clear.
 */
@Module({
  providers: [
    { provide: THasher, useClass: BcryptHasher },
    { provide: TEncrypter, useClass: JwtEncrypter },
  ],
  exports: [THasher, TEncrypter],
})
export class CryptographyModule {}
