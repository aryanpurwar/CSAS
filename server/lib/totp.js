import crypto from 'node:crypto';

// RFC 6238 TOTP (HMAC-SHA1, 30-second step, 6 digits), compatible with
// Google Authenticator, Microsoft Authenticator, Authy, etc.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = str.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateSecret = () => base32Encode(crypto.randomBytes(20));

export function hotp(secret, counter, digits = 6) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return code.toString().padStart(digits, '0');
}

export const timeStep = (ms = Date.now(), step = 30) => Math.floor(ms / 1000 / step);

// Accepts the current step +/- `window` steps to tolerate clock drift.
// Returns the matched step so callers can reject replays of the same code.
export function verifyTotp(secret, code, { window = 1, now = Date.now(), lastUsedStep = -1 } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const current = timeStep(now);
  for (let w = -window; w <= window; w += 1) {
    const step = current + w;
    if (step <= lastUsedStep) continue;
    const expected = hotp(secret, step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(code)))) return step;
  }
  return null;
}

export const otpauthUri = (secret, account, issuer = 'Cybersecurity Awareness System') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
