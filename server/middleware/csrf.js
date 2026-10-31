import { COOKIE, csrfCookieOptions } from '../services/tokenService.js';
import { randomToken, safeEqual } from '../lib/crypto.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit cookie CSRF protection. A cross-site page cannot read our cookie, so it
// cannot copy it into the X-CSRF-Token header. Combined with SameSite=Strict cookies,
// this is defence in depth.
export function csrfProtection(req, res, next) {
  let token = req.cookies?.[COOKIE.csrf];
  if (!token) {
    token = randomToken(24);
    res.cookie(COOKIE.csrf, token, csrfCookieOptions);
    req.cookies[COOKIE.csrf] = token;
  }
  if (SAFE.has(req.method)) return next();
  const header = req.get('x-csrf-token');
  if (!header || !safeEqual(header, token)) {
    return res.status(403).json({ message: 'Security check failed. Refresh the page and try again.', code: 'CSRF' });
  }
  next();
}
