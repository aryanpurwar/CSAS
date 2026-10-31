import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorEmail: String,
  action: { type: String, required: true, index: true },
  targetType: String,
  targetId: String,
  ip: String,
  outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
});

export default mongoose.model('AuditLog', auditLogSchema);
