import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  { phishing: { type: Number, default: 1000 }, social: { type: Number, default: 1000 }, quiz: { type: Number, default: 1000 }, password: { type: Number, default: 1000 } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    participantCode: { type: String, unique: true, sparse: true },

    // Research study participation
    studyGroup: { type: String, enum: ['adaptive', 'control', null], default: null },
    consent: {
      study: { given: { type: Boolean, default: false }, at: Date, version: String },
      campaigns: { given: { type: Boolean, default: false }, at: Date },
    },

    // Adaptive difficulty
    ratings: { type: ratingSchema, default: () => ({}) },
    ratingCounts: { type: ratingSchema, default: () => ({ phishing: 0, social: 0, quiz: 0, password: 0 }) },

    // Cached, derived gamification state (recomputed, never incremented)
    xp: { type: Number, default: 0, index: true },
    badges: { type: [String], default: [] },
    streak: { count: { type: Number, default: 0 }, best: { type: Number, default: 0 }, lastDay: { type: String, default: null } },

    // Account security
    security: {
      failedLogins: { type: Number, default: 0 },
      lockUntil: { type: Date, default: null },
      tokenVersion: { type: Number, default: 0 },
      totpEnabled: { type: Boolean, default: false },
      totpSecretEnc: { type: String, select: false },
      totpPendingEnc: { type: String, select: false },
      totpLastStep: { type: Number, default: -1 },
    },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.isLocked = function isLocked(now = new Date()) {
  return Boolean(this.security?.lockUntil && this.security.lockUntil > now);
};

export default mongoose.model('User', userSchema);
