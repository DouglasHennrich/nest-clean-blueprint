import { BackofficeRequestLogPresenter } from './backoffice-request-log.presenter';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

describe('BackofficeRequestLogPresenter', () => {
  let presenter: BackofficeRequestLogPresenter;

  const entity: IBackofficeRequestLogModel = {
    id: 'log-1',
    method: 'GET',
    path: '/api/foods',
  };

  beforeEach(() => {
    presenter = new BackofficeRequestLogPresenter();
  });

  describe('present', () => {
    it('should spread the entity as the presenter shape', () => {
      const result = presenter.present({ entity });

      expect(result).toEqual(entity);
      expect(result).not.toBe(entity);
    });
  });

  describe('presentMany', () => {
    it('should present a list of request logs', () => {
      const result = presenter.presentMany({ entities: [entity] });

      expect(result).toEqual([entity]);
    });
  });
});
