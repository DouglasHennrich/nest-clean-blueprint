import { CaslAbilityFactory } from './casl-ability.factory';
import { DEFAULT_PERMISSIONS, UserRoleEnum } from './default-permissions';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  beforeEach(() => {
    factory = new CaslAbilityFactory();
  });

  it('should grant manage on all subjects for an ADMIN user (manage:all)', () => {
    const user = { id: 'user-1', permissions: DEFAULT_PERMISSIONS[UserRoleEnum.ADMIN] };

    const ability = factory.defineAbility(user);

    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('read', 'orders')).toBe(true);
    expect(ability.can('write', 'widgets')).toBe(true);
    expect(ability.can('delete', 'accounts')).toBe(true);
  });

  it('should grant manage (and implied read) per resource for a MANAGER user', () => {
    const user = { id: 'user-2', permissions: DEFAULT_PERMISSIONS[UserRoleEnum.MANAGER] };

    const ability = factory.defineAbility(user);

    expect(ability.can('manage', 'orders')).toBe(true);
    expect(ability.can('manage', 'items')).toBe(true);
    expect(ability.can('manage', 'catalogs')).toBe(true);
    expect(ability.can('manage', 'widgets')).toBe(true);
    expect(ability.can('manage', 'accounts')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('should grant read:orders, write+read:items, read:catalogs for an OPERATOR user', () => {
    const user = { id: 'user-3', permissions: DEFAULT_PERMISSIONS[UserRoleEnum.OPERATOR] };

    const ability = factory.defineAbility(user);

    expect(ability.can('read', 'orders')).toBe(true);
    expect(ability.can('write', 'orders')).toBe(false);
    expect(ability.can('write', 'items')).toBe(true);
    expect(ability.can('read', 'items')).toBe(true);
    expect(ability.can('read', 'catalogs')).toBe(true);
    expect(ability.can('write', 'catalogs')).toBe(false);
  });

  it('should only grant read permissions for a VIEWER user', () => {
    const user = { id: 'user-4', permissions: DEFAULT_PERMISSIONS[UserRoleEnum.VIEWER] };

    const ability = factory.defineAbility(user);

    expect(ability.can('read', 'orders')).toBe(true);
    expect(ability.can('read', 'items')).toBe(true);
    expect(ability.can('read', 'catalogs')).toBe(true);
    expect(ability.can('write', 'orders')).toBe(false);
    expect(ability.can('manage', 'orders')).toBe(false);
  });

  it('should grant nothing for a GUEST user (empty permissions)', () => {
    const user = { id: 'user-5', permissions: DEFAULT_PERMISSIONS[UserRoleEnum.GUEST] };

    const ability = factory.defineAbility(user);

    expect(ability.can('read', 'orders')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('should default to no permissions when the user has no permissions property', () => {
    const ability = factory.defineAbility({ id: 'user-6' });

    expect(ability.can('read', 'orders')).toBe(false);
  });

  it('should scope permissions to a feature when a third segment is provided', () => {
    const ability = factory.defineAbility({
      id: 'user-7',
      permissions: ['write:items:draft'],
    });

    const draftItem = { __caslSubjectType__: 'items', feature: 'draft' };
    const publishedItem = { __caslSubjectType__: 'items', feature: 'published' };

    expect(ability.can('write', draftItem as any)).toBe(true);
    expect(ability.can('read', draftItem as any)).toBe(true);
    expect(ability.can('write', publishedItem as any)).toBe(false);
  });

  it('should ignore malformed permission strings with less than 2 segments', () => {
    const ability = factory.defineAbility({ id: 'user-8', permissions: ['manage'] });

    expect(ability.can('manage', 'orders')).toBe(false);
  });

  it('should treat a bare "all" permission the same as "manage:all"', () => {
    const ability = factory.defineAbility({ id: 'user-9', permissions: ['all'] });

    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('read', 'orders')).toBe(true);
  });
});
