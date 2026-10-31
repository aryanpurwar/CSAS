import mongoose from 'mongoose';

// Fixed-window counters stored in MongoDB, so limits survive restarts and are shared
// across multiple server instances. A TTL index deletes expired windows automatically.
const rateLimitSchema = new mongoose.Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RateLimit', rateLimitSchema);
