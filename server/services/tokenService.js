import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { env, isProd } from '../config/env.js';
import { randomToken, sha256 } from '../lib/crypto.js';

export const COOKIE = { access: 'csas_at', refresh: 'csas_rt', csrf: 'csas_csrf', mfa: 'csas_mfa' };

const base = { httpOnly: true, secure: isProd, sameSite: 'strict' };

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.security?.tokenVersion ?? 0 }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SEC,
    algorithm: 'HS256',
    audience: 'csas-api',
    issuer: 'csas',
  });
}

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], audience: 'csas-api', issuer: 'csas' });

export function signMfaChallenge(user) {
  return jwt.sign({ sub: user._id.toString(), purpose: 'mfa' }, env.JWT_SECRET, { expiresIn: 300, algorithm: 'HS256', audience: 'csas-mfa', issuer: 'csas' });
}

export const verifyMfaChallenge = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], audience: 'csas-mfa', issuer: 'csas' });

export async function createRefreshToken(user, req, family = randomToken(12)) {
  const token = randomToken(32);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(token),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000),
    userAgent: req.get('user-agent')?.slice(0, 200),
    ip: req.ip,
  });
  return token;
}

export async function issueSession(res, user, req, family) {
  const access = signAccessToken(user);
  const refresh = await createRefreshToken(user, req, family);
  res.cookie(COOKIE.access, access, { ...base, path: '/', maxAge: env.ACCESS_TOKEN_TTL_SEC * 1000 });
  res.cookie(COOKIE.refresh, refresh, { ...base, path: '/api/auth', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000 });
}

export function setMfaCookie(res, token) {
  res.cookie(COOKIE.mfa, token, { ...base, path: '/api/auth', maxAge: 300 * 1000 });
}

export function clearAuthCookies(res) {
  res.clearCookie(COOKIE.access, { ...base, path: '/' });
  res.clearCookie(COOKIE.refresh, { ...base, path: '/api/auth' });
  res.clearCookie(COOKIE.mfa, { ...base, path: '/api/auth' });
}

export const csrfCookieOptions = { httpOnly: false, secure: isProd, sameSite: 'strict', path: '/' };

// Rotate a refresh token. Outcomes:
//   { ok, userId, family }       normal rotation
//   { reuse: true, userId }      a rotated token was replayed: revoke the family
//   { race: true }               rotated moments ago by a parallel tab: not an attack
//   null                         unknown / expired
export const REUSE_GRACE_MS = 10_000;

export async function rotateRefreshToken(rawToken) {
  if (!rawToken) return null;
  const tokenHash = sha256(rawToken);
  // Atomic claim: only one request can flip revokedAt from null for a given token.
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date(), revokedReason: 'rotated' } },
    { new: true }
  );
  if (claimed) return { ok: true, userId: claimed.userId, family: claimed.family };

  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing) return null;
  if (existing.revokedReason === 'rotated' && Date.now() - existing.revokedAt.getTime() < REUSE_GRACE_MS) return { race: true };
  if (existing.revokedReason === 'rotated') {
    await RefreshToken.updateMany({ family: existing.family, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'reuse-detected' } });
    return { reuse: true, userId: existing.userId, family: existing.family };
  }
  return null;
}

export async function revokeRefreshToken(rawToken, reason = 'logout') {
  if (!rawToken) return;
  await RefreshToken.updateOne({ tokenHash: sha256(rawToken), revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } });
}

export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'logout-all' } });
}
