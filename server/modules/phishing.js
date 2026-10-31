import { z } from 'zod';
import PhishingScenario from '../models/PhishingScenario.js';
import { scoreInspection } from '../lib/cueScoring.js';

export const targetsFor = (item) => ['from', 'subject', 'auth', ...(item.replyTo ? ['replyTo'] : []), ...item.parts.map((_, i) => `p${i}`)];

const answerSchema = z.object({
  verdict: z.enum(['phish', 'legit']),
  flags: z.array(z.string().max(12)).max(40).default([]),
  confidence: z.number().int().min(1).max(5),
});

// What the learner sees. Cue annotations, the verdict and the scenario title stay on the server.
export function publicView(item) {
  return {
    id: item._id,
    type: 'email',
    fromName: item.fromName,
    fromAddress: item.fromAddress,
    replyTo: item.replyTo || null,
    to: item.to,
    subject: item.subject,
    auth: item.auth,
    difficulty: item.difficulty,
    parts: item.parts.map((p, i) => ({ id: `p${i}`, kind: p.kind, text: p.text, href: p.href || null })),
    targets: targetsFor(item),
  };
}

export function grade(item, rawAnswer) {
  const answer = answerSchema.parse(rawAnswer);
  const allowed = new Set(targetsFor(item));
  const flags = [...new Set(answer.flags.filter((f) => allowed.has(f)))];
  const cueByTarget = new Map(item.cues.map((c) => [c.target, c]));
  const r = scoreInspection({ isPhishing: item.isPhishing, cueTargets: [...cueByTarget.keys()], verdict: answer.verdict, flags });

  const annotations = [
    ...r.hits.map((t) => ({ target: t, status: 'hit', type: cueByTarget.get(t).type, explanation: cueByTarget.get(t).explanation })),
    ...r.misses.map((t) => ({ target: t, status: 'missed', type: cueByTarget.get(t).type, explanation: cueByTarget.get(t).explanation })),
    ...r.falseFlags.map((t) => ({ target: t, status: 'false-alarm' })),
  ];

  return {
    correct: r.verdictCorrect,
    score: r.score,
    confidence: answer.confidence,
    record: {
      isPhishing: item.isPhishing,
      verdict: answer.verdict,
      cueHits: r.hits,
      cueMisses: r.misses,
      falseFlags: r.falseFlags,
      hitCueTypes: r.hits.map((t) => cueByTarget.get(t).type),
      missedCueTypes: r.misses.map((t) => cueByTarget.get(t).type),
      precision: r.precision,
      recall: r.recall,
    },
    feedback: {
      isPhishing: item.isPhishing,
      verdictCorrect: r.verdictCorrect,
      score: r.score,
      precision: r.precision,
      recall: r.recall,
      annotations,
      legitReasons: item.isPhishing ? [] : item.legitReasons,
      takeaway: item.takeaway,
    },
  };
}

export default {
  name: 'phishing',
  model: PhishingScenario,
  length: 6,
  timeLimitSec: null,
  trainingFilter: { pool: 'training', active: true },
  publicView,
  grade,
};
