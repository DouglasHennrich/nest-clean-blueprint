/**
 * AbstractPresenter<Model, Response>
 *
 * Transforms raw domain models into API response shapes. Presenters live
 * outside services on purpose — services return raw models, controllers call
 * the presenter before returning.
 *
 * All methods take a single object param.
 *
 * - present({ entity, options }): full shape (with relations) — the one
 *   method every presenter must implement.
 * - presentWithoutRelations(entity): minimal shape (no nested objects),
 *   defaults to present({ entity, options: { withoutRelations: true } }).
 * - presentMany({ entities, options }): batch transform, defaults to mapping
 *   present() over each entity.
 * - presentSuccess(data): opt-in helper to wrap a value in a
 *   `{ success: true, data? }` envelope.
 */
export abstract class AbstractPresenter<Model, Response> {
  abstract present({ entity, options }: { entity: Model; options?: any }): Response;

  presentWithoutRelations(entity: Model): Response {
    return this.present({ entity, options: { withoutRelations: true } });
  }

  presentMany({ entities, options }: { entities: Model[]; options?: any }): Response[] {
    return entities.map((entity) => this.present({ entity, options }));
  }

  presentSuccess<T = void>(data?: T): { success: true; data?: T } {
    return { success: true, ...(data !== undefined ? { data } : {}) };
  }
}
