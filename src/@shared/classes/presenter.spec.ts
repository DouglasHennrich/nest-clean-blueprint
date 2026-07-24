import { AbstractPresenter } from './presenter';

interface ITestModel {
  id: string;
  name: string;
  relation?: { id: string };
}

interface ITestResponseModel {
  id: string;
  name: string;
  relation?: { id: string };
}

class TestPresenter extends AbstractPresenter<ITestModel, ITestResponseModel> {
  present({
    entity,
    options,
  }: {
    entity: ITestModel;
    options?: { withoutRelations?: boolean };
  }): ITestResponseModel {
    if (options?.withoutRelations) {
      return { id: entity.id, name: entity.name };
    }

    return { id: entity.id, name: entity.name, relation: entity.relation };
  }
}

describe('AbstractPresenter', () => {
  let presenter: TestPresenter;

  beforeEach(() => {
    presenter = new TestPresenter();
  });

  describe('present', () => {
    it('should transform an entity using the subclass implementation', () => {
      const entity: ITestModel = { id: '1', name: 'John', relation: { id: 'r1' } };

      const result = presenter.present({ entity });

      expect(result).toEqual({ id: '1', name: 'John', relation: { id: 'r1' } });
    });
  });

  describe('presentWithoutRelations', () => {
    it('should call present with withoutRelations: true', () => {
      const spy = jest.spyOn(presenter, 'present');
      const entity: ITestModel = { id: '1', name: 'John', relation: { id: 'r1' } };

      const result = presenter.presentWithoutRelations(entity);

      expect(spy).toHaveBeenCalledWith({ entity, options: { withoutRelations: true } });
      expect(result).toEqual({ id: '1', name: 'John' });
    });
  });

  describe('presentMany', () => {
    it('should map present over every entity by default', () => {
      const entities: ITestModel[] = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];

      const result = presenter.presentMany({ entities });

      expect(result).toEqual([
        { id: '1', name: 'John', relation: undefined },
        { id: '2', name: 'Jane', relation: undefined },
      ]);
    });

    it('should forward options to each present call', () => {
      const spy = jest.spyOn(presenter, 'present');
      const entities: ITestModel[] = [{ id: '1', name: 'John', relation: { id: 'r1' } }];

      presenter.presentMany({ entities, options: { withoutRelations: true } });

      expect(spy).toHaveBeenCalledWith({
        entity: entities[0],
        options: { withoutRelations: true },
      });
    });

    it('should return an empty array for an empty entities list', () => {
      expect(presenter.presentMany({ entities: [] })).toEqual([]);
    });
  });

  describe('presentSuccess', () => {
    it('should wrap a value in a success envelope', () => {
      expect(presenter.presentSuccess({ id: '1' })).toEqual({ success: true, data: { id: '1' } });
    });

    it('should omit data when called without a value', () => {
      expect(presenter.presentSuccess()).toEqual({ success: true });
    });

    it('should omit data when explicitly called with undefined', () => {
      expect(presenter.presentSuccess(undefined)).toEqual({ success: true });
    });
  });
});
