import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IEnvSchema } from "../env";

/**
 * TEnvService — DI token for type-safe env access.
 *
 * Always inject this in services that need env vars. NEVER read process.env
 * directly in application code.
 *
 * @example
 *   constructor(private envService: TEnvService) {}
 *   const limit = this.envService.get('UTILITIES_PAGINATION_LIMIT');
 */
export abstract class TEnvService {
  abstract get<K extends keyof IEnvSchema>(key: K): IEnvSchema[K];
}

@Injectable()
export class EnvService implements TEnvService {
  constructor(private configService: ConfigService<IEnvSchema, true>) {}

  get<K extends keyof IEnvSchema>(key: K): IEnvSchema[K] {
    return this.configService.get(key, { infer: true });
  }
}
