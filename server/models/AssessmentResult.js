import mongoose from 'mongoose';

// Summary of one pre/post/retention test. One per participant per phase (enforced by index).
const assessmentResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    phase: { type: String, enum: ['pre', 'post', 'retention'], required: true },
    form: String,
    studyGroup: String,
    accuracy: Number,
    meanScore: Number,
    phishDetectionRate: Number,
    falsePositiveRate: Number,
    meanRecall: Number,
    meanDecisionMs: Number,
    brier: Number,
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assessmentResultSchema.index({ userId: 1, phase: 1 }, { unique: true });

export default mongoose.model('AssessmentResult', assessmentResultSchema);
