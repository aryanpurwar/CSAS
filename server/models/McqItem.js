import mongoose from 'mongoose';

// One collection for every multiple-choice style item: social-engineering scenarios,
// knowledge-quiz questions and password-lab challenges. `module` says which.
const mcqItemSchema = new mongoose.Schema(
  {
    module: { type: String, enum: ['social', 'quiz', 'password'], required: true, index: true },
    category: { type: String, default: 'general' },
    // Social-engineering context
    channel: { type: String, enum: ['phone', 'sms', 'chat', 'in-person', 'whatsapp', 'email', null], default: null },
    sender: String,
    transcript: { type: [{ from: { type: String, enum: ['them', 'you'] }, text: String, _id: false }], default: [] },
    // Question
    prompt: { type: String, required: true },
    options: { type: [String], validate: [(v) => v.length >= 2 && v.length <= 5, '2-5 options required'] },
    // For password "strongest" items the answer is computed with zxcvbn at seed time
    correctIndex: { type: Number, required: true, min: 0, max: 4 },
    explanation: { type: String, required: true },
    redFlags: { type: [String], default: [] },
    recommendedAction: String,
    optionNotes: { type: [String], default: [] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    rating: { type: Number, default: 1000 },
    ratingN: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('McqItem', mcqItemSchema);
