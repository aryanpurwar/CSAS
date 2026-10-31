   import { env } from './config/env.js';
   import { connectDB } from './config/db.js';
   import { createApp } from './app.js';
   import { logger } from './lib/logger.js';

   const app = createApp();

   // A brand-new database (first deploy) has no training content. If SEED_IF_EMPTY=true,
   // load the seed once; it never runs when content already exists.
   async function seedIfEmpty() {
     if (process.env.SEED_IF_EMPTY !== 'true') return;
     const { default: PhishingScenario } = await import('./models/PhishingScenario.js');
     if ((await PhishingScenario.estimatedDocumentCount()) > 0) return;
     const { runSeed } = await import('./seed/seed.js');
     await runSeed({ demo: true });
     logger.info('Empty database found, seed data loaded');
   }

   connectDB()
     .then(seedIfEmpty)
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