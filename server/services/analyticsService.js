import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import ItemResponse from '../models/ItemResponse.js';
import AssessmentResult from '../models/AssessmentResult.js';
import SurveyResponse from '../models/SurveyResponse.js';
import CampaignTarget from '../models/CampaignTarget.js';
import PhishingScenario from '../models/PhishingScenario.js';
import McqItem from '../models/McqItem.js';
import { mean, sd, welchTTest, pairedTTest } from '../lib/stats.js';
import { MODULES } from '../lib/gamification.js';

const round = (x, d = 3) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

export async function overview() {
  const [students, enrolled, progress, phishRows, recentRows, contentCounts] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ 'consent.study.given': true }),
    UserProgress.find().lean(),
    ItemResponse.find({ module: 'phishing', kind: 'training' }).select('isPhishing correct hitCueTypes missedCueTypes falseFlags').lean(),
    ItemResponse.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, responses: { $sum: 1 }, correct: { $sum: { $cond: ['$correct', 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Promise.all([
      PhishingScenario.countDocuments({ active: true }),
      McqItem.countDocuments({ module: 'social', active: true }),
      McqItem.countDocuments({ module: 'quiz', active: true }),
      McqItem.countDocuments({ module: 'password', active: true }),
    ]),
  ]);

  const modules = MODULES.map((m) => {
    const docs = progress.filter((p) => p.module === m);
    return {
      module: m,
      learners: docs.length,
      sessions: docs.reduce((a, d) => a + d.sessions, 0),
      averageScore: docs.length ? Math.round(mean(docs.map((d) => d.score))) : null,
      completionRate: students ? round(docs.filter((d) => d.completed).length / students, 3) : 0,
    };
  });

  // Cue-type detection: for each kind of red flag, how often learners found it.
  const cue = {};
  for (const r of phishRows) {
    for (const t of r.hitCueTypes ?? []) (cue[t] ??= { hits: 0, misses: 0 }).hits += 1;
    for (const t of r.missedCueTypes ?? []) (cue[t] ??= { hits: 0, misses: 0 }).misses += 1;
  }
  const cueDetection = Object.entries(cue)
    .map(([type, { hits, misses }]) => ({ type, detected: hits, missed: misses, rate: round(hits / (hits + misses)) }))
    .sort((a, b) => a.rate - b.rate);

  const legit = phishRows.filter((r) => r.isPhishing === false);
  const phish = phishRows.filter((r) => r.isPhishing);
  return {
    students,
    enrolled,
    content: { phishing: contentCounts[0], social: contentCounts[1], quiz: contentCounts[2], password: contentCounts[3] },
    modules,
    cueDetection,
    phishingVerdicts: {
      phishDetectionRate: phish.length ? round(mean(phish.map((r) => (r.correct ? 1 : 0)))) : null,
      falseAlarmRate: legit.length ? round(mean(legit.map((r) => (r.correct ? 0 : 1)))) : null,
      responses: phishRows.length,
    },
    activity: recentRows.map((r) => ({ day: r._id, responses: r.responses, accuracy: round(r.correct / r.responses) })),
  };
}

export async function itemAnalysis(type) {
  const model = type === 'phishing' ? PhishingScenario : McqItem;
  const filter = type === 'phishing' ? {} : { module: type };
  const items = await model.find(filter).sort({ createdAt: 1 }).lean();
  const stats = await ItemResponse.aggregate([
    { $match: { itemId: { $in: items.map((i) => i._id) } } },
    { $group: { _id: '$itemId', n: { $sum: 1 }, correct: { $sum: { $cond: ['$correct', 1, 0] } }, recall: { $avg: '$recall' }, ms: { $avg: '$decisionMs' } } },
  ]);
  const byId = new Map(stats.map((s) => [s._id.toString(), s]));
  return items.map((i) => {
    const s = byId.get(i._id.toString());
    return { ...i, stats: s ? { n: s.n, accuracy: round(s.correct / s.n), meanRecall: round(s.recall), meanDecisionSec: round(s.ms / 1000, 1) } : { n: 0 } };
  });
}

const PHASES = ['pre', 'post', 'retention'];
const METRICS = ['meanScore', 'accuracy', 'phishDetectionRate', 'falsePositiveRate', 'meanRecall', 'meanDecisionMs', 'brier'];

function describe(values) {
  const v = values.filter(Number.isFinite);
  return { n: v.length, mean: round(mean(v)), sd: round(sd(v)) };
}

