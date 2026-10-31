import express from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { z } from 'zod';
import User from '../models/User.js';
import { ah, badRequest, conflict, unauthorized } from '../lib/http.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { checkAccountPassword } from '../lib/passwordPolicy.js';
import { isValidTimeZone } from '../lib/time.js';
import { encrypt, decrypt, participantCode } from '../lib/crypto.js';
import { generateSecret, otpauthUri, verifyTotp } from '../lib/totp.js';
import { audit } from '../services/auditService.js';
import { buildProfile } from '../services/profileService.js';
import {
  COOKIE, issueSession, clearAuthCookies, rotateRefreshToken, revokeRefreshToken, revokeAllForUser,
  signMfaChallenge, verifyMfaChallenge, setMfaCookie,
} from '../services/tokenService.js';
import { env } from '../config/env.js';

const router = express.Router();

export const BCRYPT_COST = env.NODE_ENV === 'test' ? 4 : 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// Comparing against a dummy hash when the email is unknown keeps response time the same,
// so attackers cannot discover which emails are registered by timing the login endpoint.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_COST);

const authLimiter = rateLimit({ name: 'auth', windowSec: 15 * 60, max: env.NODE_ENV === 'test' ? 1000 : 40 });

const email = z.string().trim().toLowerCase().email().max(160);

router.get('/csrf', (_req, res) => res.json({ ok: true }));

router.post(
  '/register',
  authLimiter,
  validate({ body: z.object({ name: z.string().trim().min(2).max(80), email, password: z.string().max(200), timezone: z.string().max(64).optional() }) }),
  ah(async (req, res) => {
    const { name, email: addr, password } = req.body;
    const policy = checkAccountPassword(password, [name, addr, addr.split('@')[0], 'cybersecurity', 'awareness']);
    if (!policy.ok) throw badRequest(policy.message);
    const timezone = isValidTimeZone(req.body.timezone) ? req.body.timezone : 'Asia/Kolkata';
    try {
      const user = await User.create({ name, email: addr, passwordHash: await bcrypt.hash(password, BCRYPT_COST), timezone, participantCode: participantCode() });
      await audit(req, 'auth.register', { actor: user, targetType: 'user', targetId: user._id });
    } catch (err) {
      if (err?.code === 11000) throw conflict('An account with this email already exists. Sign in instead.', 'EMAIL_TAKEN');
      throw err;
    }
    res.status(201).json({ message: 'Account created. Sign in to continue.' });
  })
);

async function registerFailure(req, user, reason) {
  if (!user) {
    await audit(req, 'auth.login', { actor: null, outcome: 'failure', meta: { email: req.body.email, reason } });
    return;
  }
  const updated = await User.findOneAndUpdate({ _id: user._id }, { $inc: { 'security.failedLogins': 1 } }, { new: true });
  if (updated.security.failedLogins >= MAX_FAILED_LOGINS) {
    await User.updateOne({ _id: user._id }, { $set: { 'security.lockUntil': new Date(Date.now() + LOCK_MINUTES * 60000), 'security.failedLogins': 0 } });
    await audit(req, 'auth.lockout', { actor: user, outcome: 'failure', meta: { minutes: LOCK_MINUTES } });
  }
  await audit(req, 'auth.login', { actor: user, outcome: 'failure', meta: { reason } });
}

const GENERIC_FAIL = 'Email or password is incorrect. Accounts are paused for 15 minutes after 5 failed attempts.';

router.post(
  '/login',
  authLimiter,
  validate({ body: z.object({ email, password: z.string().min(1).max(200) }) }),
  ah(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash +security.totpSecretEnc');
    const match = await bcrypt.compare(req.body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || user.isLocked()) {
      await registerFailure(req, user && !user.isLocked() ? user : null, user ? 'locked' : 'unknown-email');
      throw unauthorized(GENERIC_FAIL, 'INVALID_CREDENTIALS');
    }
    if (!match) {
      await registerFailure(req, user, 'bad-password');
      throw unauthorized(GENERIC_FAIL, 'INVALID_CREDENTIALS');
    }
    if (user.security.totpEnabled) {
      setMfaCookie(res, signMfaChallenge(user));
      await audit(req, 'auth.login.password-ok', { actor: user, meta: { mfa: 'pending' } });
      return res.json({ mfaRequired: true });
    }
    await User.updateOne({ _id: user._id }, { $set: { 'security.failedLogins': 0, lastLoginAt: new Date() } });
    await issueSession(res, user, req);
    await audit(req, 'auth.login', { actor: user });
    res.json({ user: await buildProfile(user) });
  })
);

