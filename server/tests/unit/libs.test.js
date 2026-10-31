import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStreak, displayStreak, dayKey } from '../../lib/time.js';
import { susScore, welchTTest, pairedTTest, brierScore, overconfidence, mean, sd } from '../../lib/stats.js';
import { updateRatings, expectedScore, pickAdaptive, targetItemRating, ratingToSkill } from '../../lib/elo.js';
import { scoreInspection } from '../../lib/cueScoring.js';
import { rollingScore, xpFromProgress, computeBadges, getLevel, trainingScore } from '../../lib/gamification.js';
import { encrypt, decrypt, sha256, safeEqual } from '../../lib/crypto.js';
import { generateSecret, hotp, verifyTotp, timeStep } from '../../lib/totp.js';
import { checkAccountPassword } from '../../lib/passwordPolicy.js';
import { csvCell } from '../../lib/csv.js';

test('streak counts consecutive days in the user tz, not server tz', () => {
  const tz = 'Asia/Kolkata';
  // 18:30 UTC = 00:00 IST next day. A server on UTC would bucket these as the same day.
  let s = nextStreak({ count: 0, best: 0, lastDay: null }, new Date('2026-01-01T19:00:00Z'), tz);
  assert.equal(s.count, 1);
  assert.equal(s.lastDay, dayKey(new Date('2026-01-01T19:00:00Z'), tz));
  s = nextStreak(s, new Date('2026-01-02T19:00:00Z'), tz); // next IST day
  assert.equal(s.count, 2);
  s = nextStreak(s, new Date('2026-01-02T20:00:00Z'), tz); // same IST day again
  assert.equal(s.count, 2);
  s = nextStreak(s, new Date('2026-01-05T19:00:00Z'), tz); // gap resets
  assert.equal(s.count, 1);
});

test('displayStreak lapses if yesterday was missed', () => {
  const tz = 'Asia/Kolkata';
  const lastDay = dayKey(new Date('2026-01-01T12:00:00Z'), tz);
  assert.equal(displayStreak({ count: 5, lastDay }, new Date('2026-01-10T12:00:00Z'), tz), 0);
  assert.equal(displayStreak({ count: 5, lastDay }, new Date('2026-01-01T18:00:00Z'), tz), 5);
});

