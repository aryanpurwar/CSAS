import mongoose from 'mongoose';

// One simulated email delivered to one consenting participant. The tracking token is
// looked up by its SHA-256 hash; the encrypted copy lets the in-app inbox rebuild the link.
const campaignTargetSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhishingScenario', required: true },
    tokenHash: { type: String, required: true, unique: true },
    tokenEnc: { type: String, required: true, select: false },
    deliveredAt: { type: Date, default: Date.now },
    emailedAt: Date,
    openedAt: Date,
    clickedAt: Date,
    clickCount: { type: Number, default: 0 },
    submittedAt: Date,
    reportedAt: Date,
    lessonViewedAt: Date,
  },
  { timestamps: true }
);

campaignTargetSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CampaignTarget', campaignTargetSchema);
