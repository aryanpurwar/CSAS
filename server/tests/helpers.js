import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { runSeed } from '../seed/seed.js';

export const app = createApp();

export async function connectTestDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/csas_test';
  await mongoose.connect(uri);
  return uri;
}
export const closeTestDB = () => mongoose.disconnect();
export const seedDemo = () => runSeed({ demo: true });

// Thin wrapper around supertest that carries cookies and the CSRF token across requests,
// so tests exercise the real cookie/CSRF flow rather than bypassing it.
import request from 'supertest';
export function client() {
  const jar = [];
  let csrf = null;
  const cookieHeader = () => jar.join('; ');
  const capture = (res) => {
    const set = res.headers['set-cookie'] || [];
    for (const c of set) {
      const [pair] = c.split(';');
      const [name] = pair.split('=');
      const idx = jar.findIndex((j) => j.startsWith(`${name}=`));
      if (pair.endsWith('=') ) { if (idx >= 0) jar.splice(idx, 1); }
      else if (idx >= 0) jar[idx] = pair; else jar.push(pair);
      if (name === 'csas_csrf') csrf = pair.split('=')[1];
    }
    return res;
  };
  const send = (method, url) => {
    const req = request(app)[method](url).set('Cookie', cookieHeader());
    if (csrf) req.set('X-CSRF-Token', csrf);
    const originalThen = req.then.bind(req);
    req.then = (resolve, reject) => originalThen((res) => resolve(capture(res)), reject);
    return req;
  };
  return {
    get: (u) => send('get', u),
    post: (u) => send('post', u),
    patch: (u) => send('patch', u),
    del: (u) => send('delete', u),
    async init() { await send('get', '/api/auth/csrf'); return this; },
  };
}
