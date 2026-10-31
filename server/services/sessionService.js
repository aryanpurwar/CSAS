import mongoose from 'mongoose';
import TrainingSession from '../models/TrainingSession.js';
import ItemResponse from '../models/ItemResponse.js';
import AssessmentResult from '../models/AssessmentResult.js';
import User from '../models/User.js';
import PhishingScenario from '../models/PhishingScenario.js';
import { MODULE_DEFS, assessmentDef } from '../modules/index.js';
import { pickAdaptive, updateRatings, expectedScore } from '../lib/elo.js';
import { brierScore, mean } from '../lib/stats.js';
import { badRequest, conflict, notFound } from '../lib/http.js';
import { recordTrainingSession } from './progressService.js';

const SESSION_TTL_MIN = 60;
const TIMER_GRACE_SEC = 3; // network latency allowance on top of the visible countdown
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

const defFor = (module) => (module === 'assessment' ? assessmentDef : MODULE_DEFS[module]);

// Confidence 1..5 ("guessing" .. "certain") mapped to a probability for calibration.
export const confidenceToProb = (c) => 0.5 + (c - 1) * 0.125;

export async function startTrainingSession(user, module) {
  const def = MODULE_DEFS[module];
  if (!def) throw notFound('Unknown training module');
  const available = await def.model.countDocuments(def.trainingFilter);
  if (!available) throw notFound('No training content is available for this module yet. Ask an admin to add some.');
  const session = await TrainingSession.create({
    userId: user._id,
    module,
    mode: user.studyGroup === 'control' ? 'static' : 'adaptive',
    length: Math.min(def.length, available),
    expiresAt: new Date(Date.now() + SESSION_TTL_MIN * 60000),
  });
  return { sessionId: session._id, module, mode: session.mode, length: session.length, timeLimitSec: def.timeLimitSec };
}

async function chooseItem(session, user, def) {
  const servedIds = session.served.map((s) => s.itemId.toString());
  const all = await def.model.find(def.trainingFilter).select('_id rating difficulty').lean();
  let candidates = all.filter((i) => !servedIds.includes(i._id.toString()));
  if (!candidates.length) return null;

  const history = await ItemResponse.find({ userId: user._id, module: session.module, kind: 'training' })
    .sort({ createdAt: -1 }).limit(200).select('itemId').lean();
  const recent = new Set(history.slice(0, Math.min(12, Math.floor(all.length / 2))).map((h) => h.itemId.toString()));
  const fresh = candidates.filter((c) => !recent.has(c._id.toString()));
  if (fresh.length) candidates = fresh;

  if (session.mode === 'adaptive') {
    return pickAdaptive(candidates, user.ratings?.[session.module] ?? 1000);
  }
  // Static (control condition): fixed curriculum order, least-seen items first.
  const seenCount = new Map();
  history.forEach((h) => seenCount.set(h.itemId.toString(), (seenCount.get(h.itemId.toString()) || 0) + 1));
  return [...candidates].sort((a, b) =>
    (seenCount.get(a._id.toString()) || 0) - (seenCount.get(b._id.toString()) || 0)
    || DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]
    || a._id.toString().localeCompare(b._id.toString()))[0];
}

async function loadActiveSession(userId, sessionId) {
  if (!mongoose.isValidObjectId(sessionId)) throw badRequest('Invalid session');
  const session = await TrainingSession.findOne({ _id: sessionId, userId });
  if (!session) throw notFound('Session not found');
  if (session.completed) throw conflict('This session is already finished.', 'SESSION_COMPLETE');
  if (session.expiresAt < new Date()) throw conflict('This session expired. Start a new one.', 'SESSION_EXPIRED');
  return session;
}

function presentItem(session, def, item, servedAt) {
  return {
    position: session.answers.length + 1,
    length: session.length,
    item: def.publicView(item),
    servedAt,
    timeLimitSec: def.timeLimitSec,
    deadline: def.timeLimitSec ? new Date(servedAt.getTime() + def.timeLimitSec * 1000) : null,
  };
}

