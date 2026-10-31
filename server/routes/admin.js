import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Campaign from '../models/Campaign.js';
import PhishingScenario, { CUE_TYPES } from '../models/PhishingScenario.js';
import McqItem from '../models/McqItem.js';
import ItemResponse from '../models/ItemResponse.js';
import UserProgress from '../models/UserProgress.js';
import { ah, badRequest, conflict, notFound } from '../lib/http.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DIFFICULTY_PRIOR, ratingToSkill } from '../lib/elo.js';
import { trainingScore } from '../lib/gamification.js';
import { strengthNotes } from '../lib/passwordItems.js';
import { toCsv } from '../lib/csv.js';
import { audit } from '../services/auditService.js';
import { overview, itemAnalysis, studySummary, exportRows } from '../services/analyticsService.js';
import { launchCampaign, campaignMetrics } from '../services/campaignService.js';
import { smtpEnabled } from '../services/mailer.js';
import { targetsFor } from '../modules/phishing.js';

const router = express.Router();
router.use(...requireAdmin);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const text = (max) => z.string().trim().min(1).max(max);

router.get('/overview', ah(async (_req, res) => res.json(await overview())));

// ---------- Users ----------

router.get('/users', ah(async (_req, res) => {
  const [users, progress] = await Promise.all([User.find().sort({ createdAt: -1 }).lean(), UserProgress.find().lean()]);
  res.json(users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    participantCode: u.participantCode,
    studyGroup: u.studyGroup,
    consent: { study: Boolean(u.consent?.study?.given), campaigns: Boolean(u.consent?.campaigns?.given) },
    xp: u.xp,
    phishingSkill: ratingToSkill(u.ratings?.phishing ?? 1000),
    trainingScore: trainingScore(progress.filter((p) => p.userId.toString() === u._id.toString())),
    locked: Boolean(u.security?.lockUntil && u.security.lockUntil > new Date()),
    mfaEnabled: Boolean(u.security?.totpEnabled),
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  })));
}));

router.patch(
  '/users/:id',
  validate({ params: idParam, body: z.object({ role: z.enum(['student', 'admin']).optional(), studyGroup: z.enum(['adaptive', 'control']).nullable().optional(), unlock: z.literal(true).optional() }) }),
  ah(async (req, res) => {
    const target = await User.findById(req.params.id);
    if (!target) throw notFound('User not found');
    const set = {};
    const inc = {};
    if (req.body.role && req.body.role !== target.role) {
      if (target._id.equals(req.user._id)) throw badRequest('You cannot change your own role.');
      set.role = req.body.role;
      inc['security.tokenVersion'] = 1; // force re-login so the new role takes effect everywhere
    }
    if (req.body.studyGroup !== undefined) set.studyGroup = req.body.studyGroup;
    if (req.body.unlock) Object.assign(set, { 'security.lockUntil': null, 'security.failedLogins': 0 });
    await User.updateOne({ _id: target._id }, { $set: set, ...(Object.keys(inc).length ? { $inc: inc } : {}) });
    await audit(req, 'admin.user.update', { targetType: 'user', targetId: target._id, meta: req.body });
    res.json({ ok: true });
  })
);

// ---------- Content ----------

const contentType = z.object({ type: z.enum(['phishing', 'social', 'quiz', 'password']) });
router.get('/content/:type', validate({ params: contentType }), ah(async (req, res) => res.json(await itemAnalysis(req.params.type))));

router.get('/content-meta', (_req, res) => res.json({ cueTypes: CUE_TYPES }));

const phishingBody = z.object({
  title: text(120),
  isPhishing: z.boolean(),
  pool: z.enum(['training', 'assessment', 'campaign']).default('training'),
  form: z.enum(['A', 'B', 'C']).nullable().optional(),
  fromName: text(120),
  fromAddress: text(200),
  replyTo: z.string().trim().max(200).optional().or(z.literal('')),
  subject: text(250),
  auth: z.object({ spf: z.enum(['pass', 'fail', 'softfail', 'none']), dkim: z.enum(['pass', 'fail', 'none']), dmarc: z.enum(['pass', 'fail', 'none']) }),
  parts: z.array(z.object({ kind: z.enum(['text', 'link', 'attachment']), text: text(1000), href: z.string().trim().max(500).optional() })).min(1).max(30),
  cues: z.array(z.object({ target: z.string().max(12), type: z.enum(CUE_TYPES), explanation: text(500) })).max(15).default([]),
  legitReasons: z.array(text(300)).max(10).default([]),
  takeaway: z.string().trim().max(500).default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  landing: z.object({ brand: z.string().max(80).optional(), prompt: z.string().max(160).optional() }).optional(),
});

router.post('/content/phishing', validate({ body: phishingBody }), ah(async (req, res) => {
  const b = req.body;
  const valid = new Set(targetsFor(b));
  const bad = b.cues.filter((c) => !valid.has(c.target));
  if (bad.length) throw badRequest(`Cue targets do not exist in this email: ${bad.map((c) => c.target).join(', ')}`);
  if (b.isPhishing && !b.cues.length) throw badRequest('A phishing email needs at least one marked red flag.');
  if (!b.isPhishing && b.cues.length) throw badRequest('A legitimate email should not have red flags. Use "why it is legitimate" instead.');
  if (b.pool === 'assessment' && !b.form) throw badRequest('Assessment items need a form (A, B or C).');
  if (b.parts.some((p) => p.kind === 'link' && !p.href)) throw badRequest('Every link needs its real destination URL.');
  const doc = await PhishingScenario.create({ ...b, replyTo: b.replyTo || undefined, rating: DIFFICULTY_PRIOR[b.difficulty] });
  await audit(req, 'content.create', { targetType: 'phishing', targetId: doc._id });
  res.status(201).json(doc);
}));

