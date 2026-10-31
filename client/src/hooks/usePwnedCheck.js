import { useEffect, useState } from 'react';

// Checks a password against the Have I Been Pwned breach corpus using k-anonymity:
// we SHA-1 the password in the browser, send only the first 5 hex characters to the
// range API, and match the suffix locally. The full password and full hash never leave
// the device. This is a protocol the viva can dig into, so it is worth doing properly.
async function sha1Hex(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function usePwnedCheck(password, { debounceMs = 450 } = {}) {
  const [state, setState] = useState({ status: 'idle', count: 0 }); // idle | checking | pwned | clean | error

  useEffect(() => {
    if (!password) { setState({ status: 'idle', count: 0 }); return undefined; }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'checking' }));
    const id = setTimeout(async () => {
      try {
        const hash = await sha1Hex(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' } });
        if (!res.ok) throw new Error('range request failed');
        const text = await res.text();
        if (cancelled) return;
        const match = text.split('\n').find((line) => line.split(':')[0].trim() === suffix);
        const count = match ? parseInt(match.split(':')[1], 10) : 0;
        setState({ status: count > 0 ? 'pwned' : 'clean', count });
      } catch {
        if (!cancelled) setState({ status: 'error', count: 0 });
      }
    }, debounceMs);
    return () => { cancelled = true; clearTimeout(id); };
  }, [password, debounceMs]);

  return state;
}
