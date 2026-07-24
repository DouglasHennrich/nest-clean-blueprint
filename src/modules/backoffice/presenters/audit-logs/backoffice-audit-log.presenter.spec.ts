import { BackofficeAuditLogPresenter } from './backoffice-audit-log.presenter';
import { IBackofficeAuditLogModel } from '../../models/audit-logs/backoffice-audit-log.struct';

describe('BackofficeAuditLogPresenter', () => {
  let presenter: BackofficeAuditLogPresenter;

  const entity: IBackofficeAuditLogModel = {
    id: 'audit-1',
    method: 'GET',
    path: '/api/foods',
    endpoint: 'LIST_FOODS',
  };

  beforeEach(() => {
    presenter = new BackofficeAuditLogPresenter();
  });

  describe('present', () => {
    it('should spread the entity as the presenter shape', () => {
      const result = presenter.present({ entity });

      expect(result).toEqual(entity);
      expect(result).not.toBe(entity);
    });
  });

  describe('presentMany', () => {
    it('should present a list of audit logs', () => {
      const result = presenter.presentMany({ entities: [entity] });

      expect(result).toEqual([entity]);
    });
  });
});
