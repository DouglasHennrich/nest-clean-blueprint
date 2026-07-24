import { Module } from '@nestjs/common';
import { EnvModule } from '@/modules/env/env.module';
import { TEnvService } from '@/modules/env/services/env.service';
import {
  ENCRYPT_DECRYPT_PROVIDER_OPTIONS,
  IEncryptDecryptProviderOptionsModel,
  TEncryptDecryptProvider,
} from './models/encrypt-decrypt-provider.struct';
import { NodeCryptoProvider } from './providers/node-crypto.provider';

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: ENCRYPT_DECRYPT_PROVIDER_OPTIONS,
      useFactory: (env: TEnvService): IEncryptDecryptProviderOptionsModel => ({
        algorithm: env.get('EXTERNAL_ENCRYPT_DECRYPT_ALGORITHM'),
        encryptionKey: env.get('EXTERNAL_ENCRYPT_DECRYPT_KEY'),
        iv: env.get('EXTERNAL_ENCRYPT_DECRYPT_IV'),
      }),
      inject: [TEnvService],
    },
    { provide: TEncryptDecryptProvider, useClass: NodeCryptoProvider },
  ],
  exports: [TEncryptDecryptProvider],
})
export class EncryptDecryptProviderModule {}
