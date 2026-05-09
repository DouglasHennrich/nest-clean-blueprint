import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * TypeORM DataSource for CLI migration commands.
 *
 * Usage:
 *   pnpm migration:create src/database/migrations/CreateOrdersTable
 *   pnpm migration:run
 *   pnpm migration:revert
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME ?? "postgres",
  password: process.env.DATABASE_PASSWORD ?? "postgres",
  database: process.env.DATABASE_NAME ?? "nest_blueprint",
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
