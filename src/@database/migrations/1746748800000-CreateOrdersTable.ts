import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateOrdersTable1746748800000 implements MigrationInterface {
  name = "CreateOrdersTable1746748800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "orders",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "code",
            type: "varchar",
            length: "32",
            isNullable: false,
          },
          {
            name: "customer_name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "32",
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "now()",
          },
          {
            name: "deleted_at",
            type: "timestamp with time zone",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "orders",
      new TableIndex({
        name: "UQ_orders_code",
        columnNames: ["code"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "orders",
      new TableIndex({
        name: "IDX_orders_status",
        columnNames: ["status"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("orders", "IDX_orders_status");
    await queryRunner.dropIndex("orders", "UQ_orders_code");
    await queryRunner.dropTable("orders");
  }
}
