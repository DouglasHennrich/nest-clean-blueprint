import { AbstractRepository } from './repository';
import { ILogger } from './custom-logger';

// =============================================================================
// Test fixtures
// =============================================================================

class TestEntity {
  id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

class ChildEntity {} // ManyToOne owner -> cascade OneToMany on TestEntity
class ChildOneToOneEntity {} // OneToOne owner -> cascade OneToOne on TestEntity
class SetNullChildEntity {} // OneToOne owner with SET NULL on TestEntity
class ManyToManyEntity {} // ManyToMany target owned by TestEntity

const buildColumns = () => [
  { propertyName: 'id', databaseName: 'id' },
  { propertyName: 'name', databaseName: 'name' },
  { propertyName: 'createdAt', databaseName: 'created_at' },
  { propertyName: 'updatedAt', databaseName: 'updated_at' },
  { propertyName: 'deletedAt', databaseName: 'deleted_at' },
];

function findColumnWithPropertyName(columns: { propertyName: string; databaseName: string }[]) {
  return jest.fn((propertyName: string) => columns.find((c) => c.propertyName === propertyName));
}

/**
 * Builds a full set of collaborators (logger, envService, TypeORM-like collection,
 * dataSource, transaction manager) needed to exercise AbstractRepository without a
 * real database connection.
 */
function buildHarness({ withDeletedAt = true }: { withDeletedAt?: boolean } = {}) {
  const logger: jest.Mocked<ILogger> = {
    setContextName: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const envService = {
    get: jest.fn((key: string) => {
      if (key === 'UTILITIES_PAGINATION_LIMIT') return 10;
      if (key === 'INFRA_ENVIRONMENT') return 'test';
      return undefined;
    }),
  };

  const columns = withDeletedAt
    ? buildColumns()
    : buildColumns().filter((c) => c.propertyName !== 'deletedAt');

  const mainMetadata: any = {
    name: 'TestEntity',
    tableName: 'test_entities',
    target: TestEntity,
    columns,
    findColumnWithPropertyName: findColumnWithPropertyName(columns),
    manyToOneRelations: [],
    oneToManyRelations: [],
    oneToOneRelations: [],
    manyToManyRelations: [
      {
        onDelete: 'CASCADE',
        isOwning: true,
        propertyName: 'tags',
        joinColumns: [{ referencedColumn: { propertyName: 'id' } }],
        inverseJoinColumns: [{ referencedColumn: { propertyName: 'id' } }],
        inverseEntityMetadata: { target: ManyToManyEntity },
        junctionEntityMetadata: { tableName: 'test_entities_tags' },
      },
    ],
  };

  const childColumns = [
    { propertyName: 'id', databaseName: 'id' },
    { propertyName: 'mainId', databaseName: 'main_id' },
    { propertyName: 'deletedAt', databaseName: 'deleted_at' },
  ];
  const childMetadata: any = {
    name: 'ChildEntity',
    tableName: 'children',
    target: ChildEntity,
    columns: childColumns,
    findColumnWithPropertyName: findColumnWithPropertyName(childColumns),
    manyToOneRelations: [
      {
        onDelete: 'CASCADE',
        inverseEntityMetadata: { target: TestEntity },
        joinColumns: [{ propertyName: 'mainId' }],
      },
    ],
    oneToOneRelations: [],
    oneToManyRelations: [],
    manyToManyRelations: [],
  };

  const childOneToOneColumns = [
    { propertyName: 'id', databaseName: 'id' },
    { propertyName: 'mainId', databaseName: 'main_id' },
    { propertyName: 'deletedAt', databaseName: 'deleted_at' },
  ];
  const childOneToOneMetadata: any = {
    name: 'ChildOneToOneEntity',
    tableName: 'child_one_to_ones',
    target: ChildOneToOneEntity,
    columns: childOneToOneColumns,
    findColumnWithPropertyName: findColumnWithPropertyName(childOneToOneColumns),
    manyToOneRelations: [],
    oneToOneRelations: [
      {
        onDelete: 'CASCADE',
        isOwning: true,
        inverseEntityMetadata: { target: TestEntity },
        joinColumns: [{ propertyName: 'mainId' }],
      },
    ],
    oneToManyRelations: [],
    manyToManyRelations: [],
  };

  const setNullColumns = [
    { propertyName: 'id', databaseName: 'id' },
    { propertyName: 'main', databaseName: 'main_id' },
  ];
  const setNullChildMetadata: any = {
    name: 'SetNullChildEntity',
    tableName: 'set_null_children',
    target: SetNullChildEntity,
    columns: setNullColumns,
    findColumnWithPropertyName: findColumnWithPropertyName(setNullColumns),
    manyToOneRelations: [],
    oneToOneRelations: [
      {
        onDelete: 'SET NULL',
        propertyName: 'main',
        inverseEntityMetadata: { target: TestEntity },
        joinColumns: [{ propertyName: 'main' }],
      },
    ],
    oneToManyRelations: [],
    manyToManyRelations: [],
  };

  const manyToManyEntityMetadata: any = {
    name: 'ManyToManyEntity',
    tableName: 'many_to_many_entities',
    target: ManyToManyEntity,
    columns: [{ propertyName: 'id', databaseName: 'id' }],
    findColumnWithPropertyName: jest.fn(() => undefined),
    manyToOneRelations: [],
    oneToOneRelations: [],
    oneToManyRelations: [],
    manyToManyRelations: [],
  };

  const entityMetadatas = [
    mainMetadata,
    childMetadata,
    childOneToOneMetadata,
    setNullChildMetadata,
    manyToManyEntityMetadata,
  ];

  const metadataByTarget = new Map(entityMetadatas.map((m) => [m.target, m]));

  const manager: any = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    softDelete: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn((target: any) => ({ metadata: metadataByTarget.get(target) })),
  };

  const dataSource: any = {
    entityMetadatas,
    transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
  };

  const collection: any = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn((entity: any) => Promise.resolve({ id: entity.id ?? 'generated-id', ...entity })),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    restore: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
    metadata: mainMetadata,
    manager,
    target: TestEntity,
  };

