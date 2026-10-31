import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDB, closeTestDB, seedDemo, client } from '../helpers.js';
import PhishingScenario from '../../models/PhishingScenario.js';

before(connectTestDB);
after(closeTestDB);
beforeEach(seedDemo);

const STUDENT = { email: 'student@csas.edu', password: 'student-longpass-2026' };
async function loginStudent() {
  const c = await client().init();
  await c.post('/api/auth/login').send(STUDENT);
  return c;
}

test('phishing session never leaks the answer key to the client', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/phishing/sessions');
  assert.equal(start.status, 201);
  const next = await c.post(`/api/training/sessions/${start.body.sessionId}/next`);
  const item = next.body.item;
  assert.ok(item.id && item.parts);
  assert.equal(item.isPhishing, undefined, 'isPhishing must not be sent');
  assert.equal(item.cues, undefined, 'cues must not be sent');
  assert.ok(Array.isArray(item.targets), 'selectable targets are sent so the client cannot infer which are cues');
});

test('full phishing session completes, scores, and returns cue feedback', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/phishing/sessions');
  const sid = start.body.sessionId;
  let finished = false;
  let guard = 0;
  while (!finished && guard < 20) {
    guard += 1;
    const next = await c.post(`/api/training/sessions/${sid}/next`);
    if (next.body.done) break;
    const item = next.body.item;
    // Answer using the server's truth by reading the DB (test-only oracle).
    const truth = await PhishingScenario.findById(item.id).lean();
    const flags = truth.cues.map((cue) => cue.target);
    const res = await c.post(`/api/training/sessions/${sid}/answer`).send({
      itemId: item.id,
      answer: { verdict: truth.isPhishing ? 'phish' : 'legit', flags, confidence: 4 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.feedback.verdictCorrect, true);
    finished = res.body.finished;
    if (finished) {
      assert.ok(res.body.result.moduleScore >= 90, 'answering everything correctly should score high');
      assert.ok(res.body.result.xp >= 0);
    }
  }
  assert.ok(finished, 'session should finish');
});

test('answering the same item twice is rejected (no double counting)', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/phishing/sessions');
  const sid = start.body.sessionId;
  const next = await c.post(`/api/training/sessions/${sid}/next`);
  const id = next.body.item.id;
  const a1 = await c.post(`/api/training/sessions/${sid}/answer`).send({ itemId: id, answer: { verdict: 'phish', flags: [], confidence: 3 } });
  assert.equal(a1.status, 200);
  const a2 = await c.post(`/api/training/sessions/${sid}/answer`).send({ itemId: id, answer: { verdict: 'legit', flags: [], confidence: 3 } });
  assert.equal(a2.status, 409);
  assert.equal(a2.body.code, 'ALREADY_ANSWERED');
});

test('concurrent duplicate answers: exactly one succeeds (race condition fixed)', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/phishing/sessions');
  const sid = start.body.sessionId;
  const next = await c.post(`/api/training/sessions/${sid}/next`);
  const id = next.body.item.id;
  const payload = { itemId: id, answer: { verdict: 'phish', flags: [], confidence: 3 } };
  const results = await Promise.all([
    c.post(`/api/training/sessions/${sid}/answer`).send(payload),
    c.post(`/api/training/sessions/${sid}/answer`).send(payload),
    c.post(`/api/training/sessions/${sid}/answer`).send(payload),
  ]);
  const ok = results.filter((r) => r.status === 200).length;
  const dup = results.filter((r) => r.status === 409).length;
  assert.equal(ok, 1, 'only one concurrent write should win');
  assert.equal(dup, 2);
});

test('cannot answer an item that was not served in this session', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/phishing/sessions');
  const other = await PhishingScenario.findOne({ pool: 'assessment' }).lean();
  const res = await c.post(`/api/training/sessions/${start.body.sessionId}/answer`).send({ itemId: other._id.toString(), answer: { verdict: 'phish', flags: [], confidence: 3 } });
  assert.equal(res.status, 400);
});

test('quiz is server-timed: an answer after the time limit is marked timed out', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/quiz/sessions');
  assert.equal(start.body.timeLimitSec, 30);
  const sid = start.body.sessionId;
  const next = await c.post(`/api/training/sessions/${sid}/next`);
  const id = next.body.item.id;
  // Backdate the served time so the server sees the answer as late.
  const TrainingSession = (await import('../../models/TrainingSession.js')).default;
  await TrainingSession.updateOne({ _id: sid }, { $set: { 'served.0.servedAt': new Date(Date.now() - 60000) } });
  const res = await c.post(`/api/training/sessions/${sid}/answer`).send({ itemId: id, answer: { selectedIndex: 0, confidence: 3 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.feedback.timedOut, true);
  assert.equal(res.body.feedback.correct, false, 'a timed-out answer cannot be correct');
});

test('serving the next item twice does not reset the timer (idempotent)', async () => {
  const c = await loginStudent();
  const start = await c.post('/api/training/quiz/sessions');
  const sid = start.body.sessionId;
  const a = await c.post(`/api/training/sessions/${sid}/next`);
  const b = await c.post(`/api/training/sessions/${sid}/next`);
  assert.equal(a.body.item.id, b.body.item.id);
  assert.equal(new Date(a.body.servedAt).getTime(), new Date(b.body.servedAt).getTime());
});
