import express from 'express';
import { z } from 'zod';
import { ah } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { inboxFor, markOpened, reportMessage } from '../services/campaignService.js';
import { recomputeUser } from '../services/progressService.js';
import { audit } from '../services/auditService.js';

const router = express.Router();
router.use(requireAuth);
const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

router.get('/', ah(async (req, res) => res.json(await inboxFor(req.user._id))));
router.post('/:id/open', validate({ params: idParam }), ah(async (req, res) => {
  await markOpened(req.user._id, req.params.id);
  res.json({ ok: true });
}));
router.post('/:id/report', validate({ params: idParam }), ah(async (req, res) => {
  const result = await reportMessage(req.user._id, req.params.id);
  await recomputeUser(req.user._id);
  await audit(req, 'inbox.report', { targetType: 'campaignTarget', targetId: req.params.id });
  res.json(result);
}));

export default router;
