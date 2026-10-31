import { test } from 'node:test';
import assert from 'node:assert/strict';
import phishingTraining from '../../seed/content/phishingTraining.js';
import phishingAssessment from '../../seed/content/phishingAssessment.js';
import phishingCampaign from '../../seed/content/phishingCampaign.js';
import social from '../../seed/content/social.js';
import quiz from '../../seed/content/quiz.js';
import password from '../../seed/content/password.js';
import { targetsFor, grade } from '../../modules/phishing.js';

const allPhish = [...phishingTraining, ...phishingAssessment, ...phishingCampaign];

test('every phishing cue points at a real, selectable element', () => {
  for (const e of allPhish) {
    const valid = new Set(targetsFor(e));
    for (const c of e.cues) assert.ok(valid.has(c.target), `${e.title}: cue target ${c.target} does not exist`);
  }
});

test('phishing emails have cues; legitimate emails have none but give reasons', () => {
  for (const e of allPhish) {
    if (e.isPhishing) assert.ok(e.cues.length > 0, `${e.title} has no cues`);
    else {
      assert.equal(e.cues.length, 0, `${e.title} is legit but has cues`);
      assert.ok(e.legitReasons.length > 0, `${e.title} is legit but has no reasons`);
    }
    for (const p of e.parts) if (p.kind === 'link') assert.ok(p.href, `${e.title}: link without href`);
  }
});

test('assessment pool is balanced across three forms', () => {
  for (const form of ['A', 'B', 'C']) {
    const items = phishingAssessment.filter((e) => e.form === form);
    assert.equal(items.length, 6, `form ${form} should have 6 items`);
    assert.equal(items.filter((e) => e.isPhishing).length, 4, `form ${form} should have 4 phishing`);
    assert.equal(items.filter((e) => !e.isPhishing).length, 2, `form ${form} should have 2 legit`);
  }
});

test('grading a phishing email: correct verdict + all cues scores near 1', () => {
  const item = { ...phishingTraining[0], _id: 'x', cues: phishingTraining[0].cues };
  const flags = phishingTraining[0].cues.map((c) => c.target);
  const g = grade(item, { verdict: 'phish', flags, confidence: 5 });
  assert.equal(g.correct, true);
  assert.ok(g.score > 0.95);
  const annotations = g.feedback.annotations;
  assert.ok(annotations.every((a) => a.status === 'hit'));
});

test('MCQ answer keys are in range and options are well formed', () => {
  for (const item of [...social, ...quiz, ...password]) {
    assert.ok(item.options.length >= 2 && item.options.length <= 5, `${item.prompt}: option count`);
    assert.ok(item.correctIndex >= 0 && item.correctIndex < item.options.length, `${item.prompt}: correctIndex out of range`);
    assert.ok(item.explanation && item.explanation.length > 10, `${item.prompt}: weak explanation`);
  }
});

test('password "strongest" items: passphrase beats patterned password', () => {
  // Item 0 options: P@ssw0rd!, Correct)(!@#12, coffee-mug-telescope-harbor, Rahul@2003
  assert.equal(password[0].correctIndex, 2, 'the long passphrase should be graded strongest, not the symbol-heavy short one');
  assert.ok(password[0].optionNotes?.length === 4);
});
