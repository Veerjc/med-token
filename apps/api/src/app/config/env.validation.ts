import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().default('postgres'),
  POSTGRES_DB: Joi.string().default('medical_db'),
  DATABASE_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: Joi.string()
    .min(16)
    .default('development_jwt_access_secret_key_minimum_32_characters_long'),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .default('development_jwt_refresh_secret_key_minimum_32_characters_long'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET_NAME: Joi.string().default('medical-proj-documents-dev'),
});

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = envSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });
  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }
  return value;
}
