import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import PhishingScenario from '../models/PhishingScenario.js';
import McqItem from '../models/McqItem.js';
import TrainingSession from '../models/TrainingSession.js';
import ItemResponse from '../models/ItemResponse.js';
import AssessmentResult from '../models/AssessmentResult.js';
import SurveyResponse from '../models/SurveyResponse.js';
import Campaign from '../models/Campaign.js';
import CampaignTarget from '../models/CampaignTarget.js';
import AuditLog from '../models/AuditLog.js';
import RefreshToken from '../models/RefreshToken.js';
import RateLimit from '../models/RateLimit.js';
import { participantCode } from '../lib/crypto.js';
import { DIFFICULTY_PRIOR } from '../lib/elo.js';
import { env } from '../config/env.js';

import phishingTraining from './content/phishingTraining.js';
import phishingAssessment from './content/phishingAssessment.js';
import phishingCampaign from './content/phishingCampaign.js';
import social from './content/social.js';
import quiz from './content/quiz.js';
import password from './content/password.js';

const COST = env.NODE_ENV === 'test' ? 4 : 12;
const withRating = (doc) => ({ ...doc, rating: DIFFICULTY_PRIOR[doc.difficulty] ?? 1000, ratingN: 0 });

export async function runSeed({ demo = true } = {}) {
  await Promise.all([
    User.deleteMany({}), UserProgress.deleteMany({}), PhishingScenario.deleteMany({}), McqItem.deleteMany({}),
    TrainingSession.deleteMany({}), ItemResponse.deleteMany({}), AssessmentResult.deleteMany({}), SurveyResponse.deleteMany({}),
    Campaign.deleteMany({}), CampaignTarget.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({}), RateLimit.deleteMany({}),
  ]);

  const phishing = [...phishingTraining, ...phishingAssessment, ...phishingCampaign].map(withRating);
  const mcq = [...social, ...quiz, ...password].map(withRating);
  await PhishingScenario.insertMany(phishing);
  await McqItem.insertMany(mcq);

  const counts = {
    phishingTraining: phishingTraining.length,
    phishingAssessment: phishingAssessment.length,
    phishingCampaign: phishingCampaign.length,
    social: social.length,
    quiz: quiz.length,
    password: password.length,
  };

  let accounts = [];
  if (demo) {
    const mk = async (name, email, role, extra = {}) => ({
      name, email, role,
      passwordHash: await bcrypt.hash(role === 'admin' ? 'Admin!longpass#2026' : 'student-longpass-2026', COST),
      participantCode: participantCode(), timezone: 'Asia/Kolkata', ...extra,
    });
    accounts = await User.insertMany([
      await mk('Admin', 'admin@csas.edu', 'admin'),
      await mk('Demo Student', 'student@csas.edu', 'student', { consent: { study: { given: true, at: new Date(), version: '2026-1' }, campaigns: { given: true, at: new Date() } }, studyGroup: 'adaptive' }),
    ]);
  }

  return { counts, accounts, totalPhishing: phishing.length, totalMcq: mcq.length };
}

// Executed directly (npm run seed), not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  connectDB()
    .then(() => runSeed({ demo: true }))
    .then(({ counts, totalPhishing, totalMcq }) => {
      console.log('Seed complete.');
      console.table(counts);
      console.log(`Phishing emails: ${totalPhishing} (training + 3 assessment forms + campaign templates)`);
      console.log(`MCQ items: ${totalMcq}`);
      console.log('\nDemo accounts:');
      console.log('  admin@csas.edu    / Admin!longpass#2026   (admin)');
      console.log('  student@csas.edu  / student-longpass-2026 (adaptive group, consented)');
      console.log('\nChange these before any real deployment.');
    })
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(disconnectDB);
}
