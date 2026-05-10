import { z } from "zod";

export const envSchema = z.object({
  // Infra
  INFRA_PORT: z.coerce.number().default(3000),
  INFRA_ENVIRONMENT: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  // Database (PostgreSQL)
  DATABASE_HOST: z.string().default("localhost"),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USERNAME: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),

  // Auth JWT
  AUTH_JWT_PRIVATE_KEY: z.string(),
  AUTH_JWT_PUBLIC_KEY: z.string(),
  AUTH_JWT_EXPIRES_IN: z.string().default("1d"),

  // Bull Board
  BULL_BOARD_USERNAME: z.string().default("admin"),
  BULL_BOARD_PASSWORD: z.string(),

  // Pagination
  UTILITIES_PAGINATION_LIMIT: z.coerce.number().default(20),

  // AWS — SES (mail) and S3 (upload)
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_FROM_EMAIL: z.string().email().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Encryption (AES-256-GCM compatible — see encrypt-decrypt-provider docs)
  ENCRYPT_ALGORITHM: z.string().default("aes-256-cbc"),
  ENCRYPT_KEY: z.string().min(32),
  ENCRYPT_IV: z.string().min(16),
});

export type IEnvSchema = z.infer<typeof envSchema>;
