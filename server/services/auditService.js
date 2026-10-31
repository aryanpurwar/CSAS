import AuditLog from '../models/AuditLog.js';
import { logger } from '../lib/logger.js';

// Append-only security audit trail. Failures to write the audit log are logged but do
// not break the user's request.
export async function audit(req, action, { actor = req?.user, targetType, targetId, outcome = 'success', meta = {} } = {}) {
  try {
    await AuditLog.create({
      actorId: actor?._id ?? null,
      actorEmail: actor?.email ?? meta.email ?? null,
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      ip: req?.ip,
      outcome,
      meta,
    });
  } catch (err) {
    logger.error({ err, action }, 'audit write failed');
  }
}
