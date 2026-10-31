import phishing from './phishing.js';
import { social, quiz, password } from './mcq.js';

export const MODULE_DEFS = { phishing, social, quiz, password };
export const TRAINING_MODULES = Object.keys(MODULE_DEFS);

// Assessments reuse the phishing inspector but use a held-out item pool and give no feedback.
export const assessmentDef = { ...phishing, name: 'assessment', length: 6 };
