import Campaign from '../models/Campaign.js';
import CampaignTarget from '../models/CampaignTarget.js';
import PhishingScenario from '../models/PhishingScenario.js';
import User from '../models/User.js';
import { randomToken, sha256, encrypt, decrypt } from '../lib/crypto.js';
import { badRequest, notFound } from '../lib/http.js';
import { median } from '../lib/stats.js';
import { env } from '../config/env.js';
import { sendCampaignEmail, smtpEnabled } from './mailer.js';

export const trackedUrlFor = (token) => `${env.PUBLIC_URL.replace(/\/$/, '')}/c/${token}`;

export async function launchCampaign({ admin, name, scenarioId, userIds, sendEmail }) {
  const scenario = await PhishingScenario.findOne({ _id: scenarioId, pool: 'campaign', active: true });
  if (!scenario) throw badRequest('Choose an active campaign template');

  // Consent is enforced here on the server, not just hidden in the UI.
  const users = await User.find({ _id: { $in: userIds }, role: 'student', 'consent.campaigns.given': true }).select('_id email').lean();
  if (!users.length) throw badRequest('None of the selected people have consented to simulated phishing. Only consenting participants can be targeted.');

  const campaign = await Campaign.create({ name, scenarioId, createdBy: admin._id, sendEmail: sendEmail && smtpEnabled(), targetCount: users.length });
  let emailed = 0;
  for (const u of users) {
    const token = randomToken(24);
    await CampaignTarget.create({ campaignId: campaign._id, userId: u._id, scenarioId, tokenHash: sha256(token), tokenEnc: encrypt(token) });
    if (campaign.sendEmail && (await sendCampaignEmail({ to: u.email, scenario, trackedUrl: trackedUrlFor(token) }))) {
      emailed += 1;
      await CampaignTarget.updateOne({ campaignId: campaign._id, userId: u._id }, { $set: { emailedAt: new Date() } });
    }
  }
  return { campaign, targeted: users.length, skipped: userIds.length - users.length, emailed };
}

export const findTargetByToken = (token) => CampaignTarget.findOne({ tokenHash: sha256(token) });

export async function recordClick(token) {
  return CampaignTarget.findOneAndUpdate(
    { tokenHash: sha256(token) },
    [{ $set: { clickedAt: { $ifNull: ['$clickedAt', '$$NOW'] }, clickCount: { $add: ['$clickCount', 1] } } }],
    { new: true }
  );
}

export async function recordSubmit(token) {
  return CampaignTarget.findOneAndUpdate(
    { tokenHash: sha256(token) },
    [{ $set: { submittedAt: { $ifNull: ['$submittedAt', '$$NOW'] }, clickedAt: { $ifNull: ['$clickedAt', '$$NOW'] } } }],
    { new: true }
  );
}

export async function lessonFor(token) {
  const target = await CampaignTarget.findOneAndUpdate(
    { tokenHash: sha256(token) },
    [{ $set: { lessonViewedAt: { $ifNull: ['$lessonViewedAt', '$$NOW'] } } }],
    { new: true }
  );
  if (!target) throw notFound('This link is not valid');
  const s = await PhishingScenario.findById(target.scenarioId).lean();
  return {
    submitted: Boolean(target.submittedAt),
    email: { fromName: s.fromName, fromAddress: s.fromAddress, replyTo: s.replyTo, subject: s.subject, auth: s.auth, parts: s.parts.map((p, i) => ({ id: `p${i}`, ...p })) },
    cues: s.cues,
    takeaway: s.takeaway,
  };
}

export async function inboxFor(userId) {
  const targets = await CampaignTarget.find({ userId }).select('+tokenEnc').sort({ deliveredAt: -1 }).lean();
  const scenarios = await PhishingScenario.find({ _id: { $in: targets.map((t) => t.scenarioId) } }).lean();
  const byId = new Map(scenarios.map((s) => [s._id.toString(), s]));
  return targets.map((t) => {
    const s = byId.get(t.scenarioId.toString());
    return {
      id: t._id,
      deliveredAt: t.deliveredAt,
      opened: Boolean(t.openedAt),
      reported: Boolean(t.reportedAt),
      clicked: Boolean(t.clickedAt),
      fromName: s?.fromName,
      fromAddress: s?.fromAddress,
      replyTo: s?.replyTo || null,
      subject: s?.subject,
      auth: s?.auth,
      // Display href is the scenario's (fake) destination, as a mail client would show on hover.
      // trackUrl is where the click actually goes, so the click can be measured.
      parts: (s?.parts ?? []).map((p, i) => ({ id: `p${i}`, kind: p.kind, text: p.text, href: p.href || null, trackUrl: p.kind === 'link' ? `/c/${decrypt(t.tokenEnc)}` : null })),
    };
  });
}

export async function markOpened(userId, targetId) {
  const t = await CampaignTarget.findOneAndUpdate(
    { _id: targetId, userId },
    [{ $set: { openedAt: { $ifNull: ['$openedAt', '$$NOW'] } } }],
    { new: true }
  );
  if (!t) throw notFound('Message not found');
  return t;
}

export async function reportMessage(userId, targetId) {
  const t = await CampaignTarget.findOneAndUpdate(
    { _id: targetId, userId },
    [{ $set: { reportedAt: { $ifNull: ['$reportedAt', '$$NOW'] }, openedAt: { $ifNull: ['$openedAt', '$$NOW'] } } }],
    { new: true }
  ).select('+tokenEnc');
  if (!t) throw notFound('Message not found');
  const s = await PhishingScenario.findById(t.scenarioId).select('isPhishing').lean();
  return { wasSimulation: s?.isPhishing ?? true, reportedBeforeClick: !t.clickedAt || t.reportedAt < t.clickedAt, lessonUrl: `/lesson/${decrypt(t.tokenEnc)}` };
}

export async function campaignMetrics(campaignId) {
  const campaign = await Campaign.findById(campaignId).populate('scenarioId', 'title isPhishing subject').lean();
  if (!campaign) throw notFound('Campaign not found');
  const targets = await CampaignTarget.find({ campaignId }).populate('userId', 'participantCode name').lean();
  const n = targets.length || 1;
  const count = (f) => targets.filter((t) => t[f]).length;
  const minutes = (from, to) => targets.filter((t) => t[from] && t[to]).map((t) => (new Date(t[to]) - new Date(t[from])) / 60000);
  return {
    campaign,
    funnel: {
      delivered: targets.length,
      opened: count('openedAt'),
      clicked: count('clickedAt'),
      submitted: count('submittedAt'),
      reported: count('reportedAt'),
      reportedBeforeClick: targets.filter((t) => t.reportedAt && (!t.clickedAt || t.reportedAt < t.clickedAt)).length,
    },
    rates: {
      clickRate: count('clickedAt') / n,
      submitRate: count('submittedAt') / n,
      reportRate: count('reportedAt') / n,
    },
    medianMinutesToClick: median(minutes('deliveredAt', 'clickedAt')) || null,
    medianMinutesToReport: median(minutes('deliveredAt', 'reportedAt')) || null,
    targets: targets.map((t) => ({
      participant: t.userId?.participantCode,
      name: t.userId?.name,
      openedAt: t.openedAt, clickedAt: t.clickedAt, submittedAt: t.submittedAt, reportedAt: t.reportedAt, clickCount: t.clickCount,
    })),
  };
}

export { decrypt };
