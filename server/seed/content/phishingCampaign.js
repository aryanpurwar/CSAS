import { email } from './build.js';

// Templates for simulated phishing campaigns. One legitimate template is included so
// admins can measure false reports (people reporting real email as phishing).
const T = (o) => email({ ...o, pool: 'campaign' });

export default [
  T({ title: 'Campaign: Wi-Fi password expiry', phish: true, difficulty: 'medium', from: ['Campus Network Services', 'netservices@campus-wifi-login.in'], subject: 'Your campus Wi-Fi password expires today', auth: 'pass',
    lines: ['Dear User,', 'Your campus Wi-Fi password expires today. Devices will be disconnected at midnight.', 'Renew your password to stay connected:', { link: 'Renew Wi-Fi access', href: 'https://campus-wifi-login.in/renew' }, 'Network Services'],
    cues: { from: ['lookalike-domain', 'campus-wifi-login.in is not the university domain.'], p1: ['urgency', 'Disconnection at midnight.'], p3: ['credential-request', 'Renewal page asks for your campus password on an outside site.'] },
    takeaway: 'Password expiry notices are the most-clicked campus phish. IT will never ask you to log in from an email link.',
    landing: { brand: 'Campus Single Sign-On', prompt: 'Sign in with your campus email to renew Wi-Fi access' } }),
  T({ title: 'Campaign: scholarship verification', phish: true, difficulty: 'hard', from: ['Scholarship Section', 'scholarships@campus-nsp-verify.in'], subject: 'Action needed: verify bank details for scholarship credit', auth: 'pass',
    lines: ['Dear Student,', 'Your scholarship amount is ready to be credited. Verification of your bank account is pending.', { link: 'Verify bank details', href: 'https://campus-nsp-verify.in/verify' }, 'Unverified accounts will be skipped this cycle.'],
    cues: { from: ['lookalike-domain', 'Not the university or the official scholarship portal.'], p2: ['credential-request', 'Bank details on an outside site.'], p3: ['threat', 'Missing the cycle is a fear-of-loss trigger.'] },
    takeaway: 'Scholarship and fee messages are high-value lures. Check through the official portal or the office.',
    landing: { brand: 'Scholarship Portal', prompt: 'Sign in to verify your bank account' } }),
  T({ title: 'Campaign: delivery failed', phish: true, difficulty: 'easy', from: ['BlueDart Express', 'notify@bluedart-tracking-in.com'], subject: 'Delivery attempt failed: reschedule now', auth: 'soft',
    lines: ['We attempted to deliver your shipment but no one was available.', 'Reschedule delivery and confirm your address:', { link: 'Reschedule delivery', href: 'http://bluedart-tracking-in.com/reschedule' }],
    cues: { from: ['lookalike-domain', 'Lookalike courier domain.'], auth: ['auth-failure', 'SPF softfail.'], p2: ['suspicious-link', 'Unencrypted lookalike link.'] },
    takeaway: 'If you are not expecting a parcel, a delivery failure is bait. Track parcels from the courier app.',
    landing: { brand: 'Courier Tracking', prompt: 'Sign in to reschedule your delivery' } }),
  T({ title: 'Campaign: library e-resources (legitimate)', phish: false, difficulty: 'medium', from: ['Central Library', 'library@campus.edu.in'], subject: 'New: IEEE Xplore access for final-year students', auth: 'pass',
    lines: ['Dear Students,', 'You now have campus-wide access to IEEE Xplore through the library website.', { link: 'library.campus.edu.in/eresources', href: 'https://library.campus.edu.in/eresources' }],
    legit: ['University domain with passing checks; no credential request; link text matches destination.'],
    takeaway: 'This was a real, harmless notice. Reporting genuine mail creates noise, so check before reporting.' }),
];
