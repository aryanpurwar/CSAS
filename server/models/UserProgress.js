import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: String, enum: ['phishing', 'social', 'quiz', 'password'], required: true },
    recentScores: { type: [Number], default: [] },
    score: { type: Number, default: 0 },
    bestRolling: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastAt: Date,
  },
  { timestamps: true }
);

userProgressSchema.index({ userId: 1, module: 1 }, { unique: true });

export default mongoose.model('UserProgress', userProgressSchema);
