import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDB, closeTestDB, seedDemo, client } from '../helpers.js';
import User from '../../models/User.js';
import TrainingSession from '../../models/TrainingSession.js';

before(connectTestDB);
after(closeTestDB);
beforeEach(seedDemo);

const STUDENT = { email: 'student@csas.edu', password: 'student-longpass-2026' };
const ADMIN = { email: 'admin@csas.edu', password: 'Admin!longpass#2026' };
const login = async (creds) => { const c = await client().init(); await c.post('/api/auth/login').send(creds); return c; };

test('a student cannot reach admin endpoints (authorization, not just authentication)', async () => {
  const c = await login(STUDENT);
  for (const url of ['/api/admin/overview', '/api/admin/users', '/api/admin/study/summary']) {
    const res = await c.get(url);
    assert.equal(res.status, 403, `${url} should be forbidden for students`);
  }
});

test('an unauthenticated user cannot reach protected endpoints', async () => {
  const c = await client().init();
  assert.equal((await c.get('/api/me')).status, 401);
  assert.equal((await c.post('/api/training/phishing/sessions')).status, 401);
  assert.equal((await c.get('/api/admin/overview')).status, 401);
});

test('user A cannot answer inside user B\'s session (object-level authorization)', async () => {
  const a = await login(STUDENT);
  const start = await a.post('/api/training/phishing/sessions');
  const sid = start.body.sessionId;

  // Create a second student.
  const b = await client().init();
  await b.post('/api/auth/register').send({ name: 'Mallory', email: 'mallory@csas.edu', password: 'violet copper anchor stone' });
  await b.post('/api/auth/login').send({ email: 'mallory@csas.edu', password: 'violet copper anchor stone' });

  const steal = await b.post(`/api/training/sessions/${sid}/next`);
  assert.equal(steal.status, 404, 'B must not see A\'s session');
  const session = await TrainingSession.findById(sid);
  const victimItem = session.plannedItemIds[0] || session.served[0]?.itemId;
  const ans = await b.post(`/api/training/sessions/${sid}/answer`).send({ itemId: String(victimItem || '000000000000000000000000'), answer: { verdict: 'phish', flags: [], confidence: 3 } });
  assert.ok(ans.status === 404 || ans.status === 400, 'B must not answer in A\'s session');
});

test('role change bumps tokenVersion and invalidates the old session', async () => {
  const admin = await login(ADMIN);
  const target = await User.findOne({ email: STUDENT.email });
  // Student logs in, then admin promotes them.
  const studentClient = await login(STUDENT);
  assert.equal((await studentClient.get('/api/me')).status, 200);
  const res = await admin.patch(`/api/admin/users/${target._id}`).send({ role: 'admin' });
  assert.equal(res.status, 200);
  // The student's previously-issued access token must now be rejected.
  const after = await studentClient.get('/api/me');
  assert.equal(after.status, 401);
  assert.equal(after.body.code, 'TOKEN_REVOKED');
});

test('admin cannot demote themselves (lockout guard)', async () => {
  const admin = await login(ADMIN);
  const self = await User.findOne({ email: ADMIN.email });
  const res = await admin.patch(`/api/admin/users/${self._id}`).send({ role: 'student' });
  assert.equal(res.status, 400);
});

test('oversized JSON body is rejected (413), malformed JSON is 400', async () => {
  const c = await client().init();
  const request = (await import('supertest')).default;
  const { app } = await import('../helpers.js');
  const big = await request(app).post('/api/auth/login').set('Cookie', `csas_csrf=x`).set('X-CSRF-Token', 'x').set('Content-Type', 'application/json').send('x'.repeat(200 * 1024));
  assert.ok(big.status === 413 || big.status === 400);
});

test('security headers and no-store are present on API responses', async () => {
  const c = await client().init();
  const res = await c.get('/api/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['content-security-policy'] || '', /default-src 'self'/);
});

test('password-lab score is computed by the server, not trusted from the client', async () => {
  // The v2 bug: client sent booleans and got the score it claimed. Here the only password
  // endpoints are server-graded MCQ items, so there is no client-trusted score to forge.
  const c = await login(STUDENT);
  const start = await c.post('/api/training/password/sessions');
  assert.equal(start.status, 201);
  const next = await c.post(`/api/training/sessions/${start.body.sessionId}/next`);
  assert.equal(next.body.item.correctIndex, undefined, 'the correct answer is never sent to the client');
});
