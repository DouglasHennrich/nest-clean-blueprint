import {
  DataSource,
  EntityManager,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Not,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import { ILogger } from "./custom-logger";
import { TEnvService } from "@/modules/env/services/env.service";

export interface IPagination<T> {
  hasNextPage: boolean;
  total?: number;
  data: T[];
}

interface IBulkOperationOptions {
  chunkSize?: number;
  useTransaction?: boolean;
  noModelReturn?: boolean;
  onConflictAction?: "DO_NOTHING" | "DO_UPDATE";
  conflictColumns?: string[];
}

// PostgreSQL-specific types and interfaces
interface IPostgreSQLError {
  message: string;
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

interface IQueryPerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  affectedRows?: number;
  queryPlan?: any;
}

export interface IRepository<Entity extends ObjectLiteral, Model> {
  create(
    data: Omit<Entity, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ): Promise<Model>;

  find(criteria: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
    select?: FindOptionsSelect<Entity>;
    relations?: FindOptionsRelations<Entity>;
    order?: FindOptionsOrder<Entity>;
    offset?: number;
    page?: number;
  }): Promise<IPagination<Model>>;

  findAll(criteria: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
    order?: FindOptionsOrder<Entity>;
    relations?: FindOptionsRelations<Entity>;
  }): Promise<Model[]>;

  findOne(criteria: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
    select?: FindOptionsSelect<Entity>;
    relations?: FindOptionsRelations<Entity>;
  }): Promise<Model | null>;

  findById(
    id: string,
    specs?: {
      excludeId?: string;
      includeDeleted?: boolean;
      select?: FindOptionsSelect<Entity>;
      relations?: FindOptionsRelations<Entity>;
    },
  ): Promise<Model | null>;

  findLast(criteria: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
    relations?: FindOptionsRelations<Entity>;
  }): Promise<Model | null>;

  count(criteria: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
  }): Promise<number>;

  update(
    id: string,
    data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">,
    opts?: { relations?: FindOptionsRelations<Entity> },
  ): Promise<Model>;

  softDelete(id: string | FindOptionsWhere<Entity>): Promise<void>;

  hardDelete(id: string | FindOptionsWhere<Entity>): Promise<void>;

  restoreSoftDeleted(
    id: string | FindOptionsWhere<Entity>,
  ): Promise<Model | null>;

  queryBuilder(alias: string): SelectQueryBuilder<Entity>;

  bulkCreate(payload: {
    data: Array<{
      data: Omit<Entity, "id" | "createdAt" | "updatedAt">;
      id?: string;
    }>;
    options?: IBulkOperationOptions;
  }): Promise<Model[]>;

  bulkUpdate(payload: {
    data: Array<{
      id: string;
      data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">;
    }>;
    options?: IBulkOperationOptions;
  }): Promise<Model[]>;

  bulkUpdateWhere(payload: {
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">;
    options?: IBulkOperationOptions;
  }): Promise<Model[]>;

  bulkDelete(payload: {
    ids: string[];
    options?: { soft?: boolean; chunkSize?: number; useTransaction?: boolean };
  }): Promise<void>;
}

/**
 * AbstractRepository<Entity, Model>
 *
 * Base repository providing the standard CRUD + pagination surface used by
 * every domain repository in the codebase.
 *
 * Convention: define an abstract token I<Entities>Repository that extends
 * this class (so it serves as both the type and the DI token), then a
 * concrete @Injectable class extends the token. Wire via useClass.
 *
 *   export class IOrdersRepository extends AbstractRepository<OrderEntity, IOrderModel> {}
 *
 *   @Injectable()
 *   export class OrdersRepository extends IOrdersRepository {
 *     constructor(@InjectRepository(OrderEntity) repo, env, logger) {
 *       super(repo, env, logger);
 *     }
 *   }
 */
export abstract class AbstractRepository<
  Entity extends ObjectLiteral,
  Model,
