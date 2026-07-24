import { AbstractPresenter } from '@/@shared/classes/presenter';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';

export type TBackofficeAuditLogPresenterResponseModel = IBackofficeAuditLogModel;

export abstract class IBackofficeAuditLogPresenter extends AbstractPresenter<
  IBackofficeAuditLogModel,
  TBackofficeAuditLogPresenterResponseModel
> {}

export class BackofficeAuditLogPresenter extends IBackofficeAuditLogPresenter {
  present({
    entity,
  }: {
    entity: IBackofficeAuditLogModel;
    options?: any;
  }): TBackofficeAuditLogPresenterResponseModel {
    return { ...entity };
  }
}
