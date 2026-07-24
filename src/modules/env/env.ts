import { z } from 'zod';

export const envSchema = z.object({
  /// //////////////////////////
  //  Infrastructure
  /// //////////////////////////
  INFRA_URL: z.string().url().default('http://localhost'),
  INFRA_PORT: z.coerce.number().default(3000),
  INFRA_ENVIRONMENT: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  INFRA_FRONTEND_URL: z.string().url(),

  /// //////////////////////////
  //  Database
  /// //////////////////////////
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string().default('postgres'),
  DATABASE_DB_NAME: z.string().default('postgres'),
  DATABASE_IGNORE_MIGRATIONS: z.coerce.boolean().default(false),

  /// //////////////////////////
  //  Redis
  /// //////////////////////////
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  /// //////////////////////////
  //  Auth
  /// //////////////////////////
  AUTH_JWT_PRIVATE_KEY: z.string(),
  AUTH_JWT_PUBLIC_KEY: z.string(),
  AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN: z.string(),
  AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN: z.string(),

  /// //////////////////////////
  //  Secrets
  /// //////////////////////////
  SECRET_BACKOFFICE_ACCESS_TOKEN: z.string(),
  SECRET_BULL_BOARD_USERNAME: z.string(),
  SECRET_BULL_BOARD_PASSWORD: z.string(),

  /// //////////////////////////
  //  Utilities
  /// //////////////////////////
  UTILITIES_PAGINATION_LIMIT: z.coerce.number().default(100),
  QUEUE_REQUEST_LOGS_BATCH_SIZE: z.coerce.number().default(50),
  QUEUE_AUDIT_LOGS_BATCH_SIZE: z.coerce.number().default(100),

  /// //////////////////////////
  //  External APIS
  /// //////////////////////////
  // Encrypt Decrypt
  EXTERNAL_ENCRYPT_DECRYPT_ALGORITHM: z.string().default('aes-256-cbc'),
  EXTERNAL_ENCRYPT_DECRYPT_KEY: z.string().default('encryption_key'),
  EXTERNAL_ENCRYPT_DECRYPT_IV: z.string().default('encryption_iv'),

  /// //////////////////////////
  //  AWS
  /// //////////////////////////
  EXTERNAL_AWS_ACCESS_KEY_ID: z.string(),
  EXTERNAL_AWS_SECRET_ACCESS_KEY: z.string(),

  /// //////////////////////////
  //  AWS S3
  /// //////////////////////////
  EXTERNAL_AWS_S3_REGION: z.string().default('us-east-1'),
  EXTERNAL_AWS_S3_BUCKET: z.string(),
  EXTERNAL_AWS_S3_BUCKET_PUBLIC: z.string(),

  /// //////////////////////////
  //  AWS SES
  /// //////////////////////////
  EXTERNAL_AWS_SES_REGION: z.string(),
  EXTERNAL_AWS_SES_ACCESS_KEY_ID: z.string(),
  EXTERNAL_AWS_SES_SECRET_ACCESS_KEY: z.string(),
  EXTERNAL_AWS_SES_FROM_EMAIL: z.string(),
  EXTERNAL_AWS_SES_FROM_NAME: z.string(),

  /// //////////////////////////
  //  Discord
  /// //////////////////////////
  EXTERNAL_DISCORD_WEBHOOK_URL: z.string().url().optional(),

  /// //////////////////////////
  //  Observability
  /// //////////////////////////
  SENTRY_DSN: z.string().optional(),

  /// //////////////////////////
  //  Upload provider
  /// //////////////////////////
  UPLOAD_PROVIDER: z.enum(['s3', 'gcs']).optional(),

  /// //////////////////////////
  //  GCS
  /// //////////////////////////
  EXTERNAL_GCS_PROJECT_ID: z.string().optional(),
  EXTERNAL_GCS_BUCKET: z.string().optional(),
  EXTERNAL_GCS_KEY_FILE: z.string().optional(),
});

/* eslint-disable-next-line @typescript-eslint/naming-convention */
export type IEnvSchema = z.infer<typeof envSchema>;
