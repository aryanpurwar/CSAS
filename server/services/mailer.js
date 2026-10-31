import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// SMTP is optional. In the Docker setup it points at Mailpit, a local mail catcher, so
// simulated phishing emails never leave the machine. Without SMTP, campaigns are delivered
// only to the in-app inbox.
let transport = null;
export function getTransport() {
  if (!env.SMTP_HOST) return null;
  if (!transport) transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false, ignoreTLS: true });
  return transport;
}

export const smtpEnabled = () => Boolean(env.SMTP_HOST);

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderCampaignEmail(scenario, trackedUrl) {
  const html = scenario.parts.map((p) => {
    if (p.kind === 'link') return `<p><a href="${escapeHtml(trackedUrl)}">${escapeHtml(p.text)}</a></p>`;
    if (p.kind === 'attachment') return `<p>📎 ${escapeHtml(p.text)}</p>`;
    return `<p>${escapeHtml(p.text)}</p>`;
  }).join('\n');
  const text = scenario.parts.map((p) => (p.kind === 'link' ? `${p.text}: ${trackedUrl}` : p.text)).join('\n\n');
  const footer = '<hr><p style="font-size:11px;color:#666">Simulated phishing exercise run by the Cybersecurity Awareness System research study. You consented to receive these. Contact your study coordinator to opt out.</p>';
  return { subject: scenario.subject, html: html + footer, text };
}

export async function sendCampaignEmail({ to, scenario, trackedUrl }) {
  const t = getTransport();
  if (!t) return false;
  const { subject, html, text } = renderCampaignEmail(scenario, trackedUrl);
  try {
    await t.sendMail({ from: `"${scenario.fromName}" <${env.SMTP_FROM}>`, to, subject, html, text, headers: { 'X-CSAS-Simulation': 'true' } });
    return true;
  } catch (err) {
    logger.warn({ err: err.message }, 'campaign email failed');
    return false;
  }
}
