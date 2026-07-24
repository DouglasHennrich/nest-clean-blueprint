import { DEFAULT_PERMISSIONS, UserRoleEnum } from './default-permissions';

describe('DEFAULT_PERMISSIONS', () => {
  it('should define an entry for every UserRoleEnum value', () => {
    const roles = Object.values(UserRoleEnum);

    roles.forEach((role) => {
      expect(DEFAULT_PERMISSIONS).toHaveProperty(role);
      expect(Array.isArray(DEFAULT_PERMISSIONS[role])).toBe(true);
    });
  });

  it('should not define any extra roles beyond the enum', () => {
    expect(Object.keys(DEFAULT_PERMISSIONS).sort()).toEqual(Object.values(UserRoleEnum).sort());
  });

  it('should grant ADMIN the manage:all permission', () => {
    expect(DEFAULT_PERMISSIONS[UserRoleEnum.ADMIN]).toEqual(['manage:all']);
  });

  it('should grant MANAGER manage permissions over orders, items, catalogs and widgets', () => {
    expect(DEFAULT_PERMISSIONS[UserRoleEnum.MANAGER]).toEqual([
      'manage:orders',
      'manage:items',
      'manage:catalogs',
      'manage:widgets',
    ]);
  });

  it('should grant OPERATOR read/write permissions', () => {
    expect(DEFAULT_PERMISSIONS[UserRoleEnum.OPERATOR]).toEqual([
      'read:orders',
      'write:items',
      'read:catalogs',
    ]);
  });

  it('should grant VIEWER only read permissions', () => {
    expect(DEFAULT_PERMISSIONS[UserRoleEnum.VIEWER]).toEqual([
      'read:orders',
      'read:items',
      'read:catalogs',
    ]);
  });

  it('should grant GUEST no permissions', () => {
    expect(DEFAULT_PERMISSIONS[UserRoleEnum.GUEST]).toEqual([]);
  });

  it('should expose the expected UserRoleEnum members', () => {
    expect(UserRoleEnum.ADMIN).toBe('ADMIN');
    expect(UserRoleEnum.MANAGER).toBe('MANAGER');
    expect(UserRoleEnum.OPERATOR).toBe('OPERATOR');
    expect(UserRoleEnum.VIEWER).toBe('VIEWER');
    expect(UserRoleEnum.GUEST).toBe('GUEST');
  });
});