// Serves the next item. Idempotent: if an item is already pending, it is returned again
// with its ORIGINAL servedAt, so refreshing the page does not reset the timer.
export async function nextItem(user, sessionId) {
  const session = await loadActiveSession(user._id, sessionId);
  const def = defFor(session.module);

  if (session.served.length > session.answers.length) {
    const pending = session.served[session.served.length - 1];
    const item = await def.model.findById(pending.itemId);
    return presentItem(session, def, item, pending.servedAt);
  }
  if (session.served.length >= session.length) return { done: true };

  let chosen;
  if (session.module === 'assessment') chosen = { _id: session.plannedItemIds[session.served.length] };
  else chosen = await chooseItem(session, user, def);
  if (!chosen) return { done: true };

  const servedAt = new Date();
  const n = session.served.length;
  // Conditional push: succeeds only if nobody else served an item since we read the session.
  const updated = await TrainingSession.findOneAndUpdate(
    { _id: session._id, completed: false, $expr: { $eq: [{ $size: '$served' }, n] } },
    { $push: { served: { itemId: chosen._id, servedAt } } },
    { new: true }
  );
  if (!updated) return nextItem(user, sessionId); // lost a race; return whatever is pending now
  const item = await def.model.findById(chosen._id);
  return presentItem(updated, def, item, servedAt);
}

export async function submitAnswer(user, sessionId, itemId, answer) {
  const session = await loadActiveSession(user._id, sessionId);
  const def = defFor(session.module);
  const served = session.served.find((s) => s.itemId.toString() === String(itemId));
  if (!served) throw badRequest('This item was not served in this session');
  if (session.answers.some((a) => a.itemId.toString() === String(itemId))) throw conflict('This item was already answered.', 'ALREADY_ANSWERED');

  const item = await def.model.findById(itemId);
  if (!item) throw notFound('Item no longer exists');

  const now = new Date();
  const decisionMs = now - served.servedAt;
  const timedOut = Boolean(def.timeLimitSec) && decisionMs > (def.timeLimitSec + TIMER_GRACE_SEC) * 1000;

  let graded;
  try {
    graded = def.grade(item, answer, { timedOut });
  } catch (err) {
    if (err?.name === 'ZodError') throw badRequest('Answer is not in the expected format', err.issues);
    throw err;
  }

  // Atomic guard: the $ne condition means two concurrent submissions for the same item
  // cannot both succeed. This replaces v2's read-check-write race.
  const updated = await TrainingSession.findOneAndUpdate(
    { _id: session._id, userId: user._id, completed: false, 'served.itemId': item._id, 'answers.itemId': { $ne: item._id } },
    { $push: { answers: { itemId: item._id, score: graded.score, correct: graded.correct, at: now } }, $inc: { scoreSum: graded.score, correctCount: graded.correct ? 1 : 0 } },
    { new: true }
  );
  if (!updated) throw conflict('This item was already answered.', 'ALREADY_ANSWERED');

  const isTraining = session.module !== 'assessment';
  const ratingKey = isTraining ? session.module : null;
  let ratingBefore = null;
  let ratingAfter = null;
  let expected = null;
  if (ratingKey) {
    ratingBefore = user.ratings?.[ratingKey] ?? 1000;
    const r = updateRatings({ learner: ratingBefore, item: item.rating, outcome: graded.score, learnerN: user.ratingCounts?.[ratingKey] ?? 0, itemN: item.ratingN });
    expected = r.expected;
    ratingAfter = r.learner;
    // $inc keeps concurrent updates from overwriting each other.
    await Promise.all([
      User.updateOne({ _id: user._id }, { $inc: { [`ratings.${ratingKey}`]: r.learner - ratingBefore, [`ratingCounts.${ratingKey}`]: 1 } }),
      def.model.updateOne({ _id: item._id }, { $inc: { rating: r.item - item.rating, ratingN: 1 } }),
    ]);
  } else {
    expected = expectedScore(user.ratings?.phishing ?? 1000, item.rating);
  }

  await ItemResponse.create({
    userId: user._id,
    sessionId: session._id,
    module: session.module === 'assessment' ? 'phishing' : session.module,
    kind: isTraining ? 'training' : 'assessment',
    phase: session.phase,
    form: session.form,
    studyGroup: user.studyGroup,
    itemId: item._id,
    itemDifficulty: item.difficulty,
    correct: graded.correct,
    score: graded.score,
    confidence: graded.confidence,
    decisionMs,
    timedOut,
    ratingBefore,
    ratingAfter,
    itemRatingBefore: item.rating,
    expected,
    ...graded.record,
  });

  const finished = updated.answers.length >= updated.length;
  let result = null;
  if (finished) {
    const finalScore = Math.round((updated.scoreSum / updated.length) * 100);
    // Only one request can flip completed=false -> true, so results are recorded exactly once.
    const won = await TrainingSession.findOneAndUpdate(
      { _id: session._id, completed: false },
      { $set: { completed: true, completedAt: now, finalScore } },
      { new: true }
    );
    if (won) {
      result = isTraining
        ? { ...(await recordTrainingSession({ userId: user._id, module: session.module, score: finalScore })), correct: updated.correctCount, total: updated.length }
        : await completeAssessment(user, won);
    }
  }

  return {
    position: updated.answers.length,
    length: updated.length,
    finished,
    feedback: isTraining ? graded.feedback : null,
    result,
  };
}

