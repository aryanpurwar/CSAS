// Gamification is derived, never accumulated. XP and badges are recomputed from the
// learner's progress records every time, so they cannot drift out of sync with the
// underlying data (the v2 dashboard showed 200 XP alongside 0 attempts) and badges
// that no longer hold are removed.

export const MODULES = ['phishing', 'social', 'quiz', 'password'];

export const MODULE_MAX_XP = { phishing: 300, social: 200, quiz: 150, password: 150 };
export const COMPLETION_THRESHOLD = { phishing: 70, social: 70, quiz: 60, password: 70 };
export const MODULE_WEIGHTS = { phishing: 0.4, social: 0.25, quiz: 0.15, password: 0.2 };

// The module score is the mean of the last 3 sessions, not the best ever. A lucky
// session cannot lock in a high score, and the score falls if skill falls.
export const ROLLING_WINDOW = 3;

export function rollingScore(recentScores) {
  const window = recentScores.slice(-ROLLING_WINDOW);
  return window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length) : 0;
}

export function xpFromProgress(progressDocs) {
  return progressDocs.reduce((total, p) => {
    const max = MODULE_MAX_XP[p.module] || 0;
    return total + Math.round(((p.bestRolling || 0) / 100) * max) + Math.min(p.sessions || 0, 20) * 5;
  }, 0);
}

export function trainingScore(progressDocs) {
  const byModule = Object.fromEntries(progressDocs.map((p) => [p.module, p.score || 0]));
  return Math.round(Object.entries(MODULE_WEIGHTS).reduce((acc, [m, w]) => acc + (byModule[m] || 0) * w, 0));
}

export const LEVELS = [
  { name: 'Recruit', min: 0 },
  { name: 'Spotter', min: 200 },
  { name: 'Analyst', min: 450 },
  { name: 'Defender', min: 700 },
  { name: 'Sentinel', min: 900 },
];

export function getLevel(xp = 0) {
  let idx = 0;
  LEVELS.forEach((lvl, i) => { if (xp >= lvl.min) idx = i; });
  const next = LEVELS[idx + 1];
  return { name: LEVELS[idx].name, index: idx, min: LEVELS[idx].min, nextAt: next ? next.min : null, nextName: next?.name ?? null };
}

// ctx: { user, progress: [...], stats: { phishingRecall, reportedBeforeClick } }
export const BADGES = [
  { id: 'first-session', label: 'First session', description: 'Completed a training session', check: ({ progress }) => progress.some((p) => p.sessions > 0) },
  { id: 'phish-hunter', label: 'Phish hunter', description: 'Phishing score of 70 or more', check: ({ progress }) => progress.some((p) => p.module === 'phishing' && p.score >= 70) },
  { id: 'eagle-eye', label: 'Eagle eye', description: 'Found 80% of red flags across your last 10 phishing emails', check: ({ stats }) => (stats.phishingRecall ?? 0) >= 0.8 },
  { id: 'social-savvy', label: 'Pretext spotter', description: 'Social-engineering score of 70 or more', check: ({ progress }) => progress.some((p) => p.module === 'social' && p.score >= 70) },
  { id: 'password-pro', label: 'Passphrase pro', description: 'Password score of 70 or more', check: ({ progress }) => progress.some((p) => p.module === 'password' && p.score >= 70) },
  { id: 'all-rounder', label: 'All-rounder', description: 'Completed every module to its threshold', check: ({ progress }) => MODULES.every((m) => progress.some((p) => p.module === m && p.completed)) },
  { id: 'reporter', label: 'First responder', description: 'Reported a simulated phish before clicking it', check: ({ stats }) => (stats.reportedBeforeClick ?? 0) > 0 },
  { id: 'streak-7', label: 'Seven-day habit', description: 'Trained on 7 consecutive days', check: ({ user }) => (user.streak?.best ?? 0) >= 7 },
];

export const computeBadges = (ctx) => BADGES.filter((b) => b.check(ctx)).map((b) => b.id);
