// Scores an email inspection: the learner's verdict plus the set of elements they flagged.
// For phishing emails we measure precision and recall of the cues they flagged.
// For legitimate emails every flag is a false alarm (over-suspicion is also a failure).

export function scoreInspection({ isPhishing, cueTargets, verdict, flags }) {
  const truth = new Set(cueTargets);
  const flagged = new Set(flags);
  const hits = [...flagged].filter((t) => truth.has(t));
  const misses = [...truth].filter((t) => !flagged.has(t));
  const falseFlags = [...flagged].filter((t) => !truth.has(t));
  const verdictCorrect = (verdict === 'phish') === isPhishing;

  let precision = null;
  let recall = null;
  let f1 = null;
  if (isPhishing && truth.size) {
    precision = flagged.size ? hits.length / flagged.size : 0;
    recall = hits.length / truth.size;
    f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  }

  let score = 0;
  if (verdictCorrect) {
    // Correct verdict alone earns 0.6; finding the evidence earns the rest.
    score = isPhishing ? 0.6 + 0.4 * (f1 ?? 0) : Math.max(0.6, 1 - 0.1 * falseFlags.length);
  }

  return {
    verdictCorrect,
    score: Math.round(score * 1000) / 1000,
    precision,
    recall,
    f1,
    hits,
    misses,
    falseFlags,
  };
}
