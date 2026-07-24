import 'reflect-metadata';
import { Audit, AUDIT_METADATA_KEY, IAuditMetadataModel } from './audit.decorator';

describe('Audit decorator', () => {
  it('should attach the audit metadata to the handler', () => {
    const metadata: IAuditMetadataModel = {
      action: 'CREATE',
      entityType: 'FOOD',
      endpoint: 'CREATE_FOOD',
      description: 'Creates a food',
    };

    class TestController {
      @Audit(metadata)
      handle() {
        return true;
      }
    }

    const stored = Reflect.getMetadata(AUDIT_METADATA_KEY, TestController.prototype.handle);

    expect(stored).toEqual(metadata);
  });

  it('should work without optional fields', () => {
    const metadata: IAuditMetadataModel = {
      action: 'READ',
      endpoint: 'LIST_FOODS',
    };

    class TestController {
      @Audit(metadata)
      handle() {
        return true;
      }
    }

    const stored = Reflect.getMetadata(AUDIT_METADATA_KEY, TestController.prototype.handle);

    expect(stored).toEqual(metadata);
  });
});
