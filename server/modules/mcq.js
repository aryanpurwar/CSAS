import { z } from 'zod';
import McqItem from '../models/McqItem.js';

const answerSchema = z.object({
  selectedIndex: z.number().int().min(-1).max(4), // -1 = ran out of time
  confidence: z.number().int().min(1).max(5).optional(),
});

export function publicView(item) {
  return {
    id: item._id,
    type: item.module,
    category: item.category,
    channel: item.channel,
    sender: item.sender,
    transcript: item.transcript,
    prompt: item.prompt,
    options: item.options,
    difficulty: item.difficulty,
  };
}

export function grade(item, rawAnswer, { timedOut = false } = {}) {
  const answer = answerSchema.parse(rawAnswer);
  const correct = !timedOut && answer.selectedIndex === item.correctIndex;
  return {
    correct,
    score: correct ? 1 : 0,
    confidence: answer.confidence,
    record: { selectedIndex: timedOut ? -1 : answer.selectedIndex },
    feedback: {
      correct,
      timedOut,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
      redFlags: item.redFlags,
      recommendedAction: item.recommendedAction,
      optionNotes: item.optionNotes,
    },
  };
}

const make = (name, length, timeLimitSec = null) => ({
  name,
  model: McqItem,
  length,
  timeLimitSec,
  trainingFilter: { module: name, active: true },
  publicView,
  grade,
});

export const social = make('social', 5);
export const quiz = make('quiz', 10, 30);
export const password = make('password', 6);
