// Compact authoring helper for email scenarios.
// lines: string | { link: text, href } | { att: filename }
// cues:  { target: [cueType, explanation] } where target is from|replyTo|subject|auth|p<index>
export function email({ title, phish, from, replyTo, subject, auth = 'pass', lines, cues = {}, legit = [], takeaway = '', difficulty = 'medium', pool = 'training', form = null, landing }) {
  const authObj = typeof auth === 'string'
    ? { pass: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, fail: { spf: 'fail', dkim: 'none', dmarc: 'fail' }, soft: { spf: 'softfail', dkim: 'none', dmarc: 'none' }, none: { spf: 'none', dkim: 'none', dmarc: 'none' } }[auth]
    : auth;
  const parts = lines.map((l) => (typeof l === 'string' ? { kind: 'text', text: l } : l.link ? { kind: 'link', text: l.link, href: l.href } : { kind: 'attachment', text: l.att }));
  const cueList = Object.entries(cues).map(([target, [type, explanation]]) => ({ target, type, explanation }));
  return { title, isPhishing: phish, fromName: from[0], fromAddress: from[1], replyTo, subject, auth: authObj, parts, cues: cueList, legitReasons: legit, takeaway, difficulty, pool, form, landing };
}