router.post(
  '/mfa/verify',
  authLimiter,
  validate({ body: z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') }) }),
  ah(async (req, res) => {
    let payload;
    try {
      payload = verifyMfaChallenge(req.cookies?.[COOKIE.mfa]);
    } catch {
      throw unauthorized('Your sign-in attempt expired. Enter your password again.', 'MFA_EXPIRED');
    }
    const user = await User.findById(payload.sub).select('+security.totpSecretEnc');
    if (!user || user.isLocked() || !user.security.totpEnabled) throw unauthorized(GENERIC_FAIL, 'INVALID_CREDENTIALS');
    const step = verifyTotp(decrypt(user.security.totpSecretEnc), req.body.code, { lastUsedStep: user.security.totpLastStep });
    if (step === null) {
      await registerFailure(req, user, 'bad-totp');
      throw unauthorized('That code is not valid. Check your authenticator app and try again.', 'INVALID_TOTP');
    }
    // Recording the step prevents the same code from being replayed within its window.
    await User.updateOne({ _id: user._id }, { $set: { 'security.totpLastStep': step, 'security.failedLogins': 0, lastLoginAt: new Date() } });
    res.clearCookie(COOKIE.mfa, { path: '/api/auth' });
    await issueSession(res, user, req);
    await audit(req, 'auth.login', { actor: user, meta: { mfa: true } });
    res.json({ user: await buildProfile(user) });
  })
);

router.post(
  '/refresh',
  ah(async (req, res) => {
    const result = await rotateRefreshToken(req.cookies?.[COOKIE.refresh]);
    if (result?.race) return res.status(409).json({ message: 'Session refresh already in progress', code: 'REFRESH_RACE' });
    if (result?.reuse) {
      const victim = await User.findById(result.userId);
      await audit(req, 'auth.refresh.reuse-detected', { actor: victim, outcome: 'failure', meta: { family: result.family } });
      clearAuthCookies(res);
      throw unauthorized('Your session was ended for security reasons. Sign in again.', 'REFRESH_REUSE');
    }
    if (!result?.ok) {
      clearAuthCookies(res);
      throw unauthorized('Your session has ended. Sign in again.', 'REFRESH_INVALID');
    }
    const user = await User.findById(result.userId);
    if (!user || user.isLocked()) {
      clearAuthCookies(res);
      throw unauthorized('Your session has ended. Sign in again.', 'REFRESH_INVALID');
    }
    await issueSession(res, user, req, result.family);
    res.json({ ok: true });
  })
);

router.post(
  '/logout',
  ah(async (req, res) => {
    await revokeRefreshToken(req.cookies?.[COOKIE.refresh], 'logout');
    clearAuthCookies(res);
    res.json({ ok: true });
  })
);

router.post(
  '/logout-all',
  requireAuth,
  ah(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $inc: { 'security.tokenVersion': 1 } });
    await revokeAllForUser(req.user._id);
    await audit(req, 'auth.logout-all');
    clearAuthCookies(res);
    res.json({ ok: true });
  })
);

router.get('/me', requireAuth, ah(async (req, res) => res.json(await buildProfile(req.user))));

// ---------- TOTP two-factor enrolment ----------

router.post(
  '/mfa/setup',
  requireAuth,
  ah(async (req, res) => {
    if (req.user.security.totpEnabled) throw conflict('Two-factor authentication is already on.');
    const secret = generateSecret();
    await User.updateOne({ _id: req.user._id }, { $set: { 'security.totpPendingEnc': encrypt(secret) } });
    const uri = otpauthUri(secret, req.user.email);
    res.json({ secret, otpauthUri: uri, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
  })
);

router.post(
  '/mfa/enable',
  requireAuth,
  validate({ body: z.object({ code: z.string().trim().regex(/^\d{6}$/) }) }),
  ah(async (req, res) => {
    const user = await User.findById(req.user._id).select('+security.totpPendingEnc');
    if (!user.security.totpPendingEnc) throw badRequest('Start two-factor setup first.');
    const secret = decrypt(user.security.totpPendingEnc);
    const step = verifyTotp(secret, req.body.code);
    if (step === null) throw badRequest('That code does not match. Check the time on your phone and try again.');
    await User.updateOne(
      { _id: user._id },
      { $set: { 'security.totpEnabled': true, 'security.totpSecretEnc': encrypt(secret), 'security.totpLastStep': step }, $unset: { 'security.totpPendingEnc': 1 } }
    );
    await audit(req, 'auth.mfa.enable');
    res.json({ ok: true });
  })
);

router.post(
  '/mfa/disable',
  requireAuth,
  validate({ body: z.object({ password: z.string().min(1).max(200), code: z.string().trim().regex(/^\d{6}$/) }) }),
  ah(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash +security.totpSecretEnc');
    const okPw = await bcrypt.compare(req.body.password, user.passwordHash);
    const step = user.security.totpEnabled ? verifyTotp(decrypt(user.security.totpSecretEnc), req.body.code, { lastUsedStep: user.security.totpLastStep }) : null;
    if (!okPw || step === null) {
      await audit(req, 'auth.mfa.disable', { outcome: 'failure' });
      throw badRequest('Password or code is incorrect.');
    }
    await User.updateOne({ _id: user._id }, { $set: { 'security.totpEnabled': false }, $unset: { 'security.totpSecretEnc': 1 } });
    await audit(req, 'auth.mfa.disable');
    res.json({ ok: true });
  })
);

export default router;
