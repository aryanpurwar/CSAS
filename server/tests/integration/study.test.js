import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDB, closeTestDB, seedDemo, client } from '../helpers.js';
import User from '../../models/User.js';
import CampaignTarget from '../../models/CampaignTarget.js';
import PhishingScenario from '../../models/PhishingScenario.js';

before(connectTestDB);
after(closeTestDB);
beforeEach(seedDemo);

const ADMIN = { email: 'admin@csas.edu', password: 'Admin!longpass#2026' };
const login = async (creds) => { const c = await client().init(); await c.post('/api/auth/login').send(creds); return c; };

async function newStudent(email) {
  const c = await client().init();
  await c.post('/api/auth/register').send({ name: email.split('@')[0], email, password: 'amber ridge lantern meadow' });
  await c.post('/api/auth/login').send({ email, password: 'amber ridge lantern meadow' });
  return c;
}

test('consent assigns a study group and is required before assessments', async () => {
  const c = await newStudent('p1@csas.edu');
  const locked = await c.post('/api/study/assessments/pre/start');
  assert.equal(locked.status, 403); // not enrolled
  const consent = await c.post('/api/study/consent').send({ study: true, campaigns: true });
  assert.equal(consent.status, 200);
  assert.ok(['adaptive', 'control'].includes(consent.body.studyGroup));
  const pre = await c.post('/api/study/assessments/pre/start');
  assert.equal(pre.status, 201);
  assert.ok(['A', 'B', 'C'].includes(pre.body.form));
});

test('post-test is locked until pre-test and minimum training are done', async () => {
  const c = await newStudent('p2@csas.edu');
  await c.post('/api/study/consent').send({ study: true, campaigns: false });
  const post = await c.post('/api/study/assessments/post/start');
  assert.equal(post.status, 403);
  assert.equal(post.body.code, 'ASSESSMENT_LOCKED');
});

test('SUS questionnaire scores and prevents double submission', async () => {
  const c = await newStudent('p3@csas.edu');
  await c.post('/api/study/consent').send({ study: true, campaigns: false });
  const res = await c.post('/api/study/sus').send({ answers: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2] });
  assert.equal(res.status, 201);
  assert.equal(res.body.score, 75);
  const again = await c.post('/api/study/sus').send({ answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] });
  assert.equal(again.status, 409);
});

test('group assignment stays roughly balanced', async () => {
  for (let i = 0; i < 8; i += 1) {
    const c = await newStudent(`bal${i}@csas.edu`);
    await c.post('/api/study/consent').send({ study: true, campaigns: false });
  }
  const adaptive = await User.countDocuments({ studyGroup: 'adaptive' });
  const control = await User.countDocuments({ studyGroup: 'control' });
  assert.ok(Math.abs(adaptive - control) <= 1, `groups should be balanced, got ${adaptive}/${control}`);
});

test('campaign only targets consenting users and the click/report funnel is tracked', async () => {
  const consenting = await newStudent('willing@csas.edu');
  await consenting.post('/api/study/consent').send({ study: true, campaigns: true });
  const refuser = await newStudent('norequest@csas.edu');
  await refuser.post('/api/study/consent').send({ study: true, campaigns: false });

  const admin = await login(ADMIN);
  const list = await admin.get('/api/admin/campaigns');
  const template = list.body.templates.find((t) => t.isPhishing);
  const willing = await User.findOne({ email: 'willing@csas.edu' });
  const refusing = await User.findOne({ email: 'norequest@csas.edu' });

  const launch = await admin.post('/api/admin/campaigns').send({ name: 'Test drive', scenarioId: template._id, userIds: [willing._id, refusing._id], sendEmail: false });
  assert.equal(launch.status, 201);
  assert.equal(launch.body.targeted, 1, 'only the consenting user is targeted');
  assert.equal(launch.body.skipped, 1);

  // Consenting user sees it in their inbox and reports it.
  const inbox = await consenting.get('/api/inbox');
  assert.equal(inbox.body.length, 1);
  const msg = inbox.body[0];
  assert.ok(msg.parts.some((p) => p.trackUrl), 'a tracked link is present');
  const report = await consenting.post(`/api/inbox/${msg.id}/report`);
  assert.equal(report.status, 200);
  assert.equal(report.body.reportedBeforeClick, true);

  const metrics = await admin.get(`/api/admin/campaigns/${launch.body.id}`);
  assert.equal(metrics.body.funnel.delivered, 1);
  assert.equal(metrics.body.funnel.reported, 1);
});

test('clicking a tracked link records the click and shows a lesson; submit records no data', async () => {
  const student = await newStudent('clicker@csas.edu');
  await student.post('/api/study/consent').send({ study: true, campaigns: true });
  const admin = await login(ADMIN);
  const list = await admin.get('/api/admin/campaigns');
  const template = list.body.templates.find((t) => t.isPhishing);
  const u = await User.findOne({ email: 'clicker@csas.edu' });
  const launch = await admin.post('/api/admin/campaigns').send({ name: 'Click test', scenarioId: template._id, userIds: [u._id], sendEmail: false });

  const target = await CampaignTarget.findOne({ campaignId: launch.body.id }).select('+tokenEnc');
  const { decrypt } = await import('../../services/campaignService.js');
  const token = decrypt(target.tokenEnc);

  const c = await client().init();
  const lesson = await c.get(`/api/track/${token}/lesson`);
  assert.equal(lesson.status, 200);
  assert.ok(lesson.body.cues.length > 0 || lesson.body.email);

  const submit = await c.post(`/api/track/${token}/submit`).send({});
  assert.equal(submit.status, 200);
  const after = await CampaignTarget.findById(target._id);
  assert.ok(after.submittedAt, 'submission recorded');
  // No credential fields exist anywhere on the target document.
  assert.equal(after.toObject().password, undefined);
});

test('admin analytics overview and CSV export work', async () => {
  const admin = await login(ADMIN);
  const overview = await admin.get('/api/admin/overview');
  assert.equal(overview.status, 200);
  assert.ok(overview.body.content.phishing > 0);
  assert.ok(Array.isArray(overview.body.cueDetection));
  const csv = await admin.get('/api/admin/study/export?type=responses');
  assert.equal(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text.split('\n')[0], /participant,group/);
});