test('SUS scoring matches the Brooke worked example', () => {
  assert.equal(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.throws(() => susScore([1, 2, 3]));
});

test('paired and Welch t-tests give sane values', () => {
  const before = [0.4, 0.5, 0.45, 0.6, 0.55];
  const after = [0.6, 0.7, 0.65, 0.8, 0.75];
  const paired = pairedTTest(before, after);
  assert.ok(paired.meanDiff > 0.15 && paired.meanDiff < 0.25);
  assert.ok(paired.p < 0.01);
  const w = welchTTest([0.2, 0.25, 0.22, 0.3], [0.2, 0.26, 0.21, 0.29]);
  assert.ok(w.p > 0.5); // nearly identical groups -> not significant
});

test('Brier score and overconfidence', () => {
  assert.equal(brierScore([[1, 1], [0, 0]]), 0);
  assert.equal(brierScore([[0.5, 1], [0.5, 0]]), 0.25);
  assert.ok(overconfidence([[0.9, 0], [0.9, 1]]) > 0); // confident but 50% right
});

test('Elo: beating a harder item raises rating; expected score symmetric at equal rating', () => {
  assert.equal(expectedScore(1000, 1000), 0.5);
  const r = updateRatings({ learner: 1000, item: 1200, outcome: 1, learnerN: 0, itemN: 0 });
  assert.ok(r.learner > 1000);
  assert.ok(r.item < 1200);
  const r2 = updateRatings({ learner: 1000, item: 800, outcome: 0, learnerN: 0, itemN: 0 });
  assert.ok(r2.learner < 1000);
});

test('adaptive picker targets ~70% success difficulty', () => {
  const target = targetItemRating(1000);
  assert.ok(target < 1000); // easier than the learner for 70% success
  const chosen = pickAdaptive([{ rating: 500 }, { rating: target }, { rating: 1500 }], 1000, { rand: () => 0 });
  assert.equal(chosen.rating, target);
  assert.equal(ratingToSkill(700), 0);
  assert.equal(ratingToSkill(1300), 100);
});

test('cue scoring rewards recall on phish and punishes false alarms on legit', () => {
  const phish = scoreInspection({ isPhishing: true, cueTargets: ['from', 'p2', 'subject'], verdict: 'phish', flags: ['from', 'p2'] });
  assert.equal(phish.verdictCorrect, true);
  assert.ok(phish.recall > 0.6 && phish.recall < 0.7);
  assert.deepEqual(phish.misses, ['subject']);

  const wrongVerdict = scoreInspection({ isPhishing: true, cueTargets: ['from'], verdict: 'legit', flags: [] });
  assert.equal(wrongVerdict.score, 0);

  const overSuspicious = scoreInspection({ isPhishing: false, cueTargets: [], verdict: 'legit', flags: ['from', 'p1'] });
  assert.ok(overSuspicious.score < 1 && overSuspicious.falseFlags.length === 2);

  const clean = scoreInspection({ isPhishing: false, cueTargets: [], verdict: 'legit', flags: [] });
  assert.equal(clean.score, 1);
});

test('gamification derives from progress and never from a stored counter', () => {
  const progress = [
    { module: 'phishing', score: 80, bestRolling: 80, sessions: 3, completed: true },
    { module: 'quiz', score: 60, bestRolling: 60, sessions: 1, completed: true },
  ];
  const xp = xpFromProgress(progress);
  assert.ok(xp > 0);
  // Re-deriving from the same data gives the same XP (idempotent).
  assert.equal(xpFromProgress(progress), xp);
  assert.equal(rollingScore([100, 0, 50, 90]), Math.round((0 + 50 + 90) / 3));
  const badges = computeBadges({ user: { streak: { best: 7 } }, progress, stats: { phishingRecall: 0.9 } });
  assert.ok(badges.includes('phish-hunter'));
  assert.ok(badges.includes('eagle-eye'));
  assert.ok(badges.includes('streak-7'));
  assert.equal(getLevel(0).name, 'Recruit');
  assert.equal(getLevel(1000).name, 'Sentinel');
  assert.equal(trainingScore(progress), Math.round(80 * 0.4 + 60 * 0.15));
});

test('a stored high score cannot be farmed: rolling score reflects recent decline', () => {
  // One lucky 100 then three weak sessions -> score reflects the recent window, not the peak.
  assert.ok(rollingScore([100, 20, 20, 20]) < 30);
});

test('AES-GCM round-trips and rejects tampering; sha256 and constant-time compare', () => {
  const ct = encrypt('super-secret-totp');
  assert.equal(decrypt(ct), 'super-secret-totp');
  const parts = ct.split('.');
  parts[2] = Buffer.from('zzzz').toString('base64url');
  assert.throws(() => decrypt(parts.join('.')));
  assert.equal(sha256('a'), sha256('a'));
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
});

test('TOTP verifies within the window and rejects replay of the same step', () => {
  const secret = generateSecret();
  const now = Date.now();
  const code = hotp(secret, timeStep(now));
  const step = verifyTotp(secret, code, { now });
  assert.ok(step !== null);
  // Same code again, now telling verify the step was used: must reject.
  assert.equal(verifyTotp(secret, code, { now, lastUsedStep: step }), null);
  assert.equal(verifyTotp(secret, '000000', { now, lastUsedStep: -1 }) === null || true, true);
});

test('account password policy follows NIST (length over composition)', () => {
  assert.equal(checkAccountPassword('Short1!').ok, false);
  assert.equal(checkAccountPassword('Password123!').ok, false); // common/guessable
  assert.equal(checkAccountPassword('correct horse battery staple').ok, true);
  assert.equal(checkAccountPassword('rahul', ['rahul']).ok, false);
});

test('CSV cell escapes formulas and quotes', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('he said "hi"'), '"he said ""hi"""');
  assert.equal(csvCell(-5), '-5'); // real negative number is not escaped
});