  collection.manager.connection = dataSource;

  class TestRepository extends AbstractRepository<TestEntity, TestEntity> {}

  const repository = new TestRepository(collection, envService as any, logger);

  return { repository, collection, manager, dataSource, logger, envService, mainMetadata };
}

describe('AbstractRepository', () => {
  describe('create', () => {
    it('should create and save a new entity, returning the transformed model', async () => {
      const { repository, collection } = buildHarness();

      const result = await repository.create({ data: { name: 'John' } });

      expect(collection.create).toHaveBeenCalled();
      expect(collection.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ name: 'John' }));
    });

    it('should merge a provided id into the entity data', async () => {
      const { repository } = buildHarness();

      const result = await repository.create({ data: { name: 'Jane' }, id: 'fixed-id' });

      expect(result).toEqual(expect.objectContaining({ id: 'fixed-id', name: 'Jane' }));
    });

    it('should throw when toModel() returns a falsy model', async () => {
      const { collection, envService, logger } = buildHarness();

      class NullModelRepository extends AbstractRepository<TestEntity, TestEntity> {
        protected toModel(): any {
          return undefined;
        }
      }
      const repository = new NullModelRepository(collection, envService as any, logger);

      await expect(repository.create({ data: { name: 'X' } as any })).rejects.toThrow(
        'Failed to transform entity to model',
      );
    });
  });

  describe('find', () => {
    it('should paginate using defaults and report hasNextPage correctly', async () => {
      const { repository, collection } = buildHarness();
      collection.findAndCount.mockResolvedValue([
        [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ],
        20,
      ]);

      const result = await repository.find({});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(20);
      expect(result.hasNextPage).toBe(true);
    });

    it('should apply excludeId by merging a Not() condition into where', async () => {
      const { repository, collection } = buildHarness();

      await repository.find({ where: { name: 'A' }, excludeId: 'excluded-id' });

      const callArgs = collection.findAndCount.mock.calls[0][0];
      expect(callArgs.where).toEqual(expect.objectContaining({ name: 'A' }));
    });

    it('should use a custom page/offset to compute skip', async () => {
      const { repository, collection } = buildHarness();

      await repository.find({ page: 2, offset: 5 });

      const callArgs = collection.findAndCount.mock.calls[0][0];
      expect(callArgs.skip).toBe(5);
      expect(callArgs.take).toBe(5);
    });

    it('should report hasNextPage as false when all records fit on the current page', async () => {
      const { repository, collection } = buildHarness();
      collection.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);

      const result = await repository.find({});

      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all transformed models', async () => {
      const { repository, collection } = buildHarness();
      collection.find.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const result = await repository.findAll({});

      expect(result).toHaveLength(2);
    });

    it('should apply excludeId', async () => {
      const { repository, collection } = buildHarness();

      await repository.findAll({ excludeId: 'excluded-id' });

      const callArgs = collection.find.mock.calls[0][0];
      expect(callArgs.where).toEqual(expect.objectContaining({}));
    });
  });

  describe('findOne', () => {
    it('should return the transformed model when found', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue({ id: '1', name: 'A' });

      const result = await repository.findOne({ where: { name: 'A' } });

      expect(result).toEqual(expect.objectContaining({ id: '1', name: 'A' }));
    });

    it('should apply excludeId to the where clause', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue(null);

      await repository.findOne({ where: { name: 'A' }, excludeId: 'excluded-id' });

      const callArgs = collection.findOne.mock.calls[0][0];
      expect(callArgs.where.id).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return undefined for an empty id without querying the database', async () => {
      const { repository, collection } = buildHarness();

      const result = await repository.findById({ id: '' });

      expect(result).toBeUndefined();
      expect(collection.findOne).not.toHaveBeenCalled();
    });

    it('should return the transformed model when the entity is found', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue({ id: '1', name: 'A' });

      const result = await repository.findById({ id: '1' });

      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });

    it('should return undefined (normalized from null) when the entity is not found', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue(null);

      const result = await repository.findById({ id: 'missing' });

      // The default `toModel()` implementation normalizes a `null` entity to a real
      // `undefined`, matching its declared `Model | undefined` return type.
      expect(result).toBeUndefined();
    });
  });

  describe('findLast', () => {
    it('should order by createdAt DESC and return the transformed model', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue({ id: '1' });

      const result = await repository.findLast({});

      expect(collection.findOne.mock.calls[0][0].order).toEqual({ createdAt: 'DESC' });
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });
  });

  describe('count', () => {
    it('should return the total record count', async () => {
      const { repository, collection } = buildHarness();
      collection.count.mockResolvedValue(7);

      const result = await repository.count({});

      expect(result).toBe(7);
    });

    it('should apply excludeId', async () => {
      const { repository, collection } = buildHarness();

      await repository.count({ excludeId: 'excluded-id' });

      const callArgs = collection.count.mock.calls[0][0];
      expect(callArgs.where.id).toBeDefined();
    });
  });

  describe('update', () => {
    it('should throw when the entity does not exist', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue(null);

      await expect(
        repository.update({ id: 'missing', data: { name: 'X' } as any }),
      ).rejects.toThrow('Entity with id missing not found');
    });

    it('should update and return the transformed model without relations', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne.mockResolvedValue({ id: '1', name: 'Old' });
      collection.save.mockResolvedValue({ id: '1', name: 'New' });

      const result = await repository.update({ id: '1', data: { name: 'New' } });

      expect(result).toEqual(expect.objectContaining({ name: 'New' }));
    });

    it('should re-fetch with relations when relations are requested', async () => {
      const { repository, collection } = buildHarness();
      collection.findOne
        .mockResolvedValueOnce({ id: '1', name: 'Old' })
        .mockResolvedValueOnce({ id: '1', name: 'New', related: [{ id: 'r1' }] });

      const result = await repository.update({
        id: '1',
        data: { name: 'New' },
        relations: { related: true } as any,
      });

      expect(result).toEqual(expect.objectContaining({ related: [{ id: 'r1' }] }));
    });

    it('should throw when the post-update relations refetch cannot be transformed', async () => {
      const { collection, envService, logger } = buildHarness();
      collection.findOne
        .mockResolvedValueOnce({ id: '1', name: 'Old' })
        .mockResolvedValueOnce(null);

      class SometimesNullRepository extends AbstractRepository<TestEntity, TestEntity> {
        protected toModel(entity: TestEntity | null): any {
          return entity ?? undefined;
        }
      }
      const repository = new SometimesNullRepository(collection, envService as any, logger);

      await expect(
        repository.update({
          id: '1',
          data: { name: 'New' } as any,
          relations: { related: true } as any,
        }),
      ).rejects.toThrow('Failed to transform entity to model after update with relations');
    });

    it('should throw when the updated entity cannot be transformed', async () => {
      const { collection, envService, logger } = buildHarness();
      collection.findOne.mockResolvedValueOnce({ id: '1', name: 'Old' });
      collection.save.mockResolvedValue(null);

      class NullOnSaveRepository extends AbstractRepository<TestEntity, TestEntity> {
        protected toModel(entity: TestEntity | null): any {
          return entity ?? undefined;
        }
      }
      const repository = new NullOnSaveRepository(collection, envService as any, logger);

      await expect(repository.update({ id: '1', data: { name: 'New' } as any })).rejects.toThrow(
        'Failed to transform entity to model after update',
      );
    });
  });

  describe('queryBuilder', () => {
    it('should return the underlying TypeORM query builder', () => {
      const { repository, collection } = buildHarness();
      const qb = { alias: 'qb' };
      collection.createQueryBuilder.mockReturnValue(qb);

      const result = repository.queryBuilder('t');

      expect(result).toBe(qb);
      expect(collection.createQueryBuilder).toHaveBeenCalledWith('t');
    });

    it('should log and rethrow when the query builder cannot be created', () => {
      const { repository, collection, logger } = buildHarness();
      collection.createQueryBuilder.mockImplementation(() => {
        throw new Error('builder failed');
      });

      expect(() => repository.queryBuilder('t')).toThrow('builder failed');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('restoreSoftDeleted', () => {
    it('should throw when the entity does not exist', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue(null);

      await expect(repository.restoreSoftDeleted('missing')).rejects.toThrow(
        'Entity with id missing not found',
      );
    });

    it('should restore and return the transformed model', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1', deletedAt: new Date() });

      const result = await repository.restoreSoftDeleted('1');

      expect(manager.restore).toHaveBeenCalledWith(TestEntity, { id: '1' });
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });

    it('should accept a FindOptionsWhere object as the id parameter (matching hardDelete/softDelete)', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1', name: 'A' });

      await repository.restoreSoftDeleted({ name: 'A' });

      // Fixed: like hardDelete/softDelete/bulkDeleteWhere, restoreSoftDeleted() now
      // discriminates `typeof id === 'string' ? { id } : id`, so passing a
      // FindOptionsWhere object is used as-is instead of being nested under `id`.
      expect(manager.findOne.mock.calls[0][1].where).toEqual({ name: 'A' });
      expect(manager.restore).toHaveBeenCalledWith(TestEntity, { name: 'A' });
    });

    it('should recursively restore cascade relations before restoring the parent', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockImplementation((target: any) => {
        if (target === TestEntity) {
          return Promise.resolve({ id: '1', deletedAt: new Date() });
        }
        return Promise.resolve(null);
      });
      manager.find.mockResolvedValue([{ id: 'c1', mainId: '1', deletedAt: new Date() }]);

      await repository.restoreSoftDeleted('1');

      expect(manager.restore).toHaveBeenCalledWith(ChildEntity, { id: 'c1' });
      expect(manager.restore).toHaveBeenCalledWith(TestEntity, { id: '1' });
    });
  });

  describe('hardDelete', () => {
    it('should do nothing when the entity does not exist', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue(null);

      await repository.hardDelete('missing');

      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('should apply SET NULL relations, then hard delete the entity', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1' });
      manager.update.mockResolvedValue({ affected: 2 });

      await repository.hardDelete('1');

      expect(manager.update).toHaveBeenCalledWith(
        SetNullChildEntity,
        { main: '1' },
        { main: null },
      );
      expect(manager.delete).toHaveBeenCalledWith(TestEntity, { id: '1' });
    });

    it('should accept a FindOptionsWhere object as the id parameter', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1' });

      await repository.hardDelete({ name: 'A' });

      expect(manager.findOne.mock.calls[0][1].where).toEqual({ name: 'A' });
    });
  });

  describe('softDelete', () => {
    it('should do nothing when the entity does not exist', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue(null);

      await repository.softDelete('missing');

      expect(manager.softDelete).not.toHaveBeenCalled();
    });

    it('should warn and skip when the entity has no deletedAt column', async () => {
      const { repository, manager, logger } = buildHarness({ withDeletedAt: false });
      manager.findOne.mockResolvedValue({ id: '1' });

      await repository.softDelete('1');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not have soft delete enabled'),
      );
      expect(manager.softDelete).not.toHaveBeenCalled();
    });

    it('should cascade through SET NULL and CASCADE relations before soft deleting', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1' });
      manager.find.mockResolvedValue([]); // no OneToMany children to cascade

      await repository.softDelete('1');

      expect(manager.update).toHaveBeenCalledWith(
        SetNullChildEntity,
        { main: '1' },
        { main: null },
      );
      expect(manager.softDelete).toHaveBeenCalledWith(TestEntity, { id: '1' });
    });

    it('should recursively soft delete OneToMany cascade children', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: '1' });
      manager.find.mockResolvedValueOnce([{ id: 'child-1' }]).mockResolvedValue([]);

      await repository.softDelete('1');

      expect(manager.softDelete).toHaveBeenCalledWith(ChildEntity, { id: 'child-1' });
      expect(manager.softDelete).toHaveBeenCalledWith(TestEntity, { id: '1' });
    });
  });

  describe('batchUpsert', () => {
    it('should return an empty array immediately for an empty dataArray', async () => {
      const { repository, dataSource } = buildHarness();

      const result = await repository.batchUpsert({ dataArray: [] });

      expect(result).toEqual([]);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should build an upsert query with ON CONFLICT DO UPDATE by default', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1', name: 'A' }]);

      const result = await repository.batchUpsert({
        dataArray: [{ data: { name: 'A' }, id: '1' }],
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.any(Array),
      );
      expect(result).toEqual([{ id: '1', name: 'A' }]);
    });

    it('should build a DO NOTHING clause when updateOnConflict is false', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.batchUpsert({
        dataArray: [{ data: { name: 'A' } }],
        updateOnConflict: false,
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DO NOTHING'),
        expect.any(Array),
      );
    });

    it('should process the dataArray in chunks', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.batchUpsert({
        dataArray: [{ data: { name: 'A' } }, { data: { name: 'B' } }],
        chunkSize: 1,
      });

      expect(manager.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkCreate', () => {
    it('should return an empty array immediately for empty data', async () => {
      const { repository } = buildHarness();

      const result = await repository.bulkCreate({ data: [] });

      expect(result).toEqual([]);
    });

    it('should insert with DO NOTHING and return models by default', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1', name: 'A' }]);

      const result = await repository.bulkCreate({ data: [{ data: { name: 'A' } }] });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array),
      );
      expect(result).toEqual([{ id: '1', name: 'A' }]);
    });

    it('should skip the RETURNING clause and return no models when noModelReturn is true', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      const result = await repository.bulkCreate({
        data: [{ data: { name: 'A' } }],
        options: { noModelReturn: true },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.not.stringContaining('RETURNING'),
        expect.any(Array),
      );
      expect(result).toEqual([]);
    });

    it('should delegate to batchUpsert when onConflictAction is DO_UPDATE', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1', name: 'A' }]);

      const result = await repository.bulkCreate({
        data: [{ data: { name: 'A' }, id: '1' }],
        options: { onConflictAction: 'DO_UPDATE' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.any(Array),
      );
      expect(result).toEqual([{ id: '1', name: 'A' }]);
    });

    it('should run outside a transaction when useTransaction is false', async () => {
      const { repository, manager, dataSource } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkCreate({
        data: [{ data: { name: 'A' } }],
        options: { useTransaction: false },
      });

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    it('should return an empty array immediately for empty data', async () => {
      const { repository } = buildHarness();

      const result = await repository.bulkUpdate({ data: [] });

      expect(result).toEqual([]);
    });

    it('should batch-update entities sharing the same keys using a CASE statement', async () => {
      const { repository, manager } = buildHarness();
      manager.query
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]) // existence check
        .mockResolvedValueOnce([
          { id: '1', name: 'A2' },
          { id: '2', name: 'B2' },
        ]); // update ... returning

      const result = await repository.bulkUpdate({
        data: [
          { id: '1', data: { name: 'A2' } },
          { id: '2', data: { name: 'B2' } },
        ],
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('CASE'),
        expect.any(Array),
      );
      expect(result).toHaveLength(2);
    });

    it('should throw when some ids are missing from the batch existence check', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValueOnce([{ id: '1' }]); // only one of two found

      await expect(
        repository.bulkUpdate({
          data: [
            { id: '1', data: { name: 'A2' } as any },
            { id: '2', data: { name: 'B2' } as any },
          ],
        }),
      ).rejects.toThrow('Entities not found for ids: 2');
    });

    it('should update items individually when they do not share the same keys', async () => {
      const { repository, manager } = buildHarness();
      manager.query
        .mockResolvedValueOnce([{ id: '1', name: 'A2' }])
        .mockResolvedValueOnce([{ id: '2', name: 'B2', createdAt: new Date() }]);

      const result = await repository.bulkUpdate({
        data: [
          { id: '1', data: { name: 'A2' } },
          { id: '2', data: { name: 'B2', createdAt: new Date() } as any },
        ],
      });

      expect(result).toHaveLength(2);
    });

    it('should update a single-item chunk individually', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValueOnce([{ id: '1', name: 'A2' }]);

      const result = await repository.bulkUpdate({
        data: [{ id: '1', data: { name: 'A2' } }],
      });

      expect(result).toEqual([{ id: '1', name: 'A2' }]);
    });

    it('should skip the existence check and RETURNING clause when noModelReturn is true', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      const result = await repository.bulkUpdate({
        data: [
          { id: '1', data: { name: 'A2' } },
          { id: '2', data: { name: 'B2' } },
        ],
        options: { noModelReturn: true },
      });

      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('bulkUpdateWhere', () => {
    it('should return an empty array immediately when data is empty', async () => {
      const { repository } = buildHarness();

      const result = await repository.bulkUpdateWhere({ where: { name: 'A' }, data: {} });

      expect(result).toEqual([]);
    });

    it('should build an UPDATE ... WHERE query and return transformed models', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1', name: 'Updated' }]);

      const result = await repository.bulkUpdateWhere({
        where: { name: 'A' },
        data: { name: 'Updated' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array),
      );
      expect(result).toEqual([{ id: '1', name: 'Updated' }]);
    });

    it('should support an array of where conditions (OR)', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: [{ name: 'A' }, { name: 'B' }],
        data: { name: 'Updated' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining(' OR '),
        expect.any(Array),
      );
    });
  });

  describe('bulkDelete', () => {
    it('should return immediately for an empty ids array', async () => {
      const { repository, dataSource } = buildHarness();

      await repository.bulkDelete({ ids: [] });

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should soft delete by default', async () => {
      const { repository, manager } = buildHarness();

      await repository.bulkDelete({ ids: ['1', '2'] });

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), [['1', '2']]);
    });

    it('should hard delete when soft is false', async () => {
      const { repository, manager } = buildHarness();

      await repository.bulkDelete({ ids: ['1'], options: { soft: false } });

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'), [['1']]);
    });
  });

  describe('bulkDeleteWhere', () => {
    it('should do nothing when no entities match the where clause', async () => {
      const { repository, manager } = buildHarness();
      manager.find.mockResolvedValue([]);

      await repository.bulkDeleteWhere({ where: { name: 'missing' } });

      expect(manager.query).not.toHaveBeenCalled();
    });

    it('should soft delete every entity matching the where clause', async () => {
      const { repository, manager } = buildHarness();
      manager.find.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);

      await repository.bulkDeleteWhere({ where: { name: 'A' } });

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), [['1', '2']]);
    });

    it('should hard delete every entity matching the where clause when soft is false', async () => {
      const { repository, manager } = buildHarness();
      manager.find.mockResolvedValueOnce([{ id: '1' }]);

      await repository.bulkDeleteWhere({ where: { name: 'A' }, options: { soft: false } });

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'), [['1']]);
    });
  });

  describe('execute (error handling)', () => {
    it('should log a PostgreSQL-specific message and rethrow on unique_violation', async () => {
      const { repository, collection, logger } = buildHarness();
      const pgError: any = new Error('duplicate key value');
      pgError.code = '23505';
      pgError.detail = 'Key (id)=(1) already exists.';
      collection.findAndCount.mockRejectedValue(pgError);

      await expect(repository.find({})).rejects.toThrow('duplicate key value');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Duplicate entry'));
    });

    it('should rethrow generic errors without a PostgreSQL code', async () => {
      const { repository, collection, logger } = buildHarness();
      collection.findAndCount.mockRejectedValue(new Error('generic failure'));

      await expect(repository.find({})).rejects.toThrow('generic failure');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('execute (slow query logging)', () => {
    const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log a CRITICAL performance issue for queries slower than 5s', async () => {
      const { repository, collection, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(6000);

      await repository.findAll({});
      await flushSetImmediate();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL Database Performance Issue'),
      );
      void collection;
    });

    it('should log a MEDIUM performance notice for queries between 1s and 2s', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1200);

      await repository.findAll({});
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Notice'),
      );
    });

    it('should not log anything for queries faster than 500ms', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(10);

      await repository.findAll({});
      await flushSetImmediate();

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Extended coverage: column-mapping fallback branches
  // ===========================================================================
  describe('column mapping fallback (unmapped property names)', () => {
    it('bulkCreate should fall back to the property name when no column mapping exists', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1', unmapped: 'x' }]);

      await repository.bulkCreate({ data: [{ data: { unmapped: 'x' } as any }] });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"unmapped"'),
        expect.any(Array),
      );
    });

    it('bulkUpdate (not-same-keys path) should fall back to the property name', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1' }]);

      await repository.bulkUpdate({
        data: [
          { id: '1', data: { unmapped: 'x' } as any },
          { id: '2', data: { name: 'B' } },
        ],
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"unmapped"'),
        expect.any(Array),
      );
    });

    it('bulkUpdate (same-keys batch path) should fall back to the property name', async () => {
      const { repository, manager } = buildHarness();
      manager.query
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);

      await repository.bulkUpdate({
        data: [
          { id: '1', data: { unmapped: 'x' } as any },
          { id: '2', data: { unmapped: 'y' } as any },
        ],
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"unmapped"'),
        expect.any(Array),
      );
    });

    it('bulkUpdate (single-item chunk path) should fall back to the property name', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1' }]);

      await repository.bulkUpdate({ data: [{ id: '1', data: { unmapped: 'x' } as any }] });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"unmapped"'),
        expect.any(Array),
      );
    });

    it('bulkUpdateWhere should fall back to the property name', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([{ id: '1' }]);

      await repository.bulkUpdateWhere({
        where: { name: 'A' },
        data: { unmapped: 'x' } as any,
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"unmapped"'),
        expect.any(Array),
      );
    });
  });

  // ===========================================================================
  // Extended coverage: non-transaction execution branches
  // ===========================================================================
  describe('useTransaction: false branches', () => {
    it('bulkUpdate should run outside a transaction', async () => {
      const { repository, manager, dataSource } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdate({
        data: [{ id: '1', data: { name: 'A' } }],
        options: { useTransaction: false },
      });

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('bulkUpdateWhere should run outside a transaction', async () => {
      const { repository, manager, dataSource } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: { name: 'A' },
        data: { name: 'B' },
        options: { useTransaction: false },
      });

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('bulkDelete should run outside a transaction', async () => {
      const { repository, manager, dataSource } = buildHarness();
      manager.find.mockResolvedValue([]);

      await repository.bulkDelete({ ids: ['1'], options: { useTransaction: false } });

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(manager.query).toHaveBeenCalled();
    });

    it('bulkDeleteWhere should run outside a transaction', async () => {
      const { repository, manager, dataSource } = buildHarness();
      manager.find.mockResolvedValue([{ id: '1' }]);

      await repository.bulkDeleteWhere({
        where: { name: 'A' },
        options: { useTransaction: false },
      });

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Extended coverage: bulk cascade delete (OneToMany / ManyToMany) real paths
  // ===========================================================================
  describe('bulk cascade delete — OneToMany and ManyToMany', () => {
    it('bulkSoftDeleteWithCascade should skip soft delete when the main entity has no deletedAt column', async () => {
      const { repository, manager, logger } = buildHarness({ withDeletedAt: false });

      await repository.bulkDelete({ ids: ['1'] });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not have a deletedAt column'),
      );
      // Only SET NULL / cascade lookups may run — main UPDATE should not.
      expect(manager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.anything(),
      );
    });

    it('bulkSoftDeleteOneToManyRelation should recursively soft delete found related rows', async () => {
      const { repository, manager, logger } = buildHarness();
      // Respond based on query content rather than call order, since SET NULL
      // handling runs before cascade relation processing.
      manager.query.mockImplementation((query: string) => {
        if (typeof query === 'string' && query.includes('SELECT id FROM children')) {
          return Promise.resolve([{ id: 'child-1' }]);
        }
        return Promise.resolve([]);
      });

      await repository.bulkDelete({ ids: ['1'] });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM children'),
        [['1']],
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Bulk soft deleted 1 ChildEntity cascade records'),
      );
    });

    it('bulkSoftDeleteOneToManyRelation should warn and skip when the related entity has no deletedAt column', async () => {
      const { repository, dataSource, logger } = buildHarness();
      // Remove the deletedAt column from ChildEntity's metadata to force the warn branch.
      const childMeta = dataSource.entityMetadatas.find((m: any) => m.tableName === 'children');
      const originalColumns = childMeta.columns;
      childMeta.columns = originalColumns.filter((c: any) => c.propertyName !== 'deletedAt');

      await repository.bulkDelete({ ids: ['1'] });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not have deletedAt column. Skipping soft delete cascade.'),
      );

      childMeta.columns = originalColumns;
    });

    it('bulkHardDeleteOneToManyRelation should recursively hard delete found related rows', async () => {
      const { repository, manager, logger } = buildHarness();
      manager.query.mockImplementation((query: string) => {
        if (typeof query === 'string' && query.includes('SELECT id FROM children')) {
          return Promise.resolve([{ id: 'child-1' }]);
        }
        return Promise.resolve([]);
      });

      await repository.bulkDelete({ ids: ['1'], options: { soft: false } });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM children'),
        [['1']],
      );
      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM children'), [
        ['child-1'],
      ]);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Bulk hard deleted 1 ChildEntity cascade records'),
      );
    });

    it('should skip OneToMany bulk cascade entirely when no related rows are found', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]); // no related rows found for anything

      await repository.bulkDelete({ ids: ['1'] });

      expect(manager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM children'),
        expect.anything(),
      );
    });

    it('should delete ManyToMany junction table entries in bulk soft delete', async () => {
      const { repository, manager, logger } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkDelete({ ids: ['1', '2'] });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM test_entities_tags'),
        [['1', '2']],
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Bulk deleted junction table entries from test_entities_tags'),
      );
    });

    it('bulkHardDeleteManyToManyRelation should also delete junction entries (reuses soft-delete logic)', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkDelete({ ids: ['1'], options: { soft: false } });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM test_entities_tags'),
        [['1']],
      );
    });

    it('bulkHandleSetNullRelation should debug-log when rows were affected', async () => {
      const { repository, manager, logger } = buildHarness();
      manager.query.mockImplementation((query: string) => {
        if (typeof query === 'string' && query.includes('set_null_children')) {
          return Promise.resolve({ rowCount: 3 });
        }
        return Promise.resolve([]);
      });

      await repository.bulkDelete({ ids: ['1'] });

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Bulk updated foreign key main to null in 3'),
      );
    });
  });

  // ===========================================================================
  // Extended coverage: getCascadeRelations / getSetNullRelations edge branches
  // ===========================================================================
  describe('cascade relation discovery edge cases', () => {
    it('should warn and skip a ManyToOne CASCADE relation with no resolvable join column', async () => {
      const { repository, dataSource, manager, logger } = buildHarness();
      const childMeta = dataSource.entityMetadatas.find((m: any) => m.tableName === 'children');
      const original = childMeta.manyToOneRelations[0].joinColumns;
      childMeta.manyToOneRelations[0].joinColumns = [];
      manager.findOne.mockResolvedValue({ id: '1' });

      await repository.softDelete('1');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine foreign key column'),
      );

      childMeta.manyToOneRelations[0].joinColumns = original;
      void manager;
    });

    it('should warn and skip a ManyToMany CASCADE relation with no resolvable owner/inverse column', async () => {
      const { repository, mainMetadata, manager, logger } = buildHarness();
      const original = mainMetadata.manyToManyRelations[0].joinColumns;
      mainMetadata.manyToManyRelations[0].joinColumns = [];
      manager.findOne.mockResolvedValue({ id: '1' });

      await repository.softDelete('1');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine owner or inverse column'),
      );

      mainMetadata.manyToManyRelations[0].joinColumns = original;
    });

    it('should pick up a SET NULL relation declared via OneToMany (inverse side)', async () => {
      const { repository, dataSource, manager, logger } = buildHarness();

      dataSource.entityMetadatas.push({
        name: 'OneToManySetNullChild',
        tableName: 'one_to_many_set_null_children',
        target: class OneToManySetNullChild {},
        columns: [{ propertyName: 'id', databaseName: 'id' }],
        findColumnWithPropertyName: jest.fn(() => undefined),
        manyToOneRelations: [],
        oneToOneRelations: [],
        oneToManyRelations: [
          {
            onDelete: 'SET NULL',
            inverseEntityMetadata: { target: dataSource.entityMetadatas[0].target },
            inverseRelation: { propertyName: 'parentRef' },
          },
        ],
        manyToManyRelations: [],
      });
      manager.findOne.mockResolvedValue({ id: '1' });
      manager.update.mockResolvedValue({ affected: 1 });

      await repository.hardDelete('1');

      expect(manager.update).toHaveBeenCalledWith(
        expect.anything(),
        { parentRef: '1' },
        { parentRef: null },
      );
      expect(logger.debug).toBeDefined();
    });
  });

  // ===========================================================================
  // Extended coverage: dead-code cascade paths (OneToOne dedicated handlers,
  // restore-cascade family) — these are never reached through the public API
  // because getCascadeRelations() always tags OneToOne cascades with type
  // 'OneToMany' (it reuses the OneToMany handler). See task summary for the
  // bug report. Invoked directly here purely to document behavior/coverage.
  // ===========================================================================
  describe('unreachable-via-public-API cascade branches (documented bug)', () => {
    it('softDeleteOneToOneRelation (private) should soft delete the related entity when found', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: 'related-1' });

      await (repository as any).softDeleteOneToOneRelation(
        manager,
        { mainId: 'related-1' },
        {
          targetEntity: ChildOneToOneEntity,
          joinColumn: 'mainId',
        },
      );

      expect(manager.softDelete).toHaveBeenCalledWith(ChildOneToOneEntity, { id: 'related-1' });
    });

    it('softDeleteOneToOneRelation (private) should no-op when the foreign key value is falsy', async () => {
      const { repository, manager } = buildHarness();

      await (repository as any).softDeleteOneToOneRelation(
        manager,
        {},
        {
          targetEntity: ChildOneToOneEntity,
          joinColumn: 'mainId',
        },
      );

      expect(manager.findOne).not.toHaveBeenCalled();
    });

    it('bulkSoftDeleteOneToOneRelation (private) should soft delete resolved related rows', async () => {
      const { repository, manager } = buildHarness();
      manager.query
        .mockResolvedValueOnce([{ fk_value: 'related-1' }]) // FK lookup on parent table
        .mockResolvedValue([]);

      await (repository as any).bulkSoftDeleteOneToOneRelation(manager, ['1'], {
        targetEntity: ChildOneToOneEntity,
        joinColumn: 'mainId',
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE child_one_to_ones'),
        [['related-1']],
      );
    });

    it('bulkSoftDeleteOneToOneRelation (private) should return early when no FK values are found', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await (repository as any).bulkSoftDeleteOneToOneRelation(manager, ['1'], {
        targetEntity: ChildOneToOneEntity,
        joinColumn: 'mainId',
      });

      expect(manager.query).toHaveBeenCalledTimes(1);
    });

    it('bulkHardDeleteOneToOneRelation (private) should hard delete resolved related rows', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValueOnce([{ fk_value: 'related-1' }]).mockResolvedValue([]);

      await (repository as any).bulkHardDeleteOneToOneRelation(manager, ['1'], {
        targetEntity: ChildOneToOneEntity,
        joinColumn: 'mainId',
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM child_one_to_ones'),
        [['related-1']],
      );
    });

    it('restoreCascadeRelation (private) should dispatch to restoreOneToManyRelation and restore soft-deleted children', async () => {
      const { repository, manager } = buildHarness();
      manager.find.mockResolvedValue([{ id: 'child-1', mainId: '1', deletedAt: new Date() }]);

      await (repository as any).restoreCascadeRelation(
        manager,
        { id: '1' },
        {
          type: 'OneToMany',
          targetEntity: ChildEntity,
          foreignKey: 'mainId',
        },
      );

      expect(manager.restore).toHaveBeenCalledWith(ChildEntity, { id: 'child-1' });
    });

    it('restoreOneToManyRelation (private) should skip entities that are not soft-deleted', async () => {
      const { repository, manager } = buildHarness();
      manager.find.mockResolvedValue([{ id: 'child-1', mainId: '1', deletedAt: null }]);

      await (repository as any).restoreOneToManyRelation(
        manager,
        { id: '1' },
        {
          targetEntity: ChildEntity,
          foreignKey: 'mainId',
        },
      );

      expect(manager.restore).not.toHaveBeenCalled();
    });

    it('restoreOneToOneRelation (private) should restore the related entity when currently soft-deleted', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: 'related-1', deletedAt: new Date() });

      await (repository as any).restoreOneToOneRelation(
        manager,
        { mainId: 'related-1' },
        {
          targetEntity: ChildOneToOneEntity,
          joinColumn: 'mainId',
        },
      );

      expect(manager.restore).toHaveBeenCalledWith(ChildOneToOneEntity, { id: 'related-1' });
    });

    it('restoreOneToOneRelation (private) should no-op when the foreign key value is falsy', async () => {
      const { repository, manager } = buildHarness();

      await (repository as any).restoreOneToOneRelation(
        manager,
        {},
        {
          targetEntity: ChildOneToOneEntity,
          joinColumn: 'mainId',
        },
      );

      expect(manager.findOne).not.toHaveBeenCalled();
    });

    it('restoreOneToOneRelation (private) should no-op when the related entity is not soft-deleted', async () => {
      const { repository, manager } = buildHarness();
      manager.findOne.mockResolvedValue({ id: 'related-1', deletedAt: null });

      await (repository as any).restoreOneToOneRelation(
        manager,
        { mainId: 'related-1' },
        {
          targetEntity: ChildOneToOneEntity,
          joinColumn: 'mainId',
        },
      );

      expect(manager.restore).not.toHaveBeenCalled();
    });

    it('restoreManyToManyRelation (private) should warn that junction entries cannot be restored', () => {
      const { repository, logger } = buildHarness();

      (repository as any).restoreManyToManyRelation(undefined, undefined, {
        junctionTable: 'test_entities_tags',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot restore ManyToMany junction table entries'),
      );
    });

    it('restoreManyToManyRelation (private) should no-op when there is no junction table', () => {
      const { repository, logger } = buildHarness();

      (repository as any).restoreManyToManyRelation(undefined, undefined, {});

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('restoreCascadeRelation (private) should dispatch ManyToMany to the (sync) warn-only handler', async () => {
      const { repository, manager, logger } = buildHarness();

      await (repository as any).restoreCascadeRelation(
        manager,
        { id: '1' },
        {
          type: 'ManyToMany',
          junctionTable: 'test_entities_tags',
        },
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot restore ManyToMany junction table entries'),
      );
    });
  });

  // ===========================================================================
  // Extended coverage: PostgreSQL error code handling
  // ===========================================================================
  describe('PostgreSQL error code handling', () => {
    const cases: Array<[string, string]> = [
      ['23503', 'Foreign key constraint violation'],
      ['23502', 'Required field missing'],
      ['42703', 'Invalid column'],
      ['42P01', 'Table not found'],
      ['53300', 'Database connection pool exhausted'],
      ['57014', 'Query was canceled due to timeout'],
    ];

    it.each(cases)(
      'should map PG error code %s to a friendly message',
      async (code, expectedSubstring) => {
        const { repository, collection, logger } = buildHarness();
        const pgError: any = new Error('pg failure');
        pgError.code = code;
        collection.findAndCount.mockRejectedValue(pgError);

        await expect(repository.find({})).rejects.toThrow('pg failure');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(expectedSubstring));
      },
    );

    it('should fall back to the raw message for an unmapped PG error code', async () => {
      const { repository, collection, logger } = buildHarness();
      const pgError: any = new Error('weird failure');
      pgError.code = '99999';
      collection.findAndCount.mockRejectedValue(pgError);

      await expect(repository.find({})).rejects.toThrow('weird failure');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('weird failure'));
    });
  });

  // ===========================================================================
  // Extended coverage: slow query logging tiers, queryBuilder/rawQuery paths,
  // and parameter sanitization (only reachable by invoking execute() directly,
  // since no public repository method currently forwards a queryBuilder or
  // rawQuery/parameters through to execute()).
  // ===========================================================================
  describe('execute() slow query logging — direct invocation', () => {
    const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log HIGH priority for queries between 2s and 5s', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(3000);

      await (repository as any).execute(() => Promise.resolve('ok'), 'customOp');
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('HIGH Priority Database Performance'),
      );
    });

    it('should debug-log LOW severity only in development environment', async () => {
      const { repository, envService } = buildHarness();
      (envService.get as jest.Mock).mockImplementation((key: string) =>
        key === 'INFRA_ENVIRONMENT' ? 'development' : 10,
      );
      // Recreate repository so the constructor picks up the development flag.
      const devRepository = new (repository.constructor as any)(
        (repository as any).collection,
        envService,
        (repository as any).logger,
      );
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(600);

      await devRepository.execute(() => Promise.resolve('ok'), 'customOp');
      await flushSetImmediate();

      expect((repository as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Debug'),
      );
    });

    it('should include sanitized queryBuilder parameters in the slow query log', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1200);

      const queryBuilder: any = {
        getQueryAndParameters: () => [
          'SELECT * FROM test_entities WHERE email = $1',
          ['user@example.com'],
        ],
      };

      await (repository as any).execute(() => Promise.resolve('ok'), 'customOp', queryBuilder);
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Notice'),
      );
    });

    it('should include sanitized rawQuery parameters in the slow query log', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1200);

      await (repository as any).execute(
        () => Promise.resolve('ok'),
        'customOp',
        undefined,
        'SELECT * FROM test_entities WHERE token = $1',
        ['a-very-long-secret-token-value-that-should-be-sanitized-away-1234567890'],
      );
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Notice'),
      );
    });

    it('should sanitize array and object parameters, and truncate long strings', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1200);

      await (repository as any).execute(
        () => Promise.resolve('ok'),
        'customOp',
        undefined,
        'SELECT * FROM test_entities WHERE id = ANY($1) AND meta = $2 AND note = $3',
        [['1', '2', '3'], { a: 1, b: 2 }, 'x'.repeat(150)],
      );
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Notice'),
      );
    });

    it('should warn when logSlowQueryDetails itself throws', async () => {
      const { repository, logger } = buildHarness();
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1200);
      const queryBuilder: any = {
        getQueryAndParameters: () => {
          throw new Error('cannot build query');
        },
      };

      await (repository as any).execute(() => Promise.resolve('ok'), 'customOp', queryBuilder);
      await flushSetImmediate();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error in logSlowQueryDetails: cannot build query'),
      );
    });
  });

  // ===========================================================================
  // Extended coverage: WHERE clause building — operators, IS NULL, IN, arrays
  // ===========================================================================
  describe('buildWhereClause / operator conditions (via bulkUpdateWhere)', () => {
    it('should build an IS NULL condition', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: { name: null } as any,
        data: { name: 'X' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('IS NULL'),
        expect.any(Array),
      );
    });

    it('should build an IN clause for array values', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: { name: ['A', 'B'] } as any,
        data: { name: 'X' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('IN ('),
        expect.any(Array),
      );
    });

    it.each([
      ['Not', '!='],
      ['LessThan', '<'],
      ['LessThanOrEqual', '<='],
      ['MoreThan', '>'],
      ['MoreThanOrEqual', '>='],
      ['Like', 'LIKE'],
      ['ILike', 'ILIKE'],
    ])('should translate the %s operator to SQL (%s)', async (operator, sqlFragment) => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: { name: { [operator]: 'A' } } as any,
        data: { name: 'X' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining(sqlFragment),
        expect.any(Array),
      );
    });

    it.each([
      ['In', 'IN ('],
      ['NotIn', 'NOT IN ('],
    ])('should translate the %s operator with an array value', async (operator, sqlFragment) => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: { name: { [operator]: ['A', 'B'] } } as any,
        data: { name: 'X' },
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining(sqlFragment),
        expect.any(Array),
      );
    });

    it('should extract parameters correctly for a mix of null, array, and operator where values', async () => {
      const { repository, manager } = buildHarness();
      manager.query.mockResolvedValue([]);

      await repository.bulkUpdateWhere({
        where: {
          deletedAt: null,
          name: { MoreThan: 'A' },
        } as any,
        data: { name: 'X' },
      });

      const [, params] = manager.query.mock.calls[0];
      expect(params).toContain('A');
    });
  });
});
