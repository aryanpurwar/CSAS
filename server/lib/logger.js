import pino from 'pino';
import { env } from '../config/env.js';

// Structured JSON logs. Secrets that can appear in requests are redacted.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'password', 'code', 'token'],
});