const mcqBody = z.object({
  module: z.enum(['social', 'quiz', 'password']),
  category: z.string().trim().max(60).default('general'),
  channel: z.enum(['phone', 'sms', 'chat', 'in-person', 'whatsapp', 'email']).nullable().optional(),
  sender: z.string().trim().max(120).optional(),
  transcript: z.array(z.object({ from: z.enum(['them', 'you']), text: text(600) })).max(12).default([]),
  prompt: text(600),
  options: z.array(text(300)).min(2).max(5),
  correctIndex: z.number().int().min(0).max(4).optional(),
  autoStrongest: z.boolean().default(false),
  explanation: text(1500),
  redFlags: z.array(text(300)).max(10).default([]),
  recommendedAction: z.string().trim().max(600).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

router.post('/content/mcq', validate({ body: mcqBody }), ah(async (req, res) => {
  const b = { ...req.body };
  if (b.autoStrongest) {
    const { correctIndex, notes } = strengthNotes(b.options);
    b.correctIndex = correctIndex;
    b.optionNotes = notes;
  }
  if (!Number.isInteger(b.correctIndex) || b.correctIndex >= b.options.length) throw badRequest('Choose which option is correct.');
  const doc = await McqItem.create({ ...b, rating: DIFFICULTY_PRIOR[b.difficulty] });
  await audit(req, 'content.create', { targetType: b.module, targetId: doc._id });
  res.status(201).json(doc);
}));

// Items are retired, not deleted, once anyone has answered them: deleting would orphan
// research data. Items with no responses can be deleted outright.
router.patch('/content/:type/:id', validate({ params: contentType.extend({ id: objectId }), body: z.object({ active: z.boolean() }) }), ah(async (req, res) => {
  const model = req.params.type === 'phishing' ? PhishingScenario : McqItem;
  const doc = await model.findByIdAndUpdate(req.params.id, { active: req.body.active }, { new: true });
  if (!doc) throw notFound('Item not found');
  await audit(req, req.body.active ? 'content.restore' : 'content.retire', { targetType: req.params.type, targetId: doc._id });
  res.json({ ok: true, active: doc.active });
}));

router.delete('/content/:type/:id', validate({ params: contentType.extend({ id: objectId }) }), ah(async (req, res) => {
  const model = req.params.type === 'phishing' ? PhishingScenario : McqItem;
  if (await ItemResponse.exists({ itemId: req.params.id })) throw conflict('People have already answered this item. Retire it instead so their data stays intact.', 'HAS_RESPONSES');
  const doc = await model.findByIdAndDelete(req.params.id);
  if (!doc) throw notFound('Item not found');
  await audit(req, 'content.delete', { targetType: req.params.type, targetId: req.params.id });
  res.json({ ok: true });
}));

// ---------- Campaigns ----------

router.get('/campaigns', ah(async (_req, res) => {
  const [campaigns, templates] = await Promise.all([
    Campaign.find().sort({ createdAt: -1 }).populate('scenarioId', 'title isPhishing').lean(),
    PhishingScenario.find({ pool: 'campaign', active: true }).select('title isPhishing subject fromName fromAddress difficulty').lean(),
  ]);
  res.json({ campaigns, templates, smtpEnabled: smtpEnabled() });
}));

router.post(
  '/campaigns',
  validate({ body: z.object({ name: text(120), scenarioId: objectId, userIds: z.array(objectId).min(1).max(500), sendEmail: z.boolean().default(false) }) }),
  ah(async (req, res) => {
    const result = await launchCampaign({ admin: req.user, ...req.body });
    await audit(req, 'campaign.launch', { targetType: 'campaign', targetId: result.campaign._id, meta: { targeted: result.targeted, skipped: result.skipped } });
    res.status(201).json({ id: result.campaign._id, targeted: result.targeted, skipped: result.skipped, emailed: result.emailed });
  })
);

router.get('/campaigns/:id', validate({ params: idParam }), ah(async (req, res) => res.json(await campaignMetrics(req.params.id))));

router.post('/campaigns/:id/end', validate({ params: idParam }), ah(async (req, res) => {
  const c = await Campaign.findOneAndUpdate({ _id: req.params.id, status: 'running' }, { status: 'ended', endedAt: new Date() }, { new: true });
  if (!c) throw notFound('Running campaign not found');
  await audit(req, 'campaign.end', { targetType: 'campaign', targetId: c._id });
  res.json({ ok: true });
}));

// ---------- Study ----------

router.get('/study/summary', ah(async (_req, res) => res.json(await studySummary())));

router.get('/study/export', validate({ query: z.object({ type: z.enum(['responses', 'assessments', 'sus']).default('responses') }) }), ah(async (req, res) => {
  const { type } = req.validatedQuery;
  const { columns, rows } = await exportRows(type);
  await audit(req, 'study.export', { meta: { type, rows: rows.length } });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="csas-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(toCsv(columns, rows));
}));

// ---------- Audit log ----------

router.get('/audit', validate({ query: z.object({ action: z.string().max(60).optional(), outcome: z.enum(['success', 'failure']).optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }) }), ah(async (req, res) => {
  const { action, outcome, limit } = req.validatedQuery;
  const filter = {};
  if (action) filter.action = { $regex: `^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
  if (outcome) filter.outcome = outcome;
  res.json(await AuditLog.find(filter).sort({ at: -1 }).limit(limit).lean());
}));

export default router;
