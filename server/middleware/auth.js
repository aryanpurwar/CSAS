import User from '../models/User.js';
import { COOKIE, verifyAccessToken } from '../services/tokenService.js';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from '../lib/http.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE.access];
    if (!token) return next(unauthorized());
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return next(unauthorized('Your session has expired', err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED'));
    }
    const user = await User.findById(payload.sub);
    // tokenVersion lets "sign out everywhere" and role changes invalidate live access tokens.
    if (!user || (user.security?.tokenVersion ?? 0) !== payload.tv) return next(unauthorized('Your session is no longer valid', 'TOKEN_REVOKED'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) return next(forbidden('Admin access required'));
  if (role === 'admin' && env.REQUIRE_ADMIN_MFA && !req.user.security?.totpEnabled) {
    return next(forbidden('Set up two-factor authentication before using admin tools', 'MFA_SETUP_REQUIRED'));
  }
  next();
};

export const requireAdmin = [requireAuth, requireRole('admin')];
