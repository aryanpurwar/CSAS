import { logger } from '../lib/logger.js';

// Logs method, path, status and latency. Campaign tracking tokens in URLs are masked
// so that log access does not grant the ability to impersonate a click.
export function requestLog(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.replace(/(\/c\/|\/track\/)[A-Za-z0-9_-]+/, '$1[token]');
    logger.info({ method: req.method, path, status: res.statusCode, ms: Math.round(ms), uid: req.user?._id?.toString() }, 'request');
  });
  next();
}
