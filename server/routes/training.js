import express from 'express';
import { z } from 'zod';
import { ah } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { TRAINING_MODULES } from '../modules/index.js';
import { startTrainingSession, nextItem, submitAnswer } from '../services/sessionService.js';

const router = express.Router();
router.use(requireAuth, rateLimit({ name: 'training', windowSec: 60, max: 240, key: (req) => req.user._id.toString() }));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

router.post(
  '/:module/sessions',
  validate({ params: z.object({ module: z.enum(TRAINING_MODULES) }) }),
  ah(async (req, res) => res.status(201).json(await startTrainingSession(req.user, req.params.module)))
);

router.post(
  '/sessions/:id/next',
  validate({ params: z.object({ id: objectId }) }),
  ah(async (req, res) => res.json(await nextItem(req.user, req.params.id)))
);

router.post(
  '/sessions/:id/answer',
  validate({ params: z.object({ id: objectId }), body: z.object({ itemId: objectId, answer: z.record(z.any()) }) }),
  ah(async (req, res) => res.json(await submitAnswer(req.user, req.params.id, req.body.itemId, req.body.answer)))
);

export default router;
