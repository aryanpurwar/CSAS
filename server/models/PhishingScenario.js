import mongoose from 'mongoose';

export const CUE_TYPES = [
  'lookalike-domain', 'sender-mismatch', 'reply-to-mismatch', 'auth-failure', 'urgency', 'threat',
  'credential-request', 'payment-request', 'otp-request', 'suspicious-link', 'link-text-mismatch',
  'generic-greeting', 'too-good-to-be-true', 'risky-attachment', 'unusual-request', 'poor-language',
];

// Body is stored as ordered parts so every line is individually selectable in the
// inspector. All parts are selectable, so the client cannot tell which ones are cues.
const partSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['text', 'link', 'attachment'], default: 'text' },
    text: { type: String, required: true },
    href: String, // real destination for links (revealed on hover, like a browser status bar)
  },
  { _id: false }
);

// target: 'from' | 'replyTo' | 'subject' | 'auth' | 'p<index>'
const cueSchema = new mongoose.Schema(
  { target: { type: String, required: true }, type: { type: String, enum: CUE_TYPES, required: true }, explanation: { type: String, required: true } },
  { _id: false }
);

const phishingScenarioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    isPhishing: { type: Boolean, required: true },
    pool: { type: String, enum: ['training', 'assessment', 'campaign'], default: 'training', index: true },
    form: { type: String, enum: ['A', 'B', 'C', null], default: null },
    locale: { type: String, default: 'IN' },
    fromName: { type: String, required: true },
    fromAddress: { type: String, required: true },
    replyTo: String,
    to: { type: String, default: 'you@campus.edu.in' },
    subject: { type: String, required: true },
    auth: {
      spf: { type: String, enum: ['pass', 'fail', 'softfail', 'none'], default: 'pass' },
      dkim: { type: String, enum: ['pass', 'fail', 'none'], default: 'pass' },
      dmarc: { type: String, enum: ['pass', 'fail', 'none'], default: 'pass' },
    },
    parts: { type: [partSchema], validate: [(v) => v.length > 0 && v.length <= 30, '1-30 parts required'] },
    cues: { type: [cueSchema], default: [] },
    legitReasons: { type: [String], default: [] },
    takeaway: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    rating: { type: Number, default: 1000 },
    ratingN: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    landing: { brand: String, prompt: String },
  },
  { timestamps: true }
);

export default mongoose.model('PhishingScenario', phishingScenarioSchema);
