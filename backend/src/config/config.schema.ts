import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  DB_POOL_MAX: Joi.number().integer().min(1).max(100).default(20),
  DB_IDLE_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  DB_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  DB_QUERY_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  SESSION_SECRET: Joi.string().min(32).required(),
  APP_ENCRYPTION_KEY: Joi.string().min(32).optional(),
  CORS_ORIGIN: Joi.string().default('http://localhost:3011'),
  UPLOAD_DIR: Joi.string().optional(),
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  PLATFORM_ADMIN_USERNAME: Joi.string().allow('').optional(),
  PLATFORM_ADMIN_NAME: Joi.string().allow('').optional(),
  PLATFORM_ADMIN_EMAIL: Joi.string().email().lowercase().allow('').optional(),
  ROOT_DOMAIN: Joi.string().default('localhost'),
  APP_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_OAUTH_REDIRECT_URI: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .optional(),
  SIGNUP_INVITATION_TTL_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(24),
  SMTP_HOST: Joi.string().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().port().default(465),
  SMTP_SECURE: Joi.boolean().default(true),
  SMTP_USER: Joi.string().email().allow('').optional(),
  SMTP_APP_PASSWORD: Joi.string().allow('').optional(),
  EMAIL_FROM_NAME: Joi.string().max(100).default('Sponsor.krd'),
  INTERNAL_PROXY_SECRET: Joi.string().min(32).optional(),
  OPERATIONS_SECRET: Joi.string().min(32).optional(),
  ANALYTICS_HASH_SECRET: Joi.string().min(32).optional(),
});
