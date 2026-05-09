import * as crypto from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  ENCRYPT_DECRYPT_PROVIDER_OPTIONS,
  IEncryptDecryptProviderOptions,
  TEncryptDecryptProvider,
} from "../models/encrypt-decrypt-provider.struct";

/**
 * NodeCryptoProvider
 *
 * Symmetric encryption via Node's crypto module. Algorithm, key and IV come
 * from env (ENCRYPT_ALGORITHM / ENCRYPT_KEY / ENCRYPT_IV).
 *
 * encrypt() returns hex; decrypt() reverses it. Returns '' on failure rather
 * than throwing — the caller decides how to react.
 */
@Injectable()
export class NodeCryptoProvider implements TEncryptDecryptProvider {
  constructor(
    @Inject(ENCRYPT_DECRYPT_PROVIDER_OPTIONS)
    private readonly options: IEncryptDecryptProviderOptions,
  ) {}

  encrypt(text: string): string {
    if (!text || !text.length) return "";

    const cipher = crypto.createCipheriv(
      this.options.algorithm,
      this.options.encryptionKey,
      this.options.iv,
    );
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.length) return "";

    try {
      const decipher = crypto.createDecipheriv(
        this.options.algorithm,
        this.options.encryptionKey,
        this.options.iv,
      );
      let decrypted = decipher.update(encryptedText, "hex", "utf-8");
      decrypted += decipher.final("utf-8");
      return decrypted;
    } catch {
      return "";
    }
  }
}
