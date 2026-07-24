import { BackofficeConfigsPresenter } from './backoffice-configs.presenter';
import { IBackofficeConfigsModel } from '../../models/configs/backoffice-configs.struct';

describe('BackofficeConfigsPresenter', () => {
  let presenter: BackofficeConfigsPresenter;

  const entity: IBackofficeConfigsModel = {
    id: 'config-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
    debugLogging: true,
  };

  beforeEach(() => {
    presenter = new BackofficeConfigsPresenter();
  });

  describe('present', () => {
    it('should present the config shape', () => {
      const result = presenter.present({ entity });

      expect(result).toEqual({
        id: entity.id,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
        debugLogging: entity.debugLogging,
      });
    });
  });

  describe('presentMany', () => {
    it('should present a list of configs', () => {
      const result = presenter.presentMany({ entities: [entity] });

      expect(result).toEqual([
        {
          id: entity.id,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
          debugLogging: entity.debugLogging,
        },
      ]);
    });
  });
});
