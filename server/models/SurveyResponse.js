import mongoose from 'mongoose';

const surveyResponseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    instrument: { type: String, enum: ['sus'], default: 'sus' },
    answers: { type: [Number], required: true },
    score: { type: Number, required: true },
    studyGroup: String,
    comment: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

surveyResponseSchema.index({ userId: 1, instrument: 1 }, { unique: true });

export default mongoose.model('SurveyResponse', surveyResponseSchema);
