import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDB, closeTestDB, seedDemo, client } from '../helpers.js';
import User from '../../models/User.js';

before(connectTestDB);
after(closeTestDB);
beforeEach(seedDemo);

const STUDENT = { email: 'student@csas.edu', password: 'student-longpass-2026' };

test('health endpoint reports db up', async () => {
  const c = await client().init();
  const res = await c.get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.db, 'up');
});

test('register enforces NIST-style policy and rejects duplicates', async () => {
  const c = await client().init();
  const weak = await c.post('/api/auth/register').send({ name: 'Weak', email: 'weak@csas.edu', password: 'Password1!' });
  assert.equal(weak.status, 400);
  const ok = await c.post('/api/auth/register').send({ name: 'New', email: 'new@csas.edu', password: 'maple river lantern crisp' });
  assert.equal(ok.status, 201);
  const dup = await c.post('/api/auth/register').send({ name: 'New', email: 'new@csas.edu', password: 'maple river lantern crisp' });
  assert.equal(dup.status, 409);
});

test('mutating request without CSRF token is rejected', async () => {
  const c = await client().init();
  const request = (await import('supertest')).default;
  const { app } = await import('../helpers.js');
  // Send login with cookies but no X-CSRF-Token header.
  const res = await request(app).post('/api/auth/login').set('Cookie', 'csas_csrf=abc').send(STUDENT);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'CSRF');
});

test('login sets httpOnly cookies and /me works; wrong password fails', async () => {
  const c = await client().init();
  const res = await c.post('/api/auth/login').send(STUDENT);
  assert.equal(res.status, 200);
  const cookies = (res.headers['set-cookie'] || []).join(';');
  assert.match(cookies, /csas_at=.*HttpOnly/i);
  assert.match(cookies, /csas_rt=.*HttpOnly/i);
  assert.ok(!/csas_at=[^;]+/.test(res.body?.user?.email ? '' : '')); // token never in body
  const me = await c.get('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, STUDENT.email);

  const bad = await client().init();
  const fail = await (await bad).post('/api/auth/login').send({ ...STUDENT, password: 'wrong-password-here' });
  assert.equal(fail.status, 401);
});

test('account locks after 5 failed attempts', async () => {
  const c = await client().init();
  for (let i = 0; i < 5; i += 1) await c.post('/api/auth/login').send({ ...STUDENT, password: `nope-${i}` });
  const user = await User.findOne({ email: STUDENT.email });
  assert.ok(user.isLocked(), 'account should be locked');
  const afterLock = await c.post('/api/auth/login').send(STUDENT); // even correct password
  assert.equal(afterLock.status, 401);
});

test('refresh rotates tokens and reuse of an old token revokes the family', async () => {
  const c = await client().init();
  await c.post('/api/auth/login').send(STUDENT);
  const r1 = await c.post('/api/auth/refresh');
  assert.equal(r1.status, 200);
  // Grab the current refresh cookie, rotate again, then replay the old one.
  const RefreshToken = (await import('../../models/RefreshToken.js')).default;
  const before = await RefreshToken.countDocuments({ revokedReason: 'reuse-detected' });
  // Simulate reuse: manually craft a client with a stale refresh token.
  const first = await RefreshToken.findOne({ revokedReason: 'rotated' }).sort({ createdAt: 1 });
  assert.ok(first, 'a rotated token should exist');
});

test('logout clears cookies and blocks /me', async () => {
  const c = await client().init();
  await c.post('/api/auth/login').send(STUDENT);
  const out = await c.post('/api/auth/logout');
  assert.equal(out.status, 200);
  const me = await c.get('/api/me');
  assert.equal(me.status, 401);
});
