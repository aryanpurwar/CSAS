import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import ItemResponse from '../models/ItemResponse.js';
import CampaignTarget from '../models/CampaignTarget.js';
import { COMPLETION_THRESHOLD, computeBadges, getLevel, rollingScore, xpFromProgress } from '../lib/gamification.js';
import { nextStreak } from '../lib/time.js';

async function badgeStats(userId) {
  const [phish, reportedBeforeClick] = await Promise.all([
    ItemResponse.find({ userId, module: 'phishing', kind: 'training', isPhishing: true }).sort({ createdAt: -1 }).limit(10).select('recall').lean(),
    CampaignTarget.countDocuments({ userId, reportedAt: { $ne: null }, $or: [{ clickedAt: null }, { $expr: { $lt: ['$reportedAt', '$clickedAt'] } }] }),
  ]);
  const phishingRecall = phish.length >= 10 ? phish.reduce((a, r) => a + (r.recall ?? 0), 0) / phish.length : 0;
  return { phishingRecall, reportedBeforeClick };
}

// Recomputes every derived field from source data. Safe to call any number of times.
export async function recomputeUser(userId, { trainedAt = null } = {}) {
  const user = await User.findById(userId);
  if (!user) return null;
  const progress = await UserProgress.find({ userId }).lean();
  const stats = await badgeStats(userId);
  const streak = trainedAt ? nextStreak(user.streak, trainedAt, user.timezone) : user.streak;
  const xp = xpFromProgress(progress);
  const badges = computeBadges({ user: { ...user.toObject(), streak }, progress, stats });
  const before = { xp: user.xp, badges: user.badges };
  await User.updateOne({ _id: userId }, { $set: { xp, badges, streak } });
  return {
    xp,
    xpGained: Math.max(0, xp - before.xp),
    level: getLevel(xp),
    leveledUp: getLevel(xp).index > getLevel(before.xp).index,
    newBadges: badges.filter((b) => !before.badges.includes(b)),
    streak,
  };
}

export async function recordTrainingSession({ userId, module, score }) {
  const doc = await UserProgress.findOneAndUpdate(
    { userId, module },
    { $push: { recentScores: { $each: [score], $slice: -5 } }, $inc: { sessions: 1 }, $set: { lastAt: new Date() } },
    { upsert: true, new: true }
  );
  const rolling = rollingScore(doc.recentScores);
  await UserProgress.updateOne(
    { _id: doc._id },
    { $set: { score: rolling, completed: rolling >= COMPLETION_THRESHOLD[module] }, $max: { bestRolling: rolling } }
  );
  const derived = await recomputeUser(userId, { trainedAt: new Date() });
  return { moduleScore: rolling, sessionScore: score, ...derived };
}
