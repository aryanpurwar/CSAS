import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const app = createApp();

connectDB()
  .then(() => {
    const server = app.listen(env.PORT, () => logger.info(`Cybersecurity Awareness System API listening on :${env.PORT}`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    logger.fatal({ err: err.message }, 'Failed to start');
    process.exit(1);
  });
