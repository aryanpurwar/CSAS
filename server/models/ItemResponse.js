import mongoose from 'mongoose';

// One row per answered item. This is the research dataset: every metric in the
// study dashboard and the CSV export is computed from these rows.
const itemResponseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    module: { type: String, required: true, index: true },
    kind: { type: String, enum: ['training', 'assessment'], default: 'training', index: true },
    phase: { type: String, default: null },
    form: { type: String, default: null },
    studyGroup: { type: String, default: null },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    itemDifficulty: String,
    isPhishing: Boolean,
    verdict: String,
    selectedIndex: Number,
    correct: { type: Boolean, required: true },
    score: { type: Number, required: true },
    cueHits: [String],
    cueMisses: [String],
    falseFlags: [String],
    missedCueTypes: [String],
    hitCueTypes: [String],
    precision: Number,
    recall: Number,
    confidence: { type: Number, min: 1, max: 5 },
    decisionMs: Number,
    timedOut: { type: Boolean, default: false },
    ratingBefore: Number,
    ratingAfter: Number,
    itemRatingBefore: Number,
    expected: Number,
  },
  { timestamps: true }
);

itemResponseSchema.index({ sessionId: 1, itemId: 1 }, { unique: true });
itemResponseSchema.index({ userId: 1, module: 1, createdAt: -1 });

export default mongoose.model('ItemResponse', itemResponseSchema);
