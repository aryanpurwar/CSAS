import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import ItemResponse from '../models/ItemResponse.js';
import { ah, badRequest, forbidden } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { isValidTimeZone, displayStreak } from '../lib/time.js';
import { checkAccountPassword } from '../lib/passwordPolicy.js';
import { getLevel } from '../lib/gamification.js';
import { audit } from '../services/auditService.js';
import { buildProfile, isGamified } from '../services/profileService.js';
import { revokeAllForUser, issueSession } from '../services/tokenService.js';
import { BCRYPT_COST } from './auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', ah(async (req, res) => res.json(await buildProfile(req.user))));

router.patch(
  '/',
  validate({ body: z.object({ name: z.string().trim().min(2).max(80).optional(), timezone: z.string().max(64).optional() }) }),
  ah(async (req, res) => {
    const set = {};
    if (req.body.name) set.name = req.body.name;
    if (req.body.timezone) {
      if (!isValidTimeZone(req.body.timezone)) throw badRequest('Unknown time zone');
      set.timezone = req.body.timezone;
    }
    await User.updateOne({ _id: req.user._id }, { $set: set });
    res.json(await buildProfile(await User.findById(req.user._id)));
  })
);

router.post(
  '/password',
  validate({ body: z.object({ current: z.string().min(1).max(200), next: z.string().max(200) }) }),
  ah(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.current, user.passwordHash))) {
      await audit(req, 'auth.password.change', { outcome: 'failure' });
      throw badRequest('Your current password is incorrect.');
    }
    const policy = checkAccountPassword(req.body.next, [user.name, user.email]);
    if (!policy.ok) throw badRequest(policy.message);
    // Changing the password ends every other session.
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(req.body.next, BCRYPT_COST) }, $inc: { 'security.tokenVersion': 1 } });
    await revokeAllForUser(user._id);
    await issueSession(res, await User.findById(user._id), req);
    await audit(req, 'auth.password.change');
    res.json({ ok: true });
  })
);

// Personal insight: which kinds of red flags this learner tends to miss.
router.get('/insights', ah(async (req, res) => {
  const rows = await ItemResponse.find({ userId: req.user._id, module: 'phishing', kind: 'training' }).sort({ createdAt: -1 }).limit(60).lean();
  const tally = {};
  for (const r of rows) {
    for (const t of r.hitCueTypes ?? []) (tally[t] ??= { hit: 0, missed: 0 }).hit += 1;
    for (const t of r.missedCueTypes ?? []) (tally[t] ??= { hit: 0, missed: 0 }).missed += 1;
  }
  const cues = Object.entries(tally).map(([type, v]) => ({ type, ...v, rate: v.hit / (v.hit + v.missed) })).sort((a, b) => a.rate - b.rate);
  const legit = rows.filter((r) => r.isPhishing === false);
  const recent = await ItemResponse.find({ userId: req.user._id, kind: 'training' }).sort({ createdAt: -1 }).limit(10).select('module correct score createdAt').lean();
  res.json({
    cues,
    falseAlarms: { legitSeen: legit.length, flaggedAsPhish: legit.filter((r) => r.verdict === 'phish').length },
    recent,
  });
}));

router.get('/leaderboard', ah(async (req, res) => {
  if (!isGamified(req.user)) throw forbidden('The leaderboard is not part of your study group.', 'NOT_GAMIFIED');
  const users = await User.find({ role: 'student', studyGroup: { $ne: 'control' } }).select('name xp badges streak timezone').sort({ xp: -1, createdAt: 1 }).limit(25).lean();
  const now = new Date();
  res.json(users.map((u, i) => ({
    rank: i + 1,
    id: u._id,
    name: u.name,
    xp: u.xp,
    level: getLevel(u.xp).name,
    badges: u.badges.length,
    streak: displayStreak(u.streak, now, u.timezone),
    you: u._id.equals(req.user._id),
  })));
}));

export default router;
