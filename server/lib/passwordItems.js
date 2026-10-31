import zxcvbn from 'zxcvbn';

// For "which password is strongest?" items, the answer key is computed with zxcvbn rather
// than by hand, and each option gets an explanation with its estimated guess count.
export function strengthNotes(options) {
  const results = options.map((o) => zxcvbn(o));
  const notes = results.map((r) => {
    const warn = r.feedback.warning ? ` ${r.feedback.warning}.` : '';
    return `About 10^${r.guesses_log10.toFixed(1)} guesses; offline fast-hash attack: ${r.crack_times_display.offline_fast_hashing_1e10_per_second}.${warn}`;
  });
  const correctIndex = results.reduce((best, r, i) => (r.guesses_log10 > results[best].guesses_log10 ? i : best), 0);
  return { correctIndex, notes, guessesLog10: results.map((r) => r.guesses_log10) };
}
