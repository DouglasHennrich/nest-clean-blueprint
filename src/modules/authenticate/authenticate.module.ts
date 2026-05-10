import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import { CryptographyModule } from "@/@shared/modules/cryptography/cryptography.module";
import { JwtStrategy } from "./services/jwt-strategy.service";
import { JwtAuthenticateGuard } from "./guard/jwt-authenticate.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      imports: [EnvModule],
      inject: [TEnvService],
      useFactory: (env: TEnvService) => ({
        privateKey: Buffer.from(env.get("AUTH_JWT_PRIVATE_KEY"), "base64"),
        publicKey: Buffer.from(env.get("AUTH_JWT_PUBLIC_KEY"), "base64"),
        signOptions: {
          algorithm: "RS256",
          // AUTH_JWT_EXPIRES_IN is a validated string (e.g. "1d"). Cast through
          // unknown to satisfy jsonwebtoken's StringValue template-literal type.
          expiresIn: env.get("AUTH_JWT_EXPIRES_IN") as unknown as NonNullable<
            import("@nestjs/jwt").JwtSignOptions["expiresIn"]
          >,
        },
      }),
    }),
    CryptographyModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthenticateGuard,
    },
  ],
  exports: [CryptographyModule],
})
export class AuthenticateModule {}
