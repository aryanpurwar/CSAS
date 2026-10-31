import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { securityHeaders, permissionsPolicy, noStore } from './middleware/security.js';
import { csrfProtection } from './middleware/csrf.js';
import { rateLimit } from './middleware/rateLimit.js';
import { requestLog } from './middleware/requestLog.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import trainingRoutes from './routes/training.js';
import studyRoutes from './routes/study.js';
import inboxRoutes from './routes/inbox.js';
import trackRoutes, { clickRouter } from './routes/campaignPublic.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestLog);
  app.use(securityHeaders, permissionsPolicy);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Click tracking for simulated phishing emails (outside /api, like a real tracked link).
  app.use(clickRouter);

  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok', name: 'Cybersecurity Awareness System API', version: '3.0.0', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  app.use('/api', noStore, csrfProtection, rateLimit({ name: 'api', windowSec: 60, max: env.NODE_ENV === 'test' ? 10000 : 600 }));
  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/training', trainingRoutes);
  app.use('/api/study', studyRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/track', trackRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFoundHandler);

  // In production the API also serves the built React app, so everything is one origin
  // and the auth cookies can be SameSite=Strict.
  const dist = path.resolve(__dirname, '../client/dist');
  if (env.SERVE_CLIENT && fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
