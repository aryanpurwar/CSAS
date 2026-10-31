import mongoose from 'mongoose';

const servedSchema = new mongoose.Schema(
  { itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, servedAt: { type: Date, required: true } },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  { itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, score: Number, correct: Boolean, at: Date },
  { _id: false }
);

const trainingSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: String, enum: ['phishing', 'social', 'quiz', 'password', 'assessment'], required: true },
    mode: { type: String, enum: ['adaptive', 'static'], default: 'adaptive' },
    phase: { type: String, enum: ['pre', 'post', 'retention', null], default: null },
    form: { type: String, default: null },
    plannedItemIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // fixed sequence for assessments
    length: { type: Number, required: true },
    served: { type: [servedSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    scoreSum: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    finalScore: Number,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

trainingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TrainingSession', trainingSessionSchema);
