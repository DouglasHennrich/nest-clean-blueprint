/**
 * AbstractPresenter<Model, Response>
 *
 * Transforms raw domain models into API response shapes. Presenters live
 * outside services on purpose — services return raw models, controllers call
 * the presenter before returning.
 *
 * - present(): full shape (with relations)
 * - presentWithoutRelations(): minimal shape (no nested objects)
 * - presentMany(): batch transform
 */
export abstract class AbstractPresenter<Model, Response> {
  abstract present(entity: Model, options?: any): Response;
  abstract presentWithoutRelations(entity: Model): Response;
  abstract presentMany(entities: Model[], options?: any): Response[];
}