export async function studySummary() {
  const [results, sus, users, campaignTargets] = await Promise.all([
    AssessmentResult.find().lean(),
    SurveyResponse.find({ instrument: 'sus' }).lean(),
    User.find({ 'consent.study.given': true, studyGroup: { $ne: null } }).select('_id studyGroup').lean(),
    CampaignTarget.find().populate('userId', 'studyGroup').populate('scenarioId', 'isPhishing').lean(),
  ]);
  const groups = ['adaptive', 'control'];
  const byUser = new Map();
  for (const r of results) {
    if (!byUser.has(r.userId.toString())) byUser.set(r.userId.toString(), {});
    byUser.get(r.userId.toString())[r.phase] = r;
  }

  const perGroup = {};
  const gains = { adaptive: [], control: [] };
  const retained = { adaptive: [], control: [] };
  for (const g of groups) {
    const groupResults = results.filter((r) => r.studyGroup === g);
    perGroup[g] = {
      enrolled: users.filter((u) => u.studyGroup === g).length,
      phases: Object.fromEntries(PHASES.map((p) => [p, Object.fromEntries(METRICS.map((m) => [m, describe(groupResults.filter((r) => r.phase === p).map((r) => r[m]))]))])),
      sus: describe(sus.filter((s) => s.studyGroup === g).map((s) => s.score)),
    };
    const pre = [];
    const post = [];
    for (const [, phases] of byUser) {
      if (phases.pre?.studyGroup !== g) continue;
      if (phases.pre && phases.post) {
        pre.push(phases.pre.meanScore);
        post.push(phases.post.meanScore);
        gains[g].push(phases.post.meanScore - phases.pre.meanScore);
      }
      if (phases.pre && phases.retention) retained[g].push(phases.retention.meanScore - phases.pre.meanScore);
    }
    perGroup[g].withinGroupPrePost = pairedTTest(pre, post);
    perGroup[g].gain = describe(gains[g]);
    perGroup[g].retainedGain = describe(retained[g]);

    const ct = campaignTargets.filter((t) => t.userId?.studyGroup === g && t.scenarioId?.isPhishing);
    perGroup[g].campaigns = {
      delivered: ct.length,
      clickRate: ct.length ? round(ct.filter((t) => t.clickedAt).length / ct.length) : null,
      submitRate: ct.length ? round(ct.filter((t) => t.submittedAt).length / ct.length) : null,
      reportRate: ct.length ? round(ct.filter((t) => t.reportedAt).length / ct.length) : null,
    };
  }

  const fmt = (t) => (t ? Object.fromEntries(Object.entries(t).map(([k, v]) => [k, round(v, 4)])) : null);
  for (const g of groups) perGroup[g].withinGroupPrePost = fmt(perGroup[g].withinGroupPrePost);
  return {
    groups: perGroup,
    betweenGroups: {
      gain: fmt(welchTTest(gains.adaptive, gains.control)),
      retainedGain: fmt(welchTTest(retained.adaptive, retained.control)),
    },
    note: 'Primary outcome: change in mean assessment score (0-1) from pre-test to post-test. Welch t-test compares gains between groups; d is Cohen\'s d. Verify in R/Python using the CSV export before reporting.',
  };
}

export async function exportRows(type) {
  if (type === 'assessments') {
    const rows = await AssessmentResult.find().populate('userId', 'participantCode').lean();
    return {
      columns: ['participant', 'group', 'phase', 'form', 'meanScore', 'accuracy', 'phishDetectionRate', 'falsePositiveRate', 'meanRecall', 'meanDecisionMs', 'brier', 'completedAt'],
      rows: rows.map((r) => ({ ...r, participant: r.userId?.participantCode, group: r.studyGroup })),
    };
  }
  if (type === 'sus') {
    const rows = await SurveyResponse.find().populate('userId', 'participantCode').lean();
    return {
      columns: ['participant', 'group', 'score', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'comment', 'createdAt'],
      rows: rows.map((r) => ({ participant: r.userId?.participantCode, group: r.studyGroup, score: r.score, comment: r.comment, createdAt: r.createdAt, ...Object.fromEntries(r.answers.map((a, i) => [`q${i + 1}`, a])) })),
    };
  }
  const rows = await ItemResponse.find().populate('userId', 'participantCode').sort({ createdAt: 1 }).lean();
  return {
    columns: ['participant', 'group', 'kind', 'phase', 'form', 'module', 'itemId', 'itemDifficulty', 'isPhishing', 'verdict', 'selectedIndex', 'correct', 'score', 'precision', 'recall', 'hitCueTypes', 'missedCueTypes', 'falseFlags', 'confidence', 'decisionMs', 'timedOut', 'ratingBefore', 'ratingAfter', 'itemRatingBefore', 'expected', 'createdAt'],
    rows: rows.map((r) => ({ ...r, participant: r.userId?.participantCode, group: r.studyGroup, itemId: r.itemId.toString() })),
  };
}
