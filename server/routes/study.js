import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import SurveyResponse from '../models/SurveyResponse.js';
import { ah, conflict, forbidden } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { susScore } from '../lib/stats.js';
import { audit } from '../services/auditService.js';
import { studyStatus, buildProfile } from '../services/profileService.js';
import { startAssessment } from '../services/sessionService.js';

const router = express.Router();
router.use(requireAuth);

export const CONSENT_VERSION = '2026-1';

// Balanced assignment: new participants join whichever group is smaller (ties random).
async function assignGroup() {
  const [adaptive, control] = await Promise.all([
    User.countDocuments({ studyGroup: 'adaptive' }),
    User.countDocuments({ studyGroup: 'control' }),
  ]);
  if (adaptive === control) return Math.random() < 0.5 ? 'adaptive' : 'control';
  return adaptive < control ? 'adaptive' : 'control';
}

router.get('/status', ah(async (req, res) => res.json(await studyStatus(req.user))));

router.post(
  '/consent',
  validate({ body: z.object({ study: z.boolean(), campaigns: z.boolean() }) }),
  ah(async (req, res) => {
    const user = req.user;
    const set = {
      'consent.campaigns.given': req.body.campaigns,
      'consent.campaigns.at': new Date(),
    };
    if (req.body.study && !user.consent?.study?.given) {
      set['consent.study.given'] = true;
      set['consent.study.at'] = new Date();
      set['consent.study.version'] = CONSENT_VERSION;
      if (!user.studyGroup && user.role === 'student') set.studyGroup = await assignGroup();
    } else if (!req.body.study && user.consent?.study?.given) {
      // Withdrawal: stop collecting. Existing anonymised rows are removed on request by an admin.
      set['consent.study.given'] = false;
      set['consent.study.at'] = new Date();
    }
    await User.updateOne({ _id: user._id }, { $set: set });
    await audit(req, 'study.consent', { meta: req.body });
    const fresh = await User.findById(user._id);
    res.json(await buildProfile(fresh));
  })
);

router.post(
  '/assessments/:phase/start',
  validate({ params: z.object({ phase: z.enum(['pre', 'post', 'retention']) }) }),
  ah(async (req, res) => {
    const status = await studyStatus(req.user);
    const phase = status.phases[req.params.phase];
    if (!status.enrolled) throw forbidden('Join the study before taking assessments.', 'NOT_ENROLLED');
    if (phase.done) throw conflict('You have already completed this assessment.', 'ASSESSMENT_DONE');
    if (!phase.available) throw forbidden('This assessment is not open for you yet.', 'ASSESSMENT_LOCKED');
    res.status(201).json(await startAssessment(req.user, req.params.phase));
  })
);

router.post(
  '/sus',
  validate({ body: z.object({ answers: z.array(z.number().int().min(1).max(5)).length(10), comment: z.string().max(2000).optional() }) }),
  ah(async (req, res) => {
    try {
      const doc = await SurveyResponse.create({ userId: req.user._id, instrument: 'sus', answers: req.body.answers, score: susScore(req.body.answers), studyGroup: req.user.studyGroup, comment: req.body.comment });
      res.status(201).json({ score: doc.score });
    } catch (err) {
      if (err?.code === 11000) throw conflict('You have already submitted the usability questionnaire.');
      throw err;
    }
  })
);

router.get('/sus', ah(async (req, res) => {
  const doc = await SurveyResponse.findOne({ userId: req.user._id, instrument: 'sus' }).lean();
  res.json({ submitted: Boolean(doc), score: doc?.score ?? null });
}));

export default router;
