import { AbstractPresenter } from '@/@shared/classes/presenter';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

export interface IBackofficeConfigsPresenterResponseModel {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  debugLogging: boolean;
}

export abstract class IBackofficeConfigsPresenter extends AbstractPresenter<
  IBackofficeConfigsModel,
  IBackofficeConfigsPresenterResponseModel
> {}

export class BackofficeConfigsPresenter extends IBackofficeConfigsPresenter {
  present({
    entity,
  }: {
    entity: IBackofficeConfigsModel;
    options?: any;
  }): IBackofficeConfigsPresenterResponseModel {
    return {
      id: entity.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      debugLogging: entity.debugLogging,
    };
  }
}
