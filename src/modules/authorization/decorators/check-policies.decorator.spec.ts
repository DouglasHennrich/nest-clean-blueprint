import { SetMetadata } from '@nestjs/common';
import { CHECK_POLICIES_KEY, CheckPolicies } from './check-policies.decorator';

jest.mock('@nestjs/common', () => {
  const actual: object = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    SetMetadata: jest.fn(() => 'set-metadata-result'),
  };
});

describe('CheckPolicies decorator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should expose the CHECK_POLICIES_KEY metadata key', () => {
    expect(CHECK_POLICIES_KEY).toBe('check_policy');
  });

  it('should call SetMetadata with the key and the provided handlers', () => {
    const handler = (): boolean => true;

    const result = CheckPolicies(handler);

    expect(SetMetadata).toHaveBeenCalledWith(CHECK_POLICIES_KEY, [handler]);
    expect(result).toBe('set-metadata-result');
  });

  it('should support multiple handlers', () => {
    const handlerA = (): boolean => true;
    const handlerB = (): boolean => false;

    CheckPolicies(handlerA, handlerB);

    expect(SetMetadata).toHaveBeenCalledWith(CHECK_POLICIES_KEY, [handlerA, handlerB]);
  });

  it('should support being called with no handlers', () => {
    CheckPolicies();

    expect(SetMetadata).toHaveBeenCalledWith(CHECK_POLICIES_KEY, []);
  });
});
