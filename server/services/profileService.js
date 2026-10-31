import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import AssessmentResult from '../models/AssessmentResult.js';
import TrainingSession from '../models/TrainingSession.js';
import { BADGES, getLevel, trainingScore } from '../lib/gamification.js';
import { ratingToSkill } from '../lib/elo.js';
import { displayStreak } from '../lib/time.js';
import { env } from '../config/env.js';

export const isGamified = (user) => user.studyGroup !== 'control';

export async function studyStatus(user) {
  const [results, trainingSessions] = await Promise.all([
    AssessmentResult.find({ userId: user._id }).lean(),
    TrainingSession.countDocuments({ userId: user._id, completed: true, module: { $ne: 'assessment' } }),
  ]);
  const byPhase = Object.fromEntries(results.map((r) => [r.phase, r]));
  const now = Date.now();
  const enrolled = Boolean(user.consent?.study?.given);
  const retentionOpensAt = byPhase.post ? new Date(byPhase.post.completedAt.getTime() + env.RETENTION_DAYS * 86400 * 1000) : null;
  return {
    enrolled,
    group: user.studyGroup,
    trainingSessions,
    postTestMinSessions: env.POST_TEST_MIN_SESSIONS,
    phases: {
      pre: { done: Boolean(byPhase.pre), available: enrolled && !byPhase.pre, result: byPhase.pre ?? null },
      post: {
        done: Boolean(byPhase.post),
        available: enrolled && Boolean(byPhase.pre) && !byPhase.post && trainingSessions >= env.POST_TEST_MIN_SESSIONS,
        result: byPhase.post ?? null,
      },
      retention: {
        done: Boolean(byPhase.retention),
        available: enrolled && Boolean(byPhase.post) && !byPhase.retention && now >= retentionOpensAt?.getTime(),
        opensAt: retentionOpensAt,
        result: byPhase.retention ?? null,
      },
    },
  };
}

export async function buildProfile(user) {
  const progress = await UserProgress.find({ userId: user._id }).lean();
  const gamified = isGamified(user);
  const level = getLevel(user.xp);
  let rank = null;
  if (gamified && user.role === 'student') {
    rank = 1 + (await User.countDocuments({ role: 'student', studyGroup: { $ne: 'control' }, xp: { $gt: user.xp } }));
  }
  const badgeMap = Object.fromEntries(BADGES.map((b) => [b.id, b]));
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    participantCode: user.participantCode,
    gamified,
    xp: gamified ? user.xp : null,
    level: gamified ? level : null,
    badges: gamified ? user.badges.map((id) => ({ id, label: badgeMap[id]?.label ?? id, description: badgeMap[id]?.description ?? '' })) : [],
    streak: gamified ? { current: displayStreak(user.streak, new Date(), user.timezone), best: user.streak?.best ?? 0 } : null,
    rank,
    skills: Object.fromEntries(['phishing', 'social', 'quiz', 'password'].map((m) => [m, ratingToSkill(user.ratings?.[m] ?? 1000)])),
    progress: progress.map(({ module, score, sessions, completed, lastAt, recentScores }) => ({ module, score, sessions, completed, lastAt, recentScores })),
    trainingScore: trainingScore(progress),
    consent: { study: Boolean(user.consent?.study?.given), campaigns: Boolean(user.consent?.campaigns?.given) },
    studyGroup: user.studyGroup,
    mfaEnabled: Boolean(user.security?.totpEnabled),
  };
}
