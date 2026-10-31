import mongoose from 'mongoose';

// Opaque refresh tokens, stored only as SHA-256 hashes. Each login starts a "family";
// every refresh rotates the token within that family. If a token that has already been
// rotated is presented again, someone replayed a stolen token, so the whole family is revoked.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: ['rotated', 'logout', 'reuse-detected', 'logout-all', null], default: null },
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
