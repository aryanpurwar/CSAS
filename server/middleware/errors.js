import mongoose from 'mongoose';
import { HttpError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'API route not found', code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, code: err.code, details: err.details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid identifier', code: 'BAD_REQUEST' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body', code: 'BAD_REQUEST' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  return res.status(500).json({ message: 'Something went wrong on the server', code: 'INTERNAL' });
}
