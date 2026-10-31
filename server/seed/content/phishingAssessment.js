import { email } from './build.js';

// Three parallel forms (A, B, C) for pre-test, post-test and retention test. Each form has
// 4 phishing emails (1 easy, 2 medium, 1 hard) and 2 legitimate ones, matched in structure
// so that forms are comparable. Learners never see feedback on these items, and the items
// never appear in training. Form order is counterbalanced per participant.
const A = (o) => email({ ...o, pool: 'assessment', form: 'A' });
const B = (o) => email({ ...o, pool: 'assessment', form: 'B' });
const C = (o) => email({ ...o, pool: 'assessment', form: 'C' });

export default [
  // ---------------- Form A ----------------
  A({ title: 'A: card blocked', phish: true, difficulty: 'easy', from: ['HDFC Bank', 'secure@hdfc-netbanking-verify.com'], subject: 'Your credit card has been blocked', auth: 'pass',
    lines: ['Dear Customer,', 'Suspicious activity was detected and your credit card is temporarily blocked.', 'Unblock immediately by confirming your card number, expiry and CVV:', { link: 'Unblock card', href: 'http://hdfc-netbanking-verify.com/unblock' }],
    cues: { from: ['lookalike-domain', 'Not the bank domain.'], p1: ['threat', 'Blocked card threat.'], p2: ['credential-request', 'Asks for CVV.'], p3: ['suspicious-link', 'HTTP lookalike link.'] } }),
  A({ title: 'A: fee internship', phish: true, difficulty: 'medium', from: ['Neha - HR, CodeNest', 'codenest.careers@yahoo.com'], subject: 'Work-from-home internship: ₹30,000/month', auth: 'pass',
    lines: ['Hi,', 'You are selected for a work-from-home internship with ₹30,000 monthly stipend. No test needed.', 'Pay ₹1,499 registration via UPI to confirm today.'],
    cues: { from: ['sender-mismatch', 'Free email provider.'], p1: ['too-good-to-be-true', 'No selection process.'], p2: ['payment-request', 'Pay to join.'] } }),
  A({ title: 'A: shared doc', phish: true, difficulty: 'medium', from: ['OneDrive', 'share@onedrive-filesecure.net'], subject: 'Dean\'s Office shared "Fee Revision 2027.pdf"', auth: 'pass',
    lines: ['The Dean\'s Office shared a file with you.', { link: 'View document', href: 'https://onedrive-filesecure.net/view?id=88123' }, 'You will be asked to sign in with your campus account.'],
    cues: { from: ['lookalike-domain', 'Not a Microsoft domain.'], p1: ['suspicious-link', 'Destination is the lookalike.'], p2: ['credential-request', 'Sign-in on a third-party site.'] } }),
  A({ title: 'A: spoofed registrar', phish: true, difficulty: 'hard', from: ['Accounts Section', 'accounts@campus.edu.in'], replyTo: 'campus.accounts.dept@proton.me', subject: 'Fee refund: send account details', auth: 'fail',
    lines: ['Dear Student,', 'An excess fee payment of ₹6,200 will be refunded. Reply with your bank account number, IFSC and registered mobile number.'],
    cues: { auth: ['auth-failure', 'SPF/DMARC fail.'], replyTo: ['reply-to-mismatch', 'Replies go to Proton Mail.'], p1: ['credential-request', 'Bank details by email.'] } }),
  A({ title: 'A: legit lab change', phish: false, difficulty: 'medium', from: ['CSE Department', 'cse.office@campus.edu.in'], subject: 'Lab session moved to Room 304', auth: 'pass',
    lines: ['Dear Students,', 'Wednesday\'s Network Security lab is moved from Room 210 to Room 304 due to maintenance. Timing is unchanged.'],
    legit: ['Campus domain, authentication passes, no request.'] }),
  A({ title: 'A: legit password changed', phish: false, difficulty: 'hard', from: ['Microsoft account team', 'account-security-noreply@accountprotection.microsoft.com'], subject: 'Your password was changed', auth: 'pass',
    lines: ['Your Microsoft account password was changed on 12 Oct.', 'If this was you, you can ignore this email. If not, reset your password at account.live.com.'],
    legit: ['Real Microsoft subdomain, checks pass, no link pressure.'] }),

  // ---------------- Form B ----------------
  B({ title: 'B: account frozen', phish: true, difficulty: 'easy', from: ['ICICI Alerts', 'alerts@icici-secure-kyc.in'], subject: 'Account frozen: update PAN within 24 hrs', auth: 'pass',
    lines: ['Dear Customer,', 'Your account is frozen as your PAN is not updated. Update within 24 hours to avoid permanent closure.', { link: 'Update PAN', href: 'http://icici-secure-kyc.in/pan' }],
    cues: { from: ['lookalike-domain', 'Not the bank domain.'], p1: ['threat', 'Closure threat with deadline.'], p2: ['suspicious-link', 'HTTP lookalike.'] } }),
  B({ title: 'B: data-entry job', phish: true, difficulty: 'medium', from: ['Rahul (Recruiter)', 'hr.rahul.jobs@gmail.com'], subject: 'Part-time data entry: earn ₹2,000/day', auth: 'pass',
    lines: ['Hello,', 'Earn ₹2,000 daily for simple data entry from your phone. No experience needed.', 'Pay a one-time ₹999 training kit fee to start today.'],
    cues: { from: ['sender-mismatch', 'Personal Gmail.'], p1: ['too-good-to-be-true', 'Unrealistic pay.'], p2: ['payment-request', 'Upfront fee.'] } }),
  B({ title: 'B: voicemail', phish: true, difficulty: 'medium', from: ['Teams Voicemail', 'voicemail@teams-msg-center.com'], subject: 'You have 1 new voicemail (0:42)', auth: 'pass',
    lines: ['You received a voicemail from +91 80XXXX2231.', { link: 'Play voicemail', href: 'https://teams-msg-center.com/vm/play' }, 'Sign in with your work account to listen.'],
    cues: { from: ['lookalike-domain', 'Not Microsoft.'], p1: ['suspicious-link', 'Lookalike destination.'], p2: ['credential-request', 'Sign-in on third-party domain.'] } }),
  B({ title: 'B: spoofed principal', phish: true, difficulty: 'hard', from: ['Principal', 'principal@campus.edu.in'], replyTo: 'principal.campus.office@gmail.com', subject: 'Confidential task', auth: 'fail',
    lines: ['Are you free? I need you to handle a small payment for a guest lecture urgently.', 'Do not discuss with others yet. Reply and I will share the details.'],
    cues: { auth: ['auth-failure', 'Spoofed: DMARC fail.'], replyTo: ['reply-to-mismatch', 'Replies to Gmail.'], p0: ['urgency', 'Urgent favour.'], p1: ['unusual-request', 'Secrecy.'] } }),
  B({ title: 'B: legit fee receipt', phish: false, difficulty: 'medium', from: ['Accounts Section', 'accounts@campus.edu.in'], subject: 'Fee receipt for semester 7', auth: 'pass',
    lines: ['Dear Student,', 'We have received your semester 7 fee. Your receipt is attached for your records.', { att: 'Fee_Receipt_Sem7.pdf' }],
    legit: ['Campus domain, checks pass, plain PDF, no request.'] }),
  B({ title: 'B: legit new device', phish: false, difficulty: 'hard', from: ['Instagram', 'security@mail.instagram.com'], subject: 'New login to your account from Chrome on Linux', auth: 'pass',
    lines: ['We noticed a new login near Pune.', 'If this was you, there is nothing else you need to do. If it was not, secure your account from the Instagram app.'],
    legit: ['Real subdomain, checks pass, directs you to the app.'] }),

  // ---------------- Form C ----------------
  C({ title: 'C: UPI reversal', phish: true, difficulty: 'easy', from: ['Google Pay Support', 'support@gpay-refund-help.in'], subject: 'Wrong transaction: refund ₹4,999 now', auth: 'pass',
    lines: ['Dear User,', '₹4,999 was credited to you by mistake. Approve the refund request by entering your UPI PIN on the link below within 2 hours.', { link: 'Approve refund', href: 'https://gpay-refund-help.in/approve' }],
    cues: { from: ['lookalike-domain', 'Not Google.'], p1: ['otp-request', 'UPI PIN to "receive"/approve.'], p2: ['suspicious-link', 'Lookalike destination.'] } }),
  C({ title: 'C: freelance task', phish: true, difficulty: 'medium', from: ['Task Team', 'reviews.taskteam@outlook.com'], subject: 'Earn by liking videos: ₹150 per task', auth: 'pass',
    lines: ['Hi,', 'Like 3 YouTube videos and earn ₹450 today. Higher tasks pay more after a ₹2,000 "VIP deposit".'],
    cues: { from: ['sender-mismatch', 'Free email.'], p1: ['payment-request', 'Deposit for "VIP" tasks.'] } }),
  C({ title: 'C: HR policy', phish: true, difficulty: 'medium', from: ['HR Portal', 'hr-policy@campus-staffportal.com'], subject: 'Acknowledge the revised leave policy by today', auth: 'pass',
    lines: ['All students and staff must acknowledge the revised leave policy today.', { link: 'Acknowledge policy', href: 'https://campus-staffportal.com/sso' }, 'Use your campus email and password.'],
    cues: { from: ['lookalike-domain', 'Not campus.edu.in.'], subject: ['urgency', 'Today deadline.'], p1: ['suspicious-link', 'Lookalike SSO.'], p2: ['credential-request', 'Password requested.'] } }),
  C({ title: 'C: spoofed bursar', phish: true, difficulty: 'hard', from: ['Hostel Office', 'hostel@campus.edu.in'], replyTo: 'hostel.office.campus@outlook.com', subject: 'Hostel deposit refund', auth: 'fail',
    lines: ['Dear Resident,', 'To process your hostel deposit refund, reply with a photo of your debit card and your registered mobile number.'],
    cues: { auth: ['auth-failure', 'Spoofed: SPF/DMARC fail.'], replyTo: ['reply-to-mismatch', 'Replies go to Outlook.'], p1: ['credential-request', 'Card photo.'] } }),
  C({ title: 'C: legit exam form', phish: false, difficulty: 'medium', from: ['Examination Cell', 'exams@campus.edu.in'], subject: 'Exam form window opens Monday', auth: 'pass',
    lines: ['Dear Students,', 'The end-semester exam form will be available on the student portal from Monday to Friday. Log in through the portal as usual.'],
    legit: ['Campus domain, checks pass, tells you to use the usual portal.'] }),
  C({ title: 'C: legit 2FA code', phish: false, difficulty: 'hard', from: ['GitHub', 'noreply@github.com'], subject: '[GitHub] Please verify your device', auth: 'pass',
    lines: ['Hey you-campus!', 'A sign-in attempt requires further verification. Device: Firefox on Ubuntu.', 'Verification code: 482913', 'If you did not attempt to sign in, change your password from github.com.'],
    legit: ['Real domain; the code is sent to you, it does not ask you to send it anywhere.'] }),
];
