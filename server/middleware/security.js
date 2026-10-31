import helmet from 'helmet';
import { isProd } from '../config/env.js';

// Content Security Policy: only our own origin may supply scripts and styles.
// connect-src allows the Have I Been Pwned range API, which the browser calls directly
// from the Password Lab (k-anonymity: only a 5-character hash prefix is sent).
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"], // React inline style attributes (progress-bar widths)
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.pwnedpasswords.com'],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  strictTransportSecurity: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: false,
});

export function permissionsPolicy(_req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
}

// Responses from the API must never be cached by the browser or a proxy.
export function noStore(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
