import { Repository } from 'typeorm';
import { OrdersRepository } from './orders.repository';
import { OrderEntity } from '../entities/order.entity';
import { TEnvService } from '@/modules/env/services/env.service';
import { OrderStatusEnum } from '../enums/order-status.enum';

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
  let envService: jest.Mocked<TEnvService>;

  const columns = [
    { propertyName: 'id', databaseName: 'id' },
    { propertyName: 'createdAt', databaseName: 'created_at' },
    { propertyName: 'updatedAt', databaseName: 'updated_at' },
    { propertyName: 'deletedAt', databaseName: 'deleted_at' },
    { propertyName: 'code', databaseName: 'code' },
    { propertyName: 'customerName', databaseName: 'customer_name' },
    { propertyName: 'amount', databaseName: 'amount' },
    { propertyName: 'status', databaseName: 'status' },
  ];

  const order: Partial<OrderEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'ORD-ABCD1234',
    customerName: 'John Doe',
    amount: 100,
    status: OrderStatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let manager: {
    findOne: jest.Mock;
    softDelete: jest.Mock;
    delete: jest.Mock;
    query: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
    entityMetadatas: unknown[];
  };
  let typeormRepository: jest.Mocked<Repository<OrderEntity>>;

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: (manager: unknown) => Promise<void>) => cb(manager)),
      entityMetadatas: [],
    };

    typeormRepository = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      target: OrderEntity,
      metadata: {
        tableName: 'orders',
        target: OrderEntity,
        columns,
        name: 'OrderEntity',
        manyToManyRelations: [],
        manyToOneRelations: [],
        oneToManyRelations: [],
        oneToOneRelations: [],
        findColumnWithPropertyName: (name: string) =>
          columns.find((column) => column.propertyName === name),
      },
      manager: {
        connection: dataSource,
      },
    } as unknown as jest.Mocked<Repository<OrderEntity>>;

    envService = {
      get: jest.fn((key: string) => {
        if (key === 'UTILITIES_PAGINATION_LIMIT') return 20;
        if (key === 'INFRA_ENVIRONMENT') return 'test';
        return undefined;
      }),
    } as unknown as jest.Mocked<TEnvService>;

    repository = new OrdersRepository(typeormRepository, envService);
  });

  describe('create', () => {
    it('should persist and return the created order', async () => {
      typeormRepository.save.mockResolvedValue(order as OrderEntity);

      const result = await repository.create({
        data: {
          code: 'ORD-ABCD1234',
          customerName: 'John Doe',
          amount: 100,
          status: OrderStatusEnum.PENDING,
        },
      });

      expect(typeormRepository.create).toHaveBeenCalled();
      expect(typeormRepository.save).toHaveBeenCalled();
      expect(result).toEqual(order);
    });
  });

  describe('find', () => {
    it('should return a paginated result', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[order as OrderEntity], 1]);

      const result = await repository.find({ page: 1, offset: 10 });

      expect(typeormRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result).toEqual({ data: [order], hasNextPage: false, total: 1 });
    });

    it('should indicate there is a next page when total exceeds the current page', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[order as OrderEntity], 25]);

      const result = await repository.find({ page: 1, offset: 10 });

      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return the model when found', async () => {
      typeormRepository.findOne.mockResolvedValue(order as OrderEntity);

      const result = await repository.findById({ id: order.id! });

      expect(result).toEqual(order);
    });

    it('should return a falsy value when not found', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById({ id: order.id! });

      // AbstractRepository's default toModel() casts the raw TypeORM result,
      // so a `null` lookup surfaces as `null` here (not `undefined`).
      expect(result).toBeFalsy();
    });

    it('should return undefined immediately for an empty id without querying', async () => {
      const result = await repository.findById({ id: '' });

      expect(result).toBeUndefined();
      expect(typeormRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the model matching the criteria', async () => {
      typeormRepository.findOne.mockResolvedValue(order as OrderEntity);

      const result = await repository.findOne({ where: { code: order.code } });

      expect(result).toEqual(order);
    });
  });

  describe('update', () => {
    it('should update and return the updated model', async () => {
      const updated = { ...order, customerName: 'Jane Doe' };
      typeormRepository.findOne.mockResolvedValue(order as OrderEntity);
      typeormRepository.save.mockResolvedValue(updated as OrderEntity);

      const result = await repository.update({
        id: order.id!,
        data: { customerName: 'Jane Doe' },
      });

      expect(result).toEqual(updated);
    });

    it('should throw when the entity does not exist', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.update({ id: order.id!, data: { customerName: 'Jane Doe' } }),
      ).rejects.toThrow(`Entity with id ${order.id} not found`);
    });
  });

  describe('softDelete', () => {
    it('should soft delete the entity when it exists', async () => {
      manager.findOne.mockResolvedValue(order);

      await repository.softDelete(order.id!);

      expect(manager.softDelete).toHaveBeenCalledWith(OrderEntity, { id: order.id });
    });

    it('should do nothing when the entity does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await repository.softDelete(order.id!);

      expect(manager.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return the total count', async () => {
      typeormRepository.count.mockResolvedValue(5);

      const result = await repository.count({});

      expect(result).toBe(5);
    });
  });
});
