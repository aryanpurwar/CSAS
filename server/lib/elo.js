// Elo-style rating for adaptive difficulty. Both learners and items have a rating.
// A learner who does better than expected on an item gains rating and the item loses
// rating (it turned out easier than thought), and vice versa.

export const DEFAULT_RATING = 1000;
export const DIFFICULTY_PRIOR = { easy: 850, medium: 1000, hard: 1150 };

// Target success probability when choosing the next item. ~0.7 keeps practice in the
// "desirable difficulty" zone: challenging but mostly achievable.
export const TARGET_SUCCESS = 0.7;

export const expectedScore = (learner, item) => 1 / (1 + 10 ** ((item - learner) / 400));

// K shrinks as we gather evidence, so early ratings move fast and then stabilise.
export const learnerK = (n) => Math.max(16, 48 - 2 * n);
export const itemK = (n) => Math.max(8, 32 - n / 2);

// outcome is in [0, 1]; partial credit (e.g. correct verdict but missed cues) is allowed.
export function updateRatings({ learner, item, outcome, learnerN = 0, itemN = 0 }) {
  const expected = expectedScore(learner, item);
  const delta = outcome - expected;
  return {
    expected,
    learner: Math.round(learner + learnerK(learnerN) * delta),
    item: Math.round(item - itemK(itemN) * delta),
  };
}

// The item rating at which a learner of rating r has TARGET_SUCCESS chance of success.
export const targetItemRating = (r, p = TARGET_SUCCESS) => r - 400 * Math.log10(p / (1 - p));

// Pick the next item: closest to the target difficulty among candidates, choosing
// randomly among the `spread` nearest to avoid deterministic, memorisable sequences.
export function pickAdaptive(candidates, learnerRating, { spread = 3, rand = Math.random } = {}) {
  if (!candidates.length) return null;
  const target = targetItemRating(learnerRating);
  const sorted = [...candidates].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target));
  const pool = sorted.slice(0, Math.min(spread, sorted.length));
  return pool[Math.floor(rand() * pool.length)];
}

// Maps a rating to a 0-100 "skill" figure for display. 700 -> 0, 1300 -> 100.
export const ratingToSkill = (r) => Math.max(0, Math.min(100, Math.round(((r - 700) / 600) * 100)));
