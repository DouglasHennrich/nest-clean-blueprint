import { Injectable, OnModuleInit } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TDataCacheService } from '@/@shared/modules/cache/services/data-cache.service';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';
import { IBackofficeConfigsRepository } from '../../repositories/configs/backoffice-configs.repository';
import { BackofficeConfigsSingleton } from '../../singletons/backoffice-configs.singleton';
import { DefaultException } from '@/@shared/errors/abstract-application-exception';

export abstract class TBackofficeConfigsService {
  abstract getConfigs(): Promise<Result<IBackofficeConfigsModel>>;
  abstract updateConfigs(
    updates: Partial<IBackofficeConfigsModel>,
  ): Promise<Result<IBackofficeConfigsModel>>;
}

@Injectable()
export class BackofficeConfigsService
  implements TBackofficeConfigsService, OnModuleInit
{
  private readonly CACHE_KEY = 'backoffice-configs';

  constructor(
    private readonly dataCacheService: TDataCacheService,
    private readonly repository: IBackofficeConfigsRepository,
    private readonly logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeConfigsService.name);
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing BackofficeConfigs singleton...');

      await this.getConfigs();

      this.logger.log('BackofficeConfigs singleton initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize BackofficeConfigs singleton: ${error}`,
      );

      throw error; // Re-throw to prevent app startup if initialization fails
    }
  }

  async getConfigs(): Promise<Result<IBackofficeConfigsModel>> {
    return this.dataCacheService
      .get(
        this.CACHE_KEY,
        async () => {
          this.logger.debug('Fetching backoffice configs from database');

          const config = await this.repository.findLast({ where: {} });

          if (!config) {
            // Create default config if not exists
            const defaultConfig = await this.repository.create({
              debugLogging: false,
            });

            this.logger.debug('Created default backoffice config');

            return Result.success(defaultConfig);
          }

          return Result.success(config);
        },
        { shouldExpire: false }, // Configuração não expira
      )
      .then((result) => {
        // Atualizar singleton para debug logging
        if (!result.error) {
          const config = result.getValue();

          if (config) {
            BackofficeConfigsSingleton.setDebugLogging(config.debugLogging);
          }
        }

        return result;
      });
  }

  async updateConfigs(
    updates: Partial<IBackofficeConfigsModel>,
  ): Promise<Result<IBackofficeConfigsModel>> {
    try {
      // Get current config
      const getResult = await this.getConfigs();

      if (getResult.error) {
        return getResult;
      }

      const currentConfig = getResult.getValue()!;

      // Update in database
      const updatedConfig = await this.repository.update(
        currentConfig.id,
        updates,
      );

      if (!updatedConfig) {
        return Result.fail(
          new DefaultException('Failed to update backoffice configs'),
        );
      }

      // Update cache directly instead of invalidating it
      await this.dataCacheService.set(this.CACHE_KEY, updatedConfig, {
        shouldExpire: false,
      });

      // Update singleton for debug logging
      BackofficeConfigsSingleton.setDebugLogging(updatedConfig.debugLogging);

      this.logger.debug('Backoffice configs updated and cache refreshed');

      return Result.success(updatedConfig);
    } catch (error) {
      this.logger.error(
        `Error updating backoffice configs: ${error instanceof Error ? error.message : String(error)}`,
      );
      return Result.fail(error as Error);
    }
  }
}
