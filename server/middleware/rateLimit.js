import RateLimit from '../models/RateLimit.js';

// Fixed-window limiter backed by MongoDB (atomic $inc with upsert).
export function rateLimit({ name, windowSec, max, key = (req) => req.ip }) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / (windowSec * 1000)) * windowSec * 1000;
      const id = `${name}:${key(req)}:${windowStart}`;
      const doc = await RateLimit.findOneAndUpdate(
        { _id: id },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowSec * 1000) } },
        { upsert: true, new: true }
      ).lean();
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', Math.max(0, max - doc.count));
      if (doc.count > max) {
        res.setHeader('Retry-After', Math.ceil((windowStart + windowSec * 1000 - now) / 1000));
        return res.status(429).json({ message: 'Too many requests. Wait a moment and try again.', code: 'RATE_LIMITED' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
