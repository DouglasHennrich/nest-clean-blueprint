import { Module } from "@nestjs/common";
import { EnvModule } from "@/modules/env/env.module";
import { TEnvService } from "@/modules/env/services/env.service";
import {
  ENCRYPT_DECRYPT_PROVIDER_OPTIONS,
  IEncryptDecryptProviderOptions,
  TEncryptDecryptProvider,
} from "./models/encrypt-decrypt-provider.struct";
import { NodeCryptoProvider } from "./providers/node-crypto.provider";

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: ENCRYPT_DECRYPT_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IEncryptDecryptProviderOptions => ({
        algorithm: env.get("ENCRYPT_ALGORITHM"),
        encryptionKey: env.get("ENCRYPT_KEY"),
        iv: env.get("ENCRYPT_IV"),
      }),
      inject: [TEnvService],
    },
    { provide: TEncryptDecryptProvider, useClass: NodeCryptoProvider },
  ],
  exports: [TEncryptDecryptProvider],
})
export class EncryptDecryptProviderModule {}
