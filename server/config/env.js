import 'dotenv/config';
import { z } from 'zod';

// Configuration is validated once at startup. A misconfigured server should
// refuse to boot rather than run with a weak secret or a missing database URI.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // 64 hex chars = 32 bytes, used for AES-256-GCM encryption of TOTP secrets and campaign tokens.
  DATA_ENC_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'DATA_ENC_KEY must be 64 hex characters (32 bytes)'),
  PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  REQUIRE_ADMIN_MFA: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  RETENTION_DAYS: z.coerce.number().int().min(0).default(7),
  POST_TEST_MIN_SESSIONS: z.coerce.number().int().min(0).default(4),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().default('it-helpdesk@campus-mail.test'),
  SERVE_CLIENT: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid configuration:\n${issues}\nSee server/.env.example`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
