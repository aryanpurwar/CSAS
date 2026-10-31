import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhishingScenario', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['running', 'ended'], default: 'running' },
    sendEmail: { type: Boolean, default: false },
    targetCount: { type: Number, default: 0 },
    launchedAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Campaign', campaignSchema);