// ---------- Assessments (pre / post / retention) ----------

export const FORMS = ['A', 'B', 'C'];
const PHASE_INDEX = { pre: 0, post: 1, retention: 2 };

// Counterbalancing: each participant gets the three forms in a rotated order derived
// from their participant code, so no single form is always the "pre-test".
export function formFor(participantCode, phase) {
  const seed = [...String(participantCode)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3;
  return FORMS[(seed + PHASE_INDEX[phase]) % 3];
}

export async function startAssessment(user, phase) {
  const existing = await TrainingSession.findOne({ userId: user._id, module: 'assessment', phase, completed: false, expiresAt: { $gt: new Date() } });
  if (existing) return { sessionId: existing._id, phase, form: existing.form, length: existing.length };
  const form = formFor(user.participantCode, phase);
  const items = await PhishingScenario.find({ pool: 'assessment', form, active: true }).select('_id').lean();
  if (!items.length) throw notFound(`Assessment form ${form} has no items. Run the seed script.`);
  // Shuffle order per participant so position effects average out.
  const ids = items.map((i) => i._id).sort(() => Math.random() - 0.5);
  const session = await TrainingSession.create({
    userId: user._id,
    module: 'assessment',
    mode: 'static',
    phase,
    form,
    plannedItemIds: ids,
    length: ids.length,
    expiresAt: new Date(Date.now() + SESSION_TTL_MIN * 60000),
  });
  return { sessionId: session._id, phase, form, length: session.length };
}

async function completeAssessment(user, session) {
  const rows = await ItemResponse.find({ sessionId: session._id }).lean();
  const phish = rows.filter((r) => r.isPhishing);
  const legit = rows.filter((r) => !r.isPhishing);
  const summary = {
    accuracy: mean(rows.map((r) => (r.correct ? 1 : 0))),
    meanScore: mean(rows.map((r) => r.score)),
    phishDetectionRate: phish.length ? mean(phish.map((r) => (r.correct ? 1 : 0))) : null,
    falsePositiveRate: legit.length ? mean(legit.map((r) => (r.correct ? 0 : 1))) : null,
    meanRecall: phish.length ? mean(phish.map((r) => r.recall ?? 0)) : null,
    meanDecisionMs: Math.round(mean(rows.map((r) => r.decisionMs))),
    brier: brierScore(rows.filter((r) => r.confidence).map((r) => [confidenceToProb(r.confidence), r.correct ? 1 : 0])),
  };
  try {
    await AssessmentResult.create({ userId: user._id, sessionId: session._id, phase: session.phase, form: session.form, studyGroup: user.studyGroup, ...summary });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
  return { phase: session.phase, recorded: true };
}