> implements IRepository<Entity, Model> {
  protected defaultPaginationLimit: number;
  protected developmentEnv: boolean;

  constructor(
    protected readonly collection: Repository<Entity>,
    protected readonly envService: TEnvService,
    public readonly logger: ILogger,
  ) {
    this.defaultPaginationLimit = this.envService.get(
      "UTILITIES_PAGINATION_LIMIT",
    );
    this.developmentEnv =
      this.envService.get("INFRA_ENVIRONMENT") === "development";
  }

  /**
   * Override this hook to map an Entity to its corresponding Model.
   * Default implementation returns the entity as-is (assumes Entity implements Model).
   */
  protected toModel(entity: Entity | null): Model | null {
    if (!entity) return null;
    return entity as unknown as Model;
  }

  protected get dataSource(): DataSource {
    return this.collection.manager.connection;
  }

  // =============================================================================
  // Interface functions
  // =============================================================================

  async create(
    data: Omit<Entity, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ): Promise<Model> {
    return this.execute(async () => {
      const entityData = id ? { ...data, id } : data;
      const savedEntity = await this.collection.save(
        this.collection.create(
          entityData as unknown as import("typeorm").DeepPartial<Entity>,
        ),
      );

      const model = this.toModel(savedEntity);

      if (!model) {
        throw new Error(`Failed to transform entity to model`);
      }

      return model;
    }, "create");
  }

  async find({
    where,
    excludeId,
    select,
    relations,
    order,
    offset,
    page,
    includeDeleted = false,
  }: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    select?: FindOptionsSelect<Entity>;
    relations?: FindOptionsRelations<Entity>;
    order?: FindOptionsOrder<Entity>;
    offset?: number;
    page?: number;
    includeDeleted?: boolean;
  }): Promise<IPagination<Model>> {
    return this.execute(async () => {
      const transformedPage = page ?? 1;
      const transformedOffset: number = offset ?? this.defaultPaginationLimit;
      const skip: number = (transformedPage - 1) * transformedOffset;

      const [data, totalRecords] = await this.collection.findAndCount({
        where: excludeId
          ? ({
              ...where,
              id: Not(excludeId),
            } as unknown as FindOptionsWhere<Entity>)
          : where,
        select,
        relations,
        skip,
        take: transformedOffset,
        order,
        withDeleted: includeDeleted,
      });

      const models = data
        .map((entity) => this.toModel(entity))
        .filter((model): model is Model => model !== null);

      return {
        data: models,
        hasNextPage: totalRecords > transformedPage * transformedOffset,
        total: totalRecords,
      };
    }, "find");
  }

  async findAll({
    where,
    relations,
    excludeId,
    order,
    includeDeleted = false,
  }: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    relations?: FindOptionsRelations<Entity>;
    order?: FindOptionsOrder<Entity>;
    includeDeleted?: boolean;
  }): Promise<Model[]> {
    return this.execute(async () => {
      const entities = await this.collection.find({
        relations,
        where: excludeId
          ? ({
              ...where,
              id: Not(excludeId),
            } as unknown as FindOptionsWhere<Entity>)
          : where,
        withDeleted: includeDeleted,
        order,
      });

      const models = entities
        .map((entity) => this.toModel(entity))
        .filter((model): model is Model => model !== null);

      return models;
    }, "findAll");
  }

  async findOne({
    where,
    select,
    relations,
    excludeId,
    includeDeleted = false,
  }: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    select?: FindOptionsSelect<Entity>;
    relations?: FindOptionsRelations<Entity>;
    excludeId?: string;
    includeDeleted?: boolean;
  }): Promise<Model | null> {
    return this.execute(async () => {
      const entity = await this.collection.findOne({
        where: excludeId
          ? ({
              ...where,
              id: Not(excludeId),
            } as unknown as FindOptionsWhere<Entity>)
          : where,
        select,
        relations,
        withDeleted: includeDeleted,
      });

      return this.toModel(entity);
    }, "findOne");
  }

  async findById(
    id: string,
    {
      select,
      relations,
      includeDeleted,
    }: {
      select?: FindOptionsSelect<Entity>;
      relations?: FindOptionsRelations<Entity>;
      includeDeleted?: boolean;
    } = {
      includeDeleted: false,
    },
  ): Promise<Model | null> {
    return this.execute(async () => {
      if (id?.length === undefined || id?.length === 0 || id?.length === null) {
        return null;
      }

      const entity = await this.collection.findOne({
        where: { id } as unknown as FindOptionsWhere<Entity>,
        select,
        relations,
        withDeleted: includeDeleted,
      });

      return this.toModel(entity);

      //
    }, "findById");
  }

  async findLast({
    where,
    relations,
    excludeId,
    includeDeleted = false,
  }: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    relations?: FindOptionsRelations<Entity>;
    excludeId?: string;
    includeDeleted?: boolean;
  }): Promise<Model | null> {
    return this.execute(async () => {
      const order: FindOptionsOrder<Entity> = {
        createdAt: "DESC",
      } as never;

      const entity = await this.collection.findOne({
        where: excludeId
          ? ({
              ...where,
              id: Not(excludeId),
            } as unknown as FindOptionsWhere<Entity>)
          : where,
        relations,
        order,
        withDeleted: includeDeleted,
      });

      return this.toModel(entity);

      //
    }, "findLast");
  }

  async count({
    where,
    excludeId,
    includeDeleted = false,
  }: {
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    excludeId?: string;
    includeDeleted?: boolean;
  }): Promise<number> {
    return this.execute(async () => {
      const totalRecords = await this.collection.count({
        where: excludeId
          ? ({
              ...where,
              id: Not(excludeId),
            } as unknown as FindOptionsWhere<Entity>)
          : where,
        withDeleted: includeDeleted,
      });

      return totalRecords;

      //
    }, "count");
  }

  async update(
    id: string,
    data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">,
    { relations }: { relations?: FindOptionsRelations<Entity> } = {},
  ): Promise<Model> {
    return this.execute(async () => {
      const entity = await this.collection.findOne({
        where: { id } as unknown as FindOptionsWhere<Entity>,
      });

      if (!entity) {
        throw new Error(`Entity with id ${id} not found`);
      }

      const updated = await this.collection.save({
        ...entity,
        ...data,
        id,
      });

      if (relations) {
        const entityWithRelations = await this.collection.findOne({
          where: { id } as unknown as FindOptionsWhere<Entity>,
          relations,
        });

        const model = this.toModel(entityWithRelations);

        if (!model) {
          throw new Error(
            `Failed to transform entity to model after update with relations`,
          );
        }

        return model;
      }

      const model = this.toModel(updated);
      if (!model) {
        throw new Error(`Failed to transform entity to model after update`);
      }
      return model;
    }, "update");
  }

  async hardDelete(id: string | FindOptionsWhere<Entity>): Promise<void> {
    return this.execute(async () => {
      await this.dataSource.transaction(async (manager) => {
        // First, find the entity to get its relations
        const whereCondition =
          typeof id === "string"
            ? ({ id } as unknown as FindOptionsWhere<Entity>)
            : id;

        const entity = await manager.findOne(this.collection.target, {
          where: whereCondition,
        });

        if (!entity) {
          return; // Entity doesn't exist, nothing to delete
        }

        // Get all SET NULL relationships for this entity
        const setNullRelations = this.getSetNullRelations();

        // Handle SET NULL relations (update foreign keys to null)
        for (const setNullRelation of setNullRelations) {
          await this.handleSetNullRelation(manager, entity, setNullRelation);
        }

        // Finally, hard delete the main entity
        await manager.delete(this.collection.target, whereCondition);
      });
    }, "hardDelete");
  }

  async softDelete(id: string | FindOptionsWhere<Entity>): Promise<void> {
    return this.execute(async () => {
      await this.dataSource.transaction(async (manager) => {
        // First, find the entity to get its relations
        const whereCondition =
          typeof id === "string"
            ? ({ id } as unknown as FindOptionsWhere<Entity>)
            : id;

        const entity = await manager.findOne(this.collection.target, {
          where: whereCondition,
        });

        if (!entity) {
          return; // Entity doesn't exist, nothing to delete
        }

        // Check if the main entity has soft delete enabled
        if (!this.getDeletedAtColumnName()) {
          this.logger.warn(
            `Entity ${this.collection.metadata.tableName} does not have soft delete enabled. Skipping soft delete operation.`,
          );
          return; // Skip the operation instead of throwing error
        }

        // Get all SET NULL relationships for this entity
        const setNullRelations = this.getSetNullRelations();

        // Get all cascade relationships for this entity
        const cascadeRelations = this.getCascadeRelations();

        // First, handle SET NULL relations (update foreign keys to null)
        for (const setNullRelation of setNullRelations) {
          await this.handleSetNullRelation(manager, entity, setNullRelation);
        }

        // Recursively soft delete cascade relations first
        for (const relation of cascadeRelations) {
          await this.softDeleteCascadeRelation(manager, entity, relation);
        }

        // Finally, soft delete the main entity
        await manager.softDelete(this.collection.target, whereCondition);
      });
    }, "softDelete");
  }

  async restoreSoftDeleted(
    id: string | FindOptionsWhere<Entity>,
  ): Promise<Model | null> {
    return this.execute(async () => {
      const entity = await this.collection.findOne({
        where: { id } as unknown as FindOptionsWhere<Entity>,
        withDeleted: true,
      });

      if (!entity) {
        throw new Error(`Entity with id ${id} not found`);
      }

      await this.collection.restore(id);

      return this.toModel(entity);
    }, "restoreSoftDeleted");
  }

  queryBuilder(alias: string): SelectQueryBuilder<Entity> {
    try {
      return this.collection.createQueryBuilder(alias);
    } catch (error) {
      this.logger.warn(`Error creating query builder: ${error.message}`);

      throw error;
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================
  async batchUpsert(
    dataArray: Array<{
      data: Omit<Entity, "id" | "createdAt" | "updatedAt">;
      id?: string;
    }>,
    conflictColumns: string[] = ["id"],
    updateOnConflict = true,
    chunkSize = 1000,
  ): Promise<Model[]> {
    return this.execute(async () => {
      if (dataArray.length === 0) return [];

      const results: Model[] = [];

      for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, i + chunkSize);

        const chunkResult = await this.dataSource.transaction(
          async (manager) => {
            const tableName = this.collection.metadata.tableName;

            const sampleData = chunk[0].id
              ? { ...chunk[0].data, id: chunk[0].id }
              : chunk[0].data;
            const columns = Object.keys(sampleData);

            const valuesClauses: string[] = [];
            const allValues: any[] = [];
            let paramIndex = 1;

            chunk.forEach((item) => {
              const entityData = item.id
                ? { ...item.data, id: item.id }
                : item.data;
              const itemValues = columns.map(
                (col) => (entityData as Record<string, unknown>)[col],
              );
              const itemPlaceholders = itemValues
                .map(() => `$${paramIndex++}`)
                .join(", ");

              valuesClauses.push(`(${itemPlaceholders})`);
              allValues.push(...itemValues);
            });

            let query = `
            INSERT INTO ${tableName} (${columns.map((c) => `"${c}"`).join(", ")})
            VALUES ${valuesClauses.join(", ")}
            ON CONFLICT (${conflictColumns.map((c) => `"${c}"`).join(", ")})
          `;

            if (updateOnConflict) {
              const updateColumns = columns
                .filter(
                  (col) =>
                    !conflictColumns.includes(col) && col !== "createdAt",
                )
                .map((col) => `"${col}" = EXCLUDED."${col}"`)
                .join(", ");

              query += ` DO UPDATE SET ${updateColumns}${this.getUpdatedAtClause()}`;
            } else {
              query += " DO NOTHING";
            }

            query += " RETURNING *";

            const batchResult = await manager.query(query, allValues);
            return batchResult
              .map((entity: Entity) => this.toModel(entity))
              .filter((model): model is Model => model !== null);
          },
        );

        results.push(...chunkResult);
      }

      return results;
    }, "batchUpsert");
  }

  async bulkCreate({
    data,
    options = {},
  }: {
    data: Array<{
      data: Omit<Entity, "id" | "createdAt" | "updatedAt">;
      id?: string;
    }>;
    options?: IBulkOperationOptions;
  }): Promise<Model[]> {
    return this.execute(async () => {
      const {
        chunkSize = 1000,
        useTransaction = true,
        noModelReturn = false,
        onConflictAction = "DO_NOTHING",
        conflictColumns = ["id"],
      } = options;

      const results: Model[] = [];
      if (data.length === 0) return results;

      const optimizedChunkSize = noModelReturn ? 5000 : chunkSize;

      const executeOperation = async (manager: EntityManager) => {
        for (let i = 0; i < data.length; i += optimizedChunkSize) {
          const chunk = data.slice(i, i + optimizedChunkSize);

          if (onConflictAction !== "DO_NOTHING") {
            const chunkResults = await this.batchUpsert(
              chunk,
              conflictColumns,
              onConflictAction === "DO_UPDATE",
              optimizedChunkSize,
            );

            if (!noModelReturn) {
              results.push(...chunkResults);
            }
          } else {
            const tableName = this.collection.metadata.tableName;
            const hasUpdatedAt = this.collection.metadata.columns.some(
              (col: any) =>
                col.propertyName === "updatedAt" ||
                col.databaseName === "updated_at",
            );
            const valuesToInsert = chunk.map((item) => {
              const entityData =
                item.id && typeof item.id === "string"
                  ? { ...item.data, id: item.id }
                  : item.data;

              const result: any = {
                ...entityData,
                createdAt: new Date(),
              };

              if (hasUpdatedAt) {
                result.updatedAt = new Date();
              }

              return result;
            });

            if (valuesToInsert.length === 0) continue;

            const propertyNames = Object.keys(valuesToInsert[0]);
            const metadata = this.collection.metadata;

            const columnMappings: {
              propertyName: string;
              columnName: string;
            }[] = [];

            propertyNames.forEach((propertyName) => {
              const column = metadata.findColumnWithPropertyName(propertyName);
              if (column) {
                columnMappings.push({
                  propertyName,
                  columnName: column.databaseName,
                });
              } else {
                columnMappings.push({
                  propertyName,
                  columnName: propertyName,
                });
              }
            });

            const columns = columnMappings.map((mapping) => mapping.columnName);
            const values: any[] = [];
            const placeholders: string[] = [];

            valuesToInsert.forEach((row, rowIndex) => {
              const rowPlaceholders: string[] = [];

              columnMappings.forEach((mapping, colIndex) => {
                const paramIndex =
                  rowIndex * columnMappings.length + colIndex + 1;

                rowPlaceholders.push(`$${paramIndex}`);
                values.push(row[mapping.propertyName]);
              });

              placeholders.push(`(${rowPlaceholders.join(", ")})`);
            });

            let query = `
              INSERT INTO ${tableName} (${columns
                .map((c) => `"${c}"`)
                .join(", ")})
              VALUES ${placeholders.join(", ")}
            `;

            if (conflictColumns.length > 0) {
              query += ` ON CONFLICT (${conflictColumns
                .map((c) => `"${c}"`)
                .join(", ")}) DO NOTHING`;
            }

            if (!noModelReturn) {
              query += " RETURNING *";
            }

            const insertResult = await manager.query(query, values);

            if (!noModelReturn && insertResult.length > 0) {
              const models = insertResult
                .map((entity: Entity) => this.toModel(entity))
                .filter((model): model is Model => model !== undefined);

              results.push(...models);
            }
          }
        }
      };

      if (useTransaction) {
        await this.dataSource.transaction(executeOperation);
      } else {
        await executeOperation(this.collection.manager);
      }

      return results;
    }, "bulkCreate");
  }

  async bulkUpdate({
    data,
    options = {},
  }: {
    data: Array<{
      id: string;
      data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">;
    }>;
    options?: IBulkOperationOptions;
  }): Promise<Model[]> {
    return this.execute(async () => {
      const {
        chunkSize = 1000,
        useTransaction = true,
        noModelReturn = false,
      } = options;
      const results: Model[] = [];

      if (data.length === 0) return results;

      const optimizedChunkSize = noModelReturn ? 2000 : chunkSize;

      const executeOperation = async (manager: EntityManager) => {
        for (let i = 0; i < data.length; i += optimizedChunkSize) {
          const chunk = data.slice(i, i + optimizedChunkSize);
          const tableName = this.collection.metadata.tableName;

          if (chunk.length > 1 && Object.keys(chunk[0].data).length > 0) {
            // Check if all items have the same properties
            const firstItemKeys = Object.keys(chunk[0].data).sort();
            const allHaveSameKeys = chunk.every((item) => {
              const itemKeys = Object.keys(item.data).sort();
              return (
                itemKeys.length === firstItemKeys.length &&
                itemKeys.every((key, idx) => key === firstItemKeys[idx])
              );
            });

            // If not all items have same properties, process individually
            if (!allHaveSameKeys) {
              for (const updateItem of chunk) {
                const propertyNames = Object.keys(updateItem.data).sort();
                const metadata = this.collection.metadata;

                const columnMappings: {
                  propertyName: string;
                  columnName: string;
                }[] = [];

                propertyNames.forEach((propertyName) => {
                  const column =
                    metadata.findColumnWithPropertyName(propertyName);
                  if (column) {
                    columnMappings.push({
                      propertyName,
                      columnName: column.databaseName,
                    });
                  } else {
                    columnMappings.push({
                      propertyName,
                      columnName: propertyName,
                    });
                  }
                });

                const query = `
                  UPDATE ${tableName}
                  SET ${columnMappings
                    .map(
                      (mapping, idx) => `"${mapping.columnName}" = $${idx + 2}`,
                    )
                    .join(", ")}${this.getUpdatedAtClause()}
                  WHERE id = $1
                  ${!noModelReturn ? "RETURNING *" : ""}
                `;

                const parameters = [
                  updateItem.id,
                  ...columnMappings.map(
                    (mapping) => (updateItem.data as any)[mapping.propertyName],
                  ),
                ];

                const updateResult = await manager.query(query, parameters);

                if (!noModelReturn && updateResult.length > 0) {
                  const model = this.toModel(updateResult[0] as Entity);
                  if (model) {
                    results.push(model);
                  }
                }
              }
              continue;
            }

            // All items have same properties - use batch update
            const propertyNames = firstItemKeys;
            const metadata = this.collection.metadata;

            const columnMappings: {
              propertyName: string;
              columnName: string;
            }[] = [];

            propertyNames.forEach((propertyName) => {
              const column = metadata.findColumnWithPropertyName(propertyName);
              if (column) {
                columnMappings.push({
                  propertyName,
                  columnName: column.databaseName,
                });
              } else {
                columnMappings.push({
                  propertyName,
                  columnName: propertyName,
                });
              }
            });

            const updateColumns = columnMappings.map(
              (mapping) => mapping.columnName,
            );
            const ids = chunk.map((item) => item.id);

            if (!noModelReturn) {
              const existingEntities = await manager.query(
                `SELECT id FROM ${tableName} WHERE id = ANY($1)`,
                [ids],
              );

              if (existingEntities.length !== chunk.length) {
                const foundIds: string[] = existingEntities.map(
                  (e: { id: string }) => e.id,
                );
                const missingIds = ids.filter((id) => !foundIds.includes(id));
                throw new Error(
                  `Entities not found for ids: ${missingIds.join(", ")}`,
                );
              }
            }

            const caseStatements = updateColumns.map((column, columnIdx) => {
              const cases = chunk.map((item, itemIdx) => {
                // Parameters are organized as: [ids array, ...ids for WHEN, ...values by column then by item]
                // So for each column, we skip: 1 (ids array) + chunk.length (ids) + (columnIdx * chunk.length) + itemIdx
                const paramIdx =
                  2 + chunk.length + columnIdx * chunk.length + itemIdx;
                return `WHEN id = $${itemIdx + 2} THEN $${paramIdx}`;
              });
              return `"${column}" = CASE ${cases.join(
                " ",
              )} ELSE "${column}" END`;
            });

            const updatedAtColumn = this.getUpdatedAtColumnName();
            if (updatedAtColumn) {
              caseStatements.push(`${updatedAtColumn} = NOW()`);
            }

            const query = `
              UPDATE ${tableName}
              SET ${caseStatements.join(", ")}
              WHERE id = ANY($1)
              ${!noModelReturn ? "RETURNING *" : ""}
            `;

            const parameters: any[] = [ids];
            // Add IDs first (for the WHEN clauses)
            chunk.forEach((item) => parameters.push(item.id));
            // Add values in the same order as the CASE statements: by column, then by item
            // All items are guaranteed to have the same properties at this point
            columnMappings.forEach((mapping) => {
              chunk.forEach((item) => {
                parameters.push((item.data as any)[mapping.propertyName]);
              });
            });

            const updateResult = await manager.query(query, parameters);

            if (!noModelReturn && updateResult.length > 0) {
              const models = (updateResult as Entity[])
                .map((entity: Entity) => this.toModel(entity))
                .filter((model): model is Model => model !== undefined);
              results.push(...models);
            }

            //
          } else {
            for (const updateItem of chunk) {
              const propertyNames = Object.keys(updateItem.data).sort();
              const metadata = this.collection.metadata;

              const columnMappings: {
                propertyName: string;
                columnName: string;
              }[] = [];

              propertyNames.forEach((propertyName) => {
                const column =
                  metadata.findColumnWithPropertyName(propertyName);
                if (column) {
                  columnMappings.push({
                    propertyName,
                    columnName: column.databaseName,
                  });
                } else {
                  columnMappings.push({
                    propertyName,
                    columnName: propertyName,
                  });
                }
              });

              const query = `
                UPDATE ${tableName}
                SET ${columnMappings
                  .map(
                    (mapping, idx) => `"${mapping.columnName}" = $${idx + 2}`,
                  )
                  .join(", ")}${this.getUpdatedAtClause()}
                WHERE id = $1
                ${!noModelReturn ? "RETURNING *" : ""}
              `;

              const parameters = [
                updateItem.id,
                ...columnMappings.map(
                  (mapping) => (updateItem.data as any)[mapping.propertyName],
                ),
              ];

              const updateResult = await manager.query(query, parameters);

              if (!noModelReturn && updateResult.length > 0) {
                const model = this.toModel(updateResult[0] as Entity);
                if (model) {
                  results.push(model);
                }
              }
            }
          }
        }
      };

      if (useTransaction) {
        await this.dataSource.transaction(executeOperation);
      } else {
        await executeOperation(this.collection.manager);
      }

      return results;
    }, "bulkUpdate");
  }

  async bulkUpdateWhere({
    where,
    data,
    options = {},
  }: {
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    data: Omit<Partial<Entity>, "id" | "createdAt" | "updatedAt">;
    options?: IBulkOperationOptions;
  }): Promise<Model[]> {
    return this.execute(async () => {
      const { useTransaction = true, noModelReturn = false } = options;
      const results: Model[] = [];

      if (Object.keys(data).length === 0) return results;

      const executeOperation = async (manager: EntityManager) => {
        const tableName = this.collection.metadata.tableName;
        const propertyNames = Object.keys(data).sort();
        const metadata = this.collection.metadata;

        const columnMappings: {
          propertyName: string;
          columnName: string;
        }[] = [];

        propertyNames.forEach((propertyName) => {
          const column = metadata.findColumnWithPropertyName(propertyName);
          if (column) {
            columnMappings.push({
              propertyName,
              columnName: column.databaseName,
            });
          } else {
            columnMappings.push({
              propertyName,
              columnName: propertyName,
            });
          }
        });

        // Build WHERE clause from the where condition
        const whereClause = this.buildWhereClause(where);
        const whereParams = this.extractWhereParameters(where);

        // Build SET clause
        const setClause = columnMappings
          .map(
            (mapping, idx) =>
              `"${mapping.columnName}" = $${idx + whereParams.length + 1}`,
          )
          .join(", ");

        // Add updatedAt dynamically
        const fullSetClause = `${setClause}${this.getUpdatedAtClause()}`;

        // Build the complete query
        const query = `
          UPDATE ${tableName}
          SET ${fullSetClause}
          WHERE ${whereClause}
          ${!noModelReturn ? "RETURNING *" : ""}
        `;

        // Build parameters array
        const parameters = [
          ...whereParams,
          ...columnMappings.map(
            (mapping) => (data as any)[mapping.propertyName],
          ),
        ];

        const updateResult = await manager.query(query, parameters);

        if (!noModelReturn && updateResult.length > 0) {
          const models = (updateResult as Entity[])
            .map((entity: Entity) => this.toModel(entity))
            .filter((model): model is Model => model !== undefined);
          results.push(...models);
        }
      };

      if (useTransaction) {
        await this.dataSource.transaction(executeOperation);
      } else {
        await executeOperation(this.collection.manager);
      }

      return results;
    }, "bulkUpdateWhere");
  }

  async bulkDelete({
    ids,
    options = { soft: true, chunkSize: 1000, useTransaction: true },
  }: {
    ids: string[];
    options?: IBulkOperationOptions & { soft?: boolean };
  }): Promise<void> {
    return this.execute(async () => {
      const { soft = true, chunkSize = 1000, useTransaction = true } = options;

      if (ids.length === 0) return;

      const executeOperation = async (manager: EntityManager) => {
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          if (soft) {
            await this.bulkSoftDeleteWithCascade(manager, chunk);
          } else {
            await this.bulkHardDeleteWithCascade(manager, chunk);
          }
        }
      };

      if (useTransaction) {
        await this.dataSource.transaction(executeOperation);
      } else {
        await executeOperation(this.collection.manager);
      }
    }, "bulkDelete");
  }

  async bulkDeleteWhere({
    where,
    options = { soft: true, chunkSize: 1000, useTransaction: true },
  }: {
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[];
    options?: IBulkOperationOptions & { soft?: boolean };
  }): Promise<void> {
    return this.execute(async () => {
      const { soft = true, chunkSize = 1000, useTransaction = true } = options;

      const executeOperation = async (manager: EntityManager) => {
        // First, fetch all IDs that match the where condition
        const entities = await manager.find(this.collection.target, {
          where,
          select: ["id"] as any,
          withDeleted: false,
        });

        if (entities.length === 0) return;

        const ids = entities.map((entity: any) => entity.id);

        // Process in chunks
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          if (soft) {
            await this.bulkSoftDeleteWithCascade(manager, chunk);
          } else {
            await this.bulkHardDeleteWithCascade(manager, chunk);
          }
        }
      };

      if (useTransaction) {
        await this.dataSource.transaction(executeOperation);
      } else {
        await executeOperation(this.collection.manager);
      }
    }, "bulkDeleteWhere");
  }

  // =============================================================================
  // Bulk Delete with Cascade (Performance-optimized)
  // =============================================================================

  /**
   * Bulk soft delete with cascade in batch mode
   * Applies SET NULL and CASCADE relations efficiently
   */
  private async bulkSoftDeleteWithCascade(
    manager: EntityManager,
    ids: string[],
  ): Promise<void> {
    const tableName = this.collection.metadata.tableName;
    const deletedAtColumn = this.getDeletedAtColumnName();

    if (!deletedAtColumn) {
      this.logger.warn(
        `Soft delete requested but ${tableName} does not have a deletedAt column. Skipping soft delete.`,
      );
      return;
    }

    // Step 1: Get all SET NULL relationships
    const setNullRelations = this.getSetNullRelations();

    // Step 2: Apply SET NULL in batch for all relations
    for (const setNullRelation of setNullRelations) {
      await this.bulkHandleSetNullRelation(manager, ids, setNullRelation);
    }

    // Step 3: Get all CASCADE relationships
    const cascadeRelations = this.getCascadeRelations();

    // Step 4: Apply CASCADE soft delete in batch for each relation type
    for (const cascadeRelation of cascadeRelations) {
      await this.bulkSoftDeleteCascadeRelation(manager, ids, cascadeRelation);
    }

    // Step 5: Finally, bulk soft delete the main entities
    await manager.query(
      `UPDATE ${tableName} 
       SET ${deletedAtColumn} = NOW() 
       WHERE id = ANY($1) AND ${deletedAtColumn} IS NULL`,
      [ids],
    );

    this.logger.debug(
      `Bulk soft deleted ${ids.length} ${tableName} records with cascade`,
    );
  }

  /**
   * Bulk hard delete with cascade in batch mode
   * Applies SET NULL and CASCADE relations efficiently
   */
  private async bulkHardDeleteWithCascade(
    manager: EntityManager,
    ids: string[],
  ): Promise<void> {
    const tableName = this.collection.metadata.tableName;

    // Step 1: Get all SET NULL relationships
    const setNullRelations = this.getSetNullRelations();

    // Step 2: Apply SET NULL in batch for all relations
    for (const setNullRelation of setNullRelations) {
      await this.bulkHandleSetNullRelation(manager, ids, setNullRelation);
    }

    // Step 3: Get all CASCADE relationships
    const cascadeRelations = this.getCascadeRelations();

    // Step 4: Apply CASCADE hard delete in batch for each relation type
    for (const cascadeRelation of cascadeRelations) {
      await this.bulkHardDeleteCascadeRelation(manager, ids, cascadeRelation);
    }

    // Step 5: Finally, bulk hard delete the main entities
    await manager.query(`DELETE FROM ${tableName} WHERE id = ANY($1)`, [ids]);

    this.logger.debug(
      `Bulk hard deleted ${ids.length} ${tableName} records with cascade`,
    );
  }

  /**
   * Handle SET NULL relations in batch
   * Updates all foreign keys to null for entities referencing the deleted ones
   */
  private async bulkHandleSetNullRelation(
    manager: EntityManager,
    parentIds: string[],
    setNullRelation: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = setNullRelation;
    const targetRepo = manager.getRepository(targetEntity);
    const targetMetadata = targetRepo.metadata;
    const targetTableName = targetMetadata.tableName;

    // Find the column metadata for the foreign key
    const column = targetMetadata.findColumnWithPropertyName(foreignKey);
    const columnName = column ? column.databaseName : foreignKey;

    // Bulk update all entities that reference any of the parent IDs
    const updateResult = await manager.query(
      `UPDATE ${targetTableName} 
       SET "${columnName}" = NULL 
       WHERE "${columnName}" = ANY($1)`,
      [parentIds],
    );

    if (updateResult.affectedRows > 0 || updateResult[1] > 0) {
      const affectedCount = updateResult.affectedRows || updateResult[1] || 0;
      this.logger.debug(
        `Bulk updated foreign key ${foreignKey} to null in ${affectedCount} ${targetEntity.name} records`,
      );
    }
  }

  /**
   * Bulk soft delete CASCADE relations
   * Recursively soft deletes related entities in batch
   */
  private async bulkSoftDeleteCascadeRelation(
    manager: EntityManager,
    parentIds: string[],
    cascadeRelation: any,
  ): Promise<void> {
    const { type } = cascadeRelation;

    switch (type) {
      case "OneToMany":
        await this.bulkSoftDeleteOneToManyRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
      case "OneToOne":
        await this.bulkSoftDeleteOneToOneRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
      case "ManyToMany":
        await this.bulkSoftDeleteManyToManyRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
    }
  }

  /**
   * Bulk hard delete CASCADE relations
   * Recursively hard deletes related entities in batch
   */
  private async bulkHardDeleteCascadeRelation(
    manager: EntityManager,
    parentIds: string[],
    cascadeRelation: any,
  ): Promise<void> {
    const { type } = cascadeRelation;

    switch (type) {
      case "OneToMany":
        await this.bulkHardDeleteOneToManyRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
      case "OneToOne":
        await this.bulkHardDeleteOneToOneRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
      case "ManyToMany":
        await this.bulkHardDeleteManyToManyRelation(
          manager,
          parentIds,
          cascadeRelation,
        );
        break;
    }
  }

  /**
   * Bulk soft delete OneToMany cascade relations
   */
  private async bulkSoftDeleteOneToManyRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = relationConfig;
    const targetRepo = manager.getRepository(targetEntity);
    const targetMetadata = targetRepo.metadata;
    const targetTableName = targetMetadata.tableName;

    // Find the column metadata for the foreign key
    const column = targetMetadata.findColumnWithPropertyName(foreignKey);
    const columnName = column ? column.databaseName : foreignKey;

    // Get deletedAt column for the related entity
    const deletedAtColumn = this.getDeletedAtColumnName(targetMetadata);

    if (!deletedAtColumn) {
      this.logger.warn(
        `Related entity ${targetTableName} does not have deletedAt column. Skipping soft delete cascade.`,
      );
      return;
    }

    // Find all related entity IDs
    const relatedEntitiesResult = await manager.query(
      `SELECT id FROM ${targetTableName} 
       WHERE "${columnName}" = ANY($1) AND ${deletedAtColumn} IS NULL`,
      [parentIds],
    );

    if (relatedEntitiesResult.length === 0) return;

    const relatedIds = relatedEntitiesResult.map((row: any) => row.id);

    // Get nested cascades for related entities
    const nestedCascades = this.getCascadeRelations(targetMetadata, true);

    // Recursively handle nested cascades
    for (const nestedCascade of nestedCascades) {
      await this.bulkSoftDeleteCascadeRelation(
        manager,
        relatedIds,
        nestedCascade,
      );
    }

    // Soft delete all related entities
    await manager.query(
      `UPDATE ${targetTableName} 
       SET ${deletedAtColumn} = NOW() 
       WHERE id = ANY($1) AND ${deletedAtColumn} IS NULL`,
      [relatedIds],
    );

    this.logger.debug(
      `Bulk soft deleted ${relatedIds.length} ${targetEntity.name} cascade records`,
    );
  }

  /**
   * Bulk hard delete OneToMany cascade relations
   */
  private async bulkHardDeleteOneToManyRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = relationConfig;
    const targetRepo = manager.getRepository(targetEntity);
    const targetMetadata = targetRepo.metadata;
    const targetTableName = targetMetadata.tableName;

    // Find the column metadata for the foreign key
    const column = targetMetadata.findColumnWithPropertyName(foreignKey);
    const columnName = column ? column.databaseName : foreignKey;

    // Find all related entity IDs
    const relatedEntitiesResult = await manager.query(
      `SELECT id FROM ${targetTableName} WHERE "${columnName}" = ANY($1)`,
      [parentIds],
    );

    if (relatedEntitiesResult.length === 0) return;

    const relatedIds = relatedEntitiesResult.map((row: any) => row.id);

    // Get nested cascades for related entities
    const nestedCascades = this.getCascadeRelations(targetMetadata, true);

    // Recursively handle nested cascades
    for (const nestedCascade of nestedCascades) {
      await this.bulkHardDeleteCascadeRelation(
        manager,
        relatedIds,
        nestedCascade,
      );
    }

    // Hard delete all related entities
    await manager.query(`DELETE FROM ${targetTableName} WHERE id = ANY($1)`, [
      relatedIds,
    ]);

    this.logger.debug(
      `Bulk hard deleted ${relatedIds.length} ${targetEntity.name} cascade records`,
    );
  }

  /**
   * Bulk soft delete OneToOne cascade relations
   */
  private async bulkSoftDeleteOneToOneRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, joinColumn } = relationConfig;
    const targetRepo = manager.getRepository(targetEntity);
    const targetMetadata = targetRepo.metadata;
    const targetTableName = targetMetadata.tableName;
    const parentTableName = this.collection.metadata.tableName;

    // Find the column metadata for the join column
    const column =
      this.collection.metadata.findColumnWithPropertyName(joinColumn);
    const columnName = column ? column.databaseName : joinColumn;

    // Get deletedAt column for the related entity
    const deletedAtColumn = this.getDeletedAtColumnName(targetMetadata);

    if (!deletedAtColumn) {
      this.logger.warn(
        `Related entity ${targetTableName} does not have deletedAt column. Skipping soft delete cascade.`,
      );
      return;
    }

    // Get foreign key values from parent entities
    const foreignKeyValuesResult = await manager.query(
      `SELECT "${columnName}" as fk_value 
       FROM ${parentTableName} 
       WHERE id = ANY($1) AND "${columnName}" IS NOT NULL`,
      [parentIds],
    );

    if (foreignKeyValuesResult.length === 0) return;

    const relatedIds = foreignKeyValuesResult
      .map((row: any) => row.fk_value)
      .filter((id: any) => id !== null);

    if (relatedIds.length === 0) return;

    // Get nested cascades for related entities
    const nestedCascades = this.getCascadeRelations(targetMetadata, true);

    // Recursively handle nested cascades
    for (const nestedCascade of nestedCascades) {
      await this.bulkSoftDeleteCascadeRelation(
        manager,
        relatedIds,
        nestedCascade,
      );
    }

    // Soft delete related entities
    await manager.query(
      `UPDATE ${targetTableName} 
       SET ${deletedAtColumn} = NOW() 
       WHERE id = ANY($1) AND ${deletedAtColumn} IS NULL`,
      [relatedIds],
    );

    this.logger.debug(
      `Bulk soft deleted ${relatedIds.length} ${targetEntity.name} cascade records`,
    );
  }

  /**
   * Bulk hard delete OneToOne cascade relations
   */
  private async bulkHardDeleteOneToOneRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, joinColumn } = relationConfig;
    const targetRepo = manager.getRepository(targetEntity);
    const targetMetadata = targetRepo.metadata;
    const targetTableName = targetMetadata.tableName;
    const parentTableName = this.collection.metadata.tableName;

    // Find the column metadata for the join column
    const column =
      this.collection.metadata.findColumnWithPropertyName(joinColumn);
    const columnName = column ? column.databaseName : joinColumn;

    // Get foreign key values from parent entities
    const foreignKeyValuesResult = await manager.query(
      `SELECT "${columnName}" as fk_value 
       FROM ${parentTableName} 
       WHERE id = ANY($1) AND "${columnName}" IS NOT NULL`,
      [parentIds],
    );

    if (foreignKeyValuesResult.length === 0) return;

    const relatedIds = foreignKeyValuesResult
      .map((row: any) => row.fk_value)
      .filter((id: any) => id !== null);

    if (relatedIds.length === 0) return;

    // Get nested cascades for related entities
    const nestedCascades = this.getCascadeRelations(targetMetadata, true);

    // Recursively handle nested cascades
    for (const nestedCascade of nestedCascades) {
      await this.bulkHardDeleteCascadeRelation(
        manager,
        relatedIds,
        nestedCascade,
      );
    }

    // Hard delete related entities
    await manager.query(`DELETE FROM ${targetTableName} WHERE id = ANY($1)`, [
      relatedIds,
    ]);

    this.logger.debug(
      `Bulk hard deleted ${relatedIds.length} ${targetEntity.name} cascade records`,
    );
  }

  /**
   * Bulk soft delete ManyToMany cascade relations
   */
  private async bulkSoftDeleteManyToManyRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    const { junctionTable, ownerColumn } = relationConfig;

    if (!junctionTable) return;

    // Find the column metadata for the owner column
    const junctionMetadata = this.dataSource.entityMetadatas.find(
      (meta) => meta.tableName === junctionTable,
    );

    let ownerColumnName = ownerColumn;
    if (junctionMetadata) {
      const column = junctionMetadata.findColumnWithPropertyName(ownerColumn);
      ownerColumnName = column ? column.databaseName : ownerColumn;
    }

    // Remove junction table entries in batch
    await manager.query(
      `DELETE FROM ${junctionTable} WHERE "${ownerColumnName}" = ANY($1)`,
      [parentIds],
    );

    this.logger.debug(
      `Bulk deleted junction table entries from ${junctionTable} for ${parentIds.length} records`,
    );
  }

  /**
   * Bulk hard delete ManyToMany cascade relations
   */
  private async bulkHardDeleteManyToManyRelation(
    manager: EntityManager,
    parentIds: string[],
    relationConfig: any,
  ): Promise<void> {
    // ManyToMany hard delete is the same as soft delete for junction tables
    await this.bulkSoftDeleteManyToManyRelation(
      manager,
      parentIds,
      relationConfig,
    );
  }

  // =============================================================================
  // Helper methods
  // =============================================================================
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    queryBuilder?: SelectQueryBuilder<Entity>,
    rawQuery?: string,
    parameters?: any[],
  ): Promise<T> {
    const metrics: IQueryPerformanceMetrics = {
      startTime: Date.now(),
      operation: operationName || operation.name || "unknown",
      affectedRows: 0,
    };

    try {
      const result = await operation();

      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      // Enhanced slow query logging with detailed analysis
      setImmediate(() => {
        this.logSlowQueryDetails(
          metrics,
          queryBuilder,
          rawQuery,
          parameters,
        ).catch((error) => {
          this.logger.warn(`Error in logSlowQueryDetails: ${error.message}`);
        });
      });

      // Only log debug info in development for performance
      // if (this.envService.get('INFRA_ENVIRONMENT') === 'development') {
      //   this.logger.debug(
      //     `Database operation completed: ${JSON.stringify(metrics)}`,
      //   );
      // }

      return result;
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      // Enhanced PostgreSQL error handling
      const pgError = this.handlePostgreSQLError(error);

      this.logger.error(
        `Database operation failed: ${JSON.stringify({
          ...metrics,
          error: pgError.message,
          errorCode: pgError.code,
          errorDetail: pgError.detail,
          constraint: pgError.constraint,
          table: pgError.table,
          column: pgError.column,
        })}`,
      );

      throw error;
    }
  }

  /**
   * Get all relations that have onDelete: 'CASCADE' configured
   * @param entityMetadata Optional entity metadata. If not provided, uses this.collection.metadata
   * @param isNested Whether this is for nested cascade relations (affects logging)
   */
  private getCascadeRelations(entityMetadata?: any, isNested = false): any[] {
    const metadata = entityMetadata || this.collection.metadata;
    const currentEntityTarget = metadata.target;
    const cascadeRelations: any[] = [];
    const logPrefix = isNested ? "nested " : "";

    this.logger.debug(
      `[CASCADE DEBUG] Checking ${logPrefix}cascade relations for entity: ${metadata.name}`,
    );

    // Scan all entity metadatas to find child entities that declare onDelete: CASCADE
    // pointing to the current entity — same pattern as getSetNullRelations().
    // This keeps the cascade declaration on the FK owner (child's @ManyToOne / @OneToOne)
    // and avoids putting onDelete on @OneToMany in the parent entity.
    this.dataSource.entityMetadatas.forEach((childMetadata) => {
      // ManyToOne in child → OneToMany in parent (most common cascade case)
      childMetadata.manyToOneRelations.forEach((relation) => {
        if (
          relation.onDelete === "CASCADE" &&
          relation.inverseEntityMetadata.target === currentEntityTarget
        ) {
          const foreignKeyColumn = relation.joinColumns?.[0]?.propertyName;

          if (!foreignKeyColumn) {
            this.logger.warn(
              `[CASCADE DEBUG] Could not determine foreign key column for ${logPrefix}ManyToOne CASCADE relation in ${childMetadata.name}. Skipping.`,
            );
            return;
          }

          const childName =
            typeof childMetadata.target === "function"
              ? childMetadata.target.name
              : String(childMetadata.target);

          this.logger.debug(
            `[CASCADE DEBUG] CASCADE relation found: ${childName}.${foreignKeyColumn} -> ${metadata.name}`,
          );

          cascadeRelations.push({
            type: "OneToMany",
            relation,
            targetEntity: childMetadata.target,
            joinColumn: foreignKeyColumn,
            foreignKey: foreignKeyColumn,
          });
        }
      });

      // OneToOne in child (FK owner side) → cascade when parent is deleted
      childMetadata.oneToOneRelations.forEach((relation) => {
        if (
          relation.onDelete === "CASCADE" &&
          relation.isOwning &&
          relation.inverseEntityMetadata.target === currentEntityTarget
        ) {
          const foreignKeyColumn = relation.joinColumns?.[0]?.propertyName;

          if (!foreignKeyColumn) {
            this.logger.warn(
              `[CASCADE DEBUG] Could not determine foreign key column for ${logPrefix}OneToOne CASCADE relation in ${childMetadata.name}. Skipping.`,
            );
            return;
          }

          const childName =
            typeof childMetadata.target === "function"
              ? childMetadata.target.name
              : String(childMetadata.target);

          this.logger.debug(
            `[CASCADE DEBUG] CASCADE relation found (OneToOne): ${childName}.${foreignKeyColumn} -> ${metadata.name}`,
          );

          cascadeRelations.push({
            type: "OneToMany", // reuse OneToMany handler — same find-by-FK pattern
            relation,
            targetEntity: childMetadata.target,
            joinColumn: foreignKeyColumn,
            foreignKey: foreignKeyColumn,
          });
        }
      });
    });

    // ManyToMany: keep looking at the current entity's own relations since it owns the junction table
    metadata.manyToManyRelations.forEach((relation) => {
      if (relation.onDelete === "CASCADE" && relation.isOwning) {
        const ownerColumn =
          relation.joinColumns?.[0]?.referencedColumn?.propertyName;
        const inverseColumn =
          relation.inverseJoinColumns?.[0]?.referencedColumn?.propertyName;

        if (!ownerColumn || !inverseColumn) {
          this.logger.warn(
            `[CASCADE DEBUG] Could not determine owner or inverse column for ${logPrefix}ManyToMany relation: ${relation.propertyName}. Skipping cascade relation.`,
          );
          return;
        }

        cascadeRelations.push({
          type: "ManyToMany",
          relation,
          targetEntity: relation.inverseEntityMetadata.target,
          junctionTable: relation.junctionEntityMetadata?.tableName,
          ownerColumn,
          inverseColumn,
        });
      }
    });

    return cascadeRelations;
  }

  /**
   * Get all relations that have onDelete: 'SET NULL' configured
   * This finds entities that reference THIS entity and should be set to null when this entity is deleted
   */
  private getSetNullRelations() {
    const currentEntityTarget = this.collection.metadata.target;
    const setNullRelations: any[] = [];

    // Iterate over all entity metadatas to find relations that reference this entity with SET NULL
    this.dataSource.entityMetadatas.forEach((entityMetadata) => {
      // Check OneToOne relations in this entity that reference the current entity
      entityMetadata.oneToOneRelations.forEach((relation) => {
        if (
          relation.onDelete === "SET NULL" &&
          relation.inverseEntityMetadata.target === currentEntityTarget
        ) {
          // This relation in the other entity references our entity with SET NULL
          const foreignKeyColumn = relation.joinColumns?.[0]?.propertyName;
          // Get the property name instead of column name
          const foreignKeyProperty = relation.propertyName;
          if (foreignKeyColumn && foreignKeyProperty) {
            setNullRelations.push({
              type: "OneToOneSetNull",
              relation,
              targetEntity: entityMetadata.target,
              foreignKey: foreignKeyProperty,
            });
          }
        }
      });

      // Check OneToMany relations (though SET NULL on OneToMany is unusual, but possible)
      entityMetadata.oneToManyRelations.forEach((relation) => {
        if (
          relation.onDelete === "SET NULL" &&
          relation.inverseEntityMetadata.target === currentEntityTarget
        ) {
          // For OneToMany SET NULL, the foreignKey is the property name on the inverse side
          const inverseRelation = relation.inverseRelation;
          const foreignKeyProperty = inverseRelation?.propertyName;
          if (foreignKeyProperty) {
            setNullRelations.push({
              type: "OneToManySetNull",
              relation,
              targetEntity: entityMetadata.target,
              foreignKey: foreignKeyProperty,
            });
          }
        }
      });
    });

    return setNullRelations;
  }

  /**
   * Handle SET NULL relations by updating foreign key columns to null
   * This finds entities that reference the entity being deleted and sets their foreign keys to null
   */
  private async handleSetNullRelation(
    manager: EntityManager,
    parentEntity: Entity,
    setNullRelation: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = setNullRelation;
    const parentId = (parentEntity as any).id;

    // Update all entities that reference this entity by setting their foreign key to null
    const updateResult = await manager.update(
      targetEntity,
      { [foreignKey]: parentId },
      { [foreignKey]: null },
    );

    if (updateResult.affected && updateResult.affected > 0) {
      this.logger.debug(
        `Updated foreign key ${foreignKey} to null in ${updateResult.affected} ${targetEntity.name} records for deleted entity ${this.collection.metadata.tableName} with id ${parentId}`,
      );
    }
  }

  /**
   * Recursively soft delete cascade relations
   */
  private async softDeleteCascadeRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { type } = relationConfig;

    switch (type) {
      case "OneToMany":
        await this.softDeleteOneToManyRelation(
          manager,
          parentEntity,
          relationConfig,
        );
        break;
      case "OneToOne":
        await this.softDeleteOneToOneRelation(
          manager,
          parentEntity,
          relationConfig,
        );
        break;
      case "ManyToMany":
        await this.softDeleteManyToManyRelation(
          manager,
          parentEntity,
          relationConfig,
        );
        break;
    }
  }

  /**
   * Soft delete OneToMany cascade relations
   */
  private async softDeleteOneToManyRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = relationConfig;
    const parentId = (parentEntity as any).id;

    // Find all related entities
    const relatedEntities = await manager.find(targetEntity, {
      where: { [foreignKey]: parentId } as any,
    });

    // Recursively soft delete each related entity (in case they have their own cascades)
    for (const relatedEntity of relatedEntities) {
      const relatedRepo = manager.getRepository(targetEntity);
      const relatedMetadata = relatedRepo.metadata;

      // Check if the related entity has its own cascade relations
      const nestedCascades = this.getCascadeRelations(relatedMetadata, true);

      for (const nestedCascade of nestedCascades) {
        await this.softDeleteCascadeRelation(
          manager,
          relatedEntity as Entity,
          nestedCascade,
        );
      }

      // Soft delete the related entity
      await manager.softDelete(targetEntity, { id: (relatedEntity as any).id });
    }
  }

  /**
   * Soft delete OneToOne cascade relations
   */
  private async softDeleteOneToOneRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, joinColumn } = relationConfig;
    const foreignKeyValue = (parentEntity as any)[joinColumn];

    if (!foreignKeyValue) return;

    const relatedEntity = await manager.findOne(targetEntity, {
      where: { id: foreignKeyValue } as any,
    });

    if (relatedEntity) {
      const relatedRepo = manager.getRepository(targetEntity);
      const relatedMetadata = relatedRepo.metadata;

      // Check if the related entity has its own cascade relations
      const nestedCascades = this.getCascadeRelations(relatedMetadata, true);

      for (const nestedCascade of nestedCascades) {
        await this.softDeleteCascadeRelation(
          manager,
          relatedEntity as Entity,
          nestedCascade,
        );
      }

      // Soft delete the related entity
      await manager.softDelete(targetEntity, { id: (relatedEntity as any).id });
    }
  }

  /**
   * Handle ManyToMany cascade relations (removes junction table entries)
   */
  private async softDeleteManyToManyRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { junctionTable, ownerColumn } = relationConfig;
    const parentId = (parentEntity as any).id;

    if (!junctionTable) return;

    // For ManyToMany, we typically just remove the junction table entries
    // The related entities themselves are usually not deleted in cascade
    // But if you need to soft delete them as well, you can implement that logic here

    // Remove junction table entries
    await manager.query(
      `DELETE FROM ${junctionTable} WHERE "${ownerColumn}" = $1`,
      [parentId],
    );

    // If you need to also soft delete the related entities:
    // const relatedIds = await manager.query(
    //   `SELECT "${relationConfig.inverseColumn}" FROM ${junctionTable} WHERE "${ownerColumn}" = $1`,
    //   [parentId]
    // );
    //
    // for (const { [relationConfig.inverseColumn]: relatedId } of relatedIds) {
    //   await manager.softDelete(targetEntity, { id: relatedId });
    // }
  }

  // =============================================================================
  // Restore cascade relations
  // =============================================================================

  /**
   * Recursively restore soft-deleted cascade relations
   */
  private async restoreCascadeRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { type } = relationConfig;

    switch (type) {
      case "OneToMany":
        await this.restoreOneToManyRelation(
          manager,
          parentEntity,
          relationConfig,
        );
        break;
      case "OneToOne":
        await this.restoreOneToOneRelation(
          manager,
          parentEntity,
          relationConfig,
        );
        break;
      case "ManyToMany":
        this.restoreManyToManyRelation(manager, parentEntity, relationConfig);
        break;
    }
  }

  /**
   * Restore soft-deleted OneToMany cascade relations
   */
  private async restoreOneToManyRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, foreignKey } = relationConfig;
    const parentId = (parentEntity as any).id;

    // Find all related entities including soft-deleted ones
    const relatedEntities = await manager.find(targetEntity, {
      where: { [foreignKey]: parentId } as any,
      withDeleted: true,
    });

    // Only restore entities that are currently soft-deleted
    const softDeletedEntities = relatedEntities.filter(
      (entity: any) =>
        entity.deletedAt !== null && entity.deletedAt !== undefined,
    );

    for (const relatedEntity of softDeletedEntities) {
      const relatedRepo = manager.getRepository(targetEntity);
      const relatedMetadata = relatedRepo.metadata;

      // Check if the related entity has its own cascade relations
      const nestedCascades = this.getCascadeRelations(relatedMetadata, true);

      for (const nestedCascade of nestedCascades) {
        await this.restoreCascadeRelation(
          manager,
          relatedEntity as Entity,
          nestedCascade,
        );
      }

      // Restore the related entity
      await manager.restore(targetEntity, { id: (relatedEntity as any).id });
    }
  }

  /**
   * Restore soft-deleted OneToOne cascade relations
   */
  private async restoreOneToOneRelation(
    manager: EntityManager,
    parentEntity: Entity,
    relationConfig: any,
  ): Promise<void> {
    const { targetEntity, joinColumn } = relationConfig;
    const foreignKeyValue = (parentEntity as any)[joinColumn];

    if (!foreignKeyValue) return;

    const relatedEntity = await manager.findOne(targetEntity, {
      where: { id: foreignKeyValue } as any,
      withDeleted: true,
    });

    // Only restore if the entity is currently soft-deleted
    if (!relatedEntity || !(relatedEntity as any).deletedAt) {
      return;
    }

    const relatedRepo = manager.getRepository(targetEntity);
    const relatedMetadata = relatedRepo.metadata;

    // Check if the related entity has its own cascade relations
    const nestedCascades = this.getCascadeRelations(relatedMetadata, true);

    for (const nestedCascade of nestedCascades) {
      await this.restoreCascadeRelation(
        manager,
        relatedEntity as Entity,
        nestedCascade,
      );
    }

    // Restore the related entity
    await manager.restore(targetEntity, {
      id: (relatedEntity as any).id,
    });
  }

  /**
   * ManyToMany restore — junction table entries were hard-deleted during soft delete cascade,
   * so they cannot be recovered. Logs a warning and skips.
   */
  private restoreManyToManyRelation(
    _manager: EntityManager,
    _parentEntity: Entity,
    relationConfig: any,
  ): void {
    const { junctionTable } = relationConfig;
    if (!junctionTable) return;

    this.logger.warn(
      `Cannot restore ManyToMany junction table entries for "${junctionTable}". ` +
        `Junction table entries were permanently deleted during the soft delete cascade.`,
    );
  }

  /**
   * Gets the actual database column name for updatedAt field
   * Checks if the column exists and returns the correct name (camelCase or snake_case)
   * @param metadata Optional entity metadata. If not provided, uses this.collection.metadata
   */
  private getUpdatedAtColumnName(metadata?: any): string | null {
    const entityMetadata = metadata || this.collection.metadata;

    // Try to find updatedAt column (camelCase)
    const camelCaseColumn = entityMetadata.columns.find(
      (col: any) =>
        col.propertyName === "updatedAt" || col.databaseName === "updatedAt",
    );

    if (camelCaseColumn) {
      return `"${camelCaseColumn.databaseName}"`;
    }

    // Try to find updated_at column (snake_case)
    const snakeCaseColumn = entityMetadata.columns.find(
      (col: any) =>
        col.propertyName === "updatedAt" || col.databaseName === "updated_at",
    );

    if (snakeCaseColumn) {
      return `"${snakeCaseColumn.databaseName}"`;
    }

    return null;
  }

  /**
   * Gets the actual database column name for deletedAt field
   * Checks if the column exists and returns the correct name (camelCase or snake_case)
   * @param metadata Optional entity metadata. If not provided, uses this.collection.metadata
   */
  private getDeletedAtColumnName(metadata?: any): string | null {
    const entityMetadata = metadata || this.collection.metadata;

    // Try to find deletedAt column (camelCase)
    const camelCaseColumn = entityMetadata.columns.find(
      (col: any) =>
        col.propertyName === "deletedAt" || col.databaseName === "deletedAt",
    );

    if (camelCaseColumn) {
      return `"${camelCaseColumn.databaseName}"`;
    }

    // Try to find deleted_at column (snake_case)
    const snakeCaseColumn = entityMetadata.columns.find(
      (col: any) =>
        col.propertyName === "deletedAt" || col.databaseName === "deleted_at",
    );

    if (snakeCaseColumn) {
      return `"${snakeCaseColumn.databaseName}"`;
    }

    return null;
  }

  /**
   * Gets the UPDATE clause for setting updatedAt to current timestamp
   * Returns empty string if column doesn't exist
   */
  private getUpdatedAtClause(): string {
    const columnName = this.getUpdatedAtColumnName();
    return columnName ? `, ${columnName} = NOW()` : "";
  }

  /**
   * Builds a WHERE clause from FindOptionsWhere object
   * Supports basic equality conditions and arrays of conditions (OR)
   */
  private buildWhereClause(
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  ): string {
    if (Array.isArray(where)) {
      // Handle array of conditions (OR)
      const conditions = where.map(
        (condition, index) =>
          this.buildSingleWhereClause(condition, index * 100), // Offset for parameter numbering
      );
      return `(${conditions.join(" OR ")})`;
    }
    return this.buildSingleWhereClause(where, 0);
  }

  /**
   * Builds WHERE clause for a single condition object
   */
  private buildSingleWhereClause(
    where: FindOptionsWhere<Entity>,
    paramOffset: number,
  ): string {
    const conditions: string[] = [];
    let paramIndex = paramOffset;

    for (const [key, value] of Object.entries(where)) {
      const column = this.collection.metadata.findColumnWithPropertyName(key);
      const columnName = column ? column.databaseName : key;
      const quotedColumnName = `"${columnName}"`;

      if (value === null) {
        conditions.push(`${quotedColumnName} IS NULL`);
      } else if (Array.isArray(value)) {
        // Handle IN clause
        const placeholders = value.map(() => `$${++paramIndex}`).join(", ");
        conditions.push(`${quotedColumnName} IN (${placeholders})`);
      } else if (typeof value === "object" && value !== null) {
        // Handle operators like Not, LessThan, etc.
        const operatorConditions = this.buildOperatorConditions(
          quotedColumnName,
          value,
          paramIndex,
        );
        conditions.push(...operatorConditions.conditions);
        paramIndex = operatorConditions.newParamIndex;
      } else {
        // Simple equality
        conditions.push(`${quotedColumnName} = $${++paramIndex}`);
      }
    }

    return conditions.join(" AND ");
  }

  /**
   * Builds conditions for TypeORM operators
   * Note: columnName parameter should already include proper quoting
   */
  private buildOperatorConditions(
    columnName: string,
    value: any,
    paramIndex: number,
  ): { conditions: string[]; newParamIndex: number } {
    const conditions: string[] = [];
    let currentParamIndex = paramIndex;

    if ("$ne" in value || "Not" in value) {
      conditions.push(`${columnName} != $${++currentParamIndex}`);
    }

    if ("$lt" in value || "LessThan" in value) {
      conditions.push(`${columnName} < $${++currentParamIndex}`);
    }

    if ("$lte" in value || "LessThanOrEqual" in value) {
      conditions.push(`${columnName} <= $${++currentParamIndex}`);
    }

    if ("$gt" in value || "MoreThan" in value) {
      conditions.push(`${columnName} > $${++currentParamIndex}`);
    }

    if ("$gte" in value || "MoreThanOrEqual" in value) {
      conditions.push(`${columnName} >= $${++currentParamIndex}`);
    }

    if ("$in" in value || "In" in value) {
      const _val = value.$in || value.In;
      const placeholders = _val.map(() => `$${++currentParamIndex}`).join(", ");
      conditions.push(`${columnName} IN (${placeholders})`);
    }

    if ("$nin" in value || "NotIn" in value) {
      const _val = value.$nin || value.NotIn;
      const placeholders = _val.map(() => `$${++currentParamIndex}`).join(", ");
      conditions.push(`${columnName} NOT IN (${placeholders})`);
    }

    if ("$like" in value || "Like" in value) {
      conditions.push(`${columnName} LIKE $${++currentParamIndex}`);
    }

    if ("$ilike" in value || "ILike" in value) {
      conditions.push(`${columnName} ILIKE $${++currentParamIndex}`);
    }

    return { conditions, newParamIndex: currentParamIndex };
  }

  /**
   * Extracts parameters from FindOptionsWhere object
   */
  private extractWhereParameters(
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  ): any[] {
    const params: any[] = [];

    if (Array.isArray(where)) {
      where.forEach((condition) => {
        params.push(...this.extractSingleWhereParameters(condition));
      });
    } else {
      params.push(...this.extractSingleWhereParameters(where));
    }

    return params;
  }

  /**
   * Extracts parameters from a single condition object
   */
  private extractSingleWhereParameters(where: FindOptionsWhere<Entity>): any[] {
    const params: any[] = [];

    Object.values(where).forEach((value) => {
      if (value === null) {
        // IS NULL doesn't need parameters
      } else if (Array.isArray(value)) {
        // Handle IN clause
        params.push(...value);
      } else if (typeof value === "object" && value !== null) {
        // Handle operators
        params.push(...this.extractOperatorParameters(value));
      } else {
        // Simple equality
        params.push(value);
      }
    });

    return params;
  }

  /**
   * Extracts parameters from operator objects
   */
  private extractOperatorParameters(value: any): any[] {
    const params: any[] = [];

    // Check all possible operators
    const operators = [
      "$ne",
      "Not",
      "$lt",
      "LessThan",
      "$lte",
      "LessThanOrEqual",
      "$gt",
      "MoreThan",
      "$gte",
      "MoreThanOrEqual",
      "$in",
      "In",
      "$nin",
      "NotIn",
      "$like",
      "Like",
      "$ilike",
      "ILike",
    ];

    operators.forEach((op) => {
      if (op in value) {
        const val = value[op];
        if (Array.isArray(val)) {
          params.push(...val);
        } else {
          params.push(val);
        }
      }
    });

    return params;
  }

  /**
   * Enhanced PostgreSQL error handler for better debugging and user feedback
   */
  private handlePostgreSQLError(error: any): IPostgreSQLError {
    const pgError: IPostgreSQLError = {
      message: error.message || "Unknown database error",
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
    };

    // PostgreSQL specific error code handling
    switch (error.code) {
      case "23505": // unique_violation
        pgError.message = `Duplicate entry: ${error.detail || "Record already exists"}`;
        break;
      case "23503": // foreign_key_violation
        pgError.message = `Foreign key constraint violation: ${error.detail || "Referenced record does not exist"}`;
        break;
      case "23502": // not_null_violation
        pgError.message = `Required field missing: ${error.column || "A required field"} cannot be null`;
        break;
      case "42703": // undefined_column
        pgError.message = `Invalid column: ${error.message}`;
        break;
      case "42P01": // undefined_table
        pgError.message = `Table not found: ${error.message}`;
        break;
      case "53300": // too_many_connections
        pgError.message =
          "Database connection pool exhausted. Please try again.";
        break;
      case "57014": // query_canceled
        pgError.message =
          "Query was canceled due to timeout. Consider optimizing your query.";
        break;
    }

    return pgError;
  }

  /**
   * Enhanced slow query analyzer with detailed performance insights
   * Provides actionable recommendations for query optimization
   */
  /* eslint-disable-next-line @typescript-eslint/require-await */
  private async logSlowQueryDetails(
    metrics: IQueryPerformanceMetrics,
    queryBuilder?: SelectQueryBuilder<Entity>,
    rawQuery?: string,
    parameters?: any[],
  ): Promise<void> {
    if (!metrics.duration || metrics.duration < 500) return;

    const tableName = this.collection.metadata.tableName;
    const logData: any = {
      operation: metrics.operation,
      duration: `${metrics.duration}ms`,
      tableName,
      timestamp: new Date().toISOString(),
      affectedRows: metrics.affectedRows || "unknown",
    };

    // Add sanitized query information if available
    if (queryBuilder) {
      const [query, params] = queryBuilder.getQueryAndParameters();
      logData.queryType = "QueryBuilder";
      logData.queryLength = query.length;
      logData.parameterCount = params.length;

      // Sanitize parameters for logging (remove sensitive data)
      logData.sanitizedParameters = this.sanitizeParameters(params);
    } else if (rawQuery) {
      logData.queryType = "RawSQL";
      logData.queryLength = rawQuery.length;
      logData.parameterCount = parameters?.length || 0;
      logData.sanitizedParameters = this.sanitizeParameters(parameters || []);
    }

    // Performance recommendations based on duration
    if (metrics.duration > 5000) {
      logData.severity = "CRITICAL";
      logData.recommendations = [
        "Immediate attention required - query exceeds 5 seconds",
        "Check for missing indexes on WHERE/JOIN columns",
        "Consider query rewrite or data partitioning",
        "Analyze query execution plan with EXPLAIN ANALYZE",
        "Consider caching strategy for frequently accessed data",
      ];

      this.logger.error(
        `CRITICAL Database Performance Issue: ${JSON.stringify(logData)}`,
      );

      //
    } else if (metrics.duration > 2000) {
      logData.severity = "HIGH";
      logData.recommendations = [
        "Query performance degraded - exceeds 2 seconds",
        "Review indexes and query optimization",
        "Check for table scans in execution plan",
        "Consider result pagination for large datasets",
      ];

      this.logger.warn(
        `HIGH Priority Database Performance: ${JSON.stringify(logData)}`,
      );

      //
    } else if (metrics.duration > 1000) {
      logData.severity = "MEDIUM";
      logData.recommendations = [
        "Query slower than optimal - exceeds 1 second",
        "Review query structure and indexes",
        "Monitor if this becomes a pattern",
      ];

      this.logger.warn(
        `Database Performance Notice: ${JSON.stringify(logData)}`,
      );

      //
    } else if (metrics.duration > 500) {
      logData.severity = "LOW";
      logData.recommendations = [
        "Query performance monitoring - above 500ms threshold",
        "Consider optimization if this query runs frequently",
      ];

      // Only log in development for low severity
      if (this.developmentEnv) {
        this.logger.debug(
          `Database Performance Debug: ${JSON.stringify(logData)}`,
        );
      }
    }
  }

  /**
   * Sanitizes query parameters for safe logging (removes sensitive data)
   */
  private sanitizeParameters(parameters: any[]): any[] {
    return parameters.map((param, index) => {
      if (typeof param === "string") {
        // Hide potential sensitive data like emails, passwords, tokens
        if (
          param.includes("@") ||
          param.length > 50 ||
          /password|token|secret|key/i.test(param)
        ) {
          return `[SANITIZED_STRING_${index}]`;
        }
        // Truncate long strings
        return param.length > 100 ? `${param.substring(0, 100)}...` : param;
      }

      if (Array.isArray(param)) {
        return `[ARRAY_${param.length}_ITEMS]`;
      }

      if (typeof param === "object" && param !== null) {
        return `[OBJECT_${Object.keys(param).length}_KEYS]`;
      }

      return param;
    });
  }
}
