import { AbstractPresenter } from '@/@shared/classes/presenter';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

export type TBackofficeRequestLogPresenterResponseModel = IBackofficeRequestLogModel;

export abstract class IBackofficeRequestLogPresenter extends AbstractPresenter<
  IBackofficeRequestLogModel,
  TBackofficeRequestLogPresenterResponseModel
> {}

export class BackofficeRequestLogPresenter extends IBackofficeRequestLogPresenter {
  present({
    entity,
  }: {
    entity: IBackofficeRequestLogModel;
    options?: any;
  }): TBackofficeRequestLogPresenterResponseModel {
    return { ...entity };
  }
}
