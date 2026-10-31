import express from 'express';
import { z } from 'zod';
import { ah, notFound } from '../lib/http.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import PhishingScenario from '../models/PhishingScenario.js';
import { env } from '../config/env.js';
import { recordClick, recordSubmit, lessonFor, findTargetByToken } from '../services/campaignService.js';

// These endpoints are deliberately unauthenticated: a participant may click the simulated
// email from their real mailbox without being signed in. The token is the only key, it
// identifies exactly one delivery, and the responses contain no personal data.
const tokenParam = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/) });
const limiter = rateLimit({ name: 'track', windowSec: 60, max: 60 });

export const clickRouter = express.Router();
clickRouter.get('/c/:token', limiter, validate({ params: tokenParam }), ah(async (req, res) => {
  const target = await recordClick(req.params.token);
  const base = env.SERVE_CLIENT ? '' : env.PUBLIC_URL.replace(/\/$/, '');
  if (!target) return res.redirect(302, `${base}/`);
  res.redirect(302, `${base}/lp/${req.params.token}`);
}));

const router = express.Router();
router.use(limiter);

router.get('/:token/landing', validate({ params: tokenParam }), ah(async (req, res) => {
  const target = await findTargetByToken(req.params.token);
  if (!target) throw notFound('This link is not valid');
  const s = await PhishingScenario.findById(target.scenarioId).select('landing fromName').lean();
  res.json({ brand: s?.landing?.brand || s?.fromName || 'Sign in', prompt: s?.landing?.prompt || 'Sign in to continue' });
}));

// The landing page never sends what was typed. The client discards the field values and
// this endpoint records only the fact that a submission happened.
router.post('/:token/submit', validate({ params: tokenParam, body: z.object({}).strict() }), ah(async (req, res) => {
  const target = await recordSubmit(req.params.token);
  if (!target) throw notFound('This link is not valid');
  res.json({ lessonUrl: `/lesson/${req.params.token}` });
}));

router.get('/:token/lesson', validate({ params: tokenParam }), ah(async (req, res) => res.json(await lessonFor(req.params.token))));

export default router;
