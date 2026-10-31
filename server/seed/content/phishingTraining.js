import { email } from './build.js';

// 16 phishing + 8 legitimate training emails. Legitimate emails matter: a learner who
// calls everything phishing is not safe, just noisy, and stops reading real alerts.
export default [
  email({
    title: 'Bank KYC suspension', phish: true, difficulty: 'easy',
    from: ['SBI Alerts', 'alerts@sbi-kyc-update.in'], subject: 'URGENT: Your account will be blocked in 24 hours', auth: 'pass',
    lines: ['Dear Customer,', 'Your KYC is incomplete as per RBI guidelines. Your account and debit card will be blocked within 24 hours.', 'Complete your KYC now to avoid suspension:', { link: 'Update KYC', href: 'http://sbi-kyc-update.in/verify' }, 'Regards,', 'SBI Customer Care'],
    cues: {
      from: ['lookalike-domain', 'sbi-kyc-update.in is not a bank domain. Anyone can register a name containing "sbi". SPF passes only because the attacker owns this domain.'],
      subject: ['urgency', 'A 24-hour deadline is there to stop you from checking.'],
      p0: ['generic-greeting', 'Your bank knows your name. "Dear Customer" means a mass mailing.'],
      p3: ['suspicious-link', 'Plain HTTP on the same lookalike domain. Banks never ask you to complete KYC through an emailed link.'],
    },
    takeaway: 'Banks never ask for KYC updates through an email link. Open your banking app or visit a branch instead.',
  }),
  email({
    title: 'Streaming payment failed', phish: true, difficulty: 'easy',
    from: ['Netflix', 'billing@netflx-account.com'], subject: 'Payment declined: update your card within 12 hours', auth: 'pass',
    lines: ['Hi there,', 'We could not process your last payment and your membership is on hold.', 'Update your payment details within 12 hours to keep watching:', { link: 'Update payment method', href: 'https://netflx-account.com/billing/update' }, 'The Netflix Team'],
    cues: {
      from: ['lookalike-domain', '"netflx" is missing an "i". Typosquatted domains are registered to look right at a glance.'],
      subject: ['urgency', 'Short deadlines are the most common phishing pressure tactic.'],
      p3: ['credential-request', 'The link collects card details on the lookalike domain.'],
    },
    takeaway: 'Read the sender domain letter by letter. For billing problems, open the app directly.',
  }),
  email({
    title: 'Campus password reset', phish: true, difficulty: 'easy',
    from: ['IT Helpdesk', 'it-helpdesk@univeristy-portal.edu.co'], subject: 'Mandatory password reset: action required today', auth: 'soft',
    lines: ['Student,', 'Due to a security upgrade all students must reset their passwords today using the link below. Accounts not updated will be deactivated.', { link: 'https://campus.edu.in/reset', href: 'http://univeristy-portal.edu.co/reset' }, 'IT Helpdesk'],
    cues: {
      from: ['lookalike-domain', '"univeristy" is misspelled, and the real campus domain is campus.edu.in.'],
      auth: ['auth-failure', 'SPF softfail: the sending server is not authorised for this domain.'],
      p1: ['threat', 'Deactivation threats push you to act before thinking.'],
      p2: ['link-text-mismatch', 'The text shows campus.edu.in but hovering reveals univeristy-portal.edu.co. The text of a link proves nothing.'],
    },
    takeaway: 'Always hover before you click. The real destination is what matters, not the text.',
  }),
  email({
    title: 'Income tax refund', phish: true, difficulty: 'medium',
    from: ['Income Tax Department', 'refunds@incometax-gov.in.net'], subject: 'Refund of ₹18,450 approved for AY 2026-27', auth: 'pass',
    lines: ['Dear Taxpayer,', 'After the last annual calculation of your fiscal activity, you are eligible to receive a tax refund of ₹18,450.', 'To receive the refund, verify your bank account and debit card details on the e-filing portal:', { link: 'https://www.incometax.gov.in/refund', href: 'http://incometax-refund.co/claim' }, 'Income Tax Department, Government of India'],
    cues: {
      from: ['lookalike-domain', 'The domain ends in .in.net, not .gov.in. Read domains from the right: the real owner is "in.net".'],
      p1: ['too-good-to-be-true', 'An unexpected refund is bait. Real refunds go to the account you already registered.'],
      p2: ['credential-request', 'The department never asks for debit card details to pay a refund.'],
      p3: ['link-text-mismatch', 'The link text shows the real portal, but the destination is incometax-refund.co.'],
    },
    takeaway: 'Read a domain from the right. "incometax-gov.in.net" belongs to whoever owns in.net.',
  }),
  email({
    title: 'Paid internship with fee', phish: true, difficulty: 'medium',
    from: ['Priya | TalentBridge HR', 'talentbridge.hr.recruit@gmail.com'], subject: 'Congratulations! Selected for paid internship (₹45,000/month)', auth: 'pass',
    lines: ['Dear Candidate,', 'Based on your profile you have been shortlisted for a remote Data Analyst internship with a stipend of ₹45,000 per month. No interview is required.', 'To confirm your seat, pay the refundable onboarding and laptop security fee of ₹1,999 to UPI ID talentbridge.hr@okaxis within 6 hours.', 'Seats are limited. Reply with the payment screenshot to receive your offer letter.', 'Regards, Priya, HR Team'],
    cues: {
      from: ['sender-mismatch', 'A company recruiter writing from a free Gmail address, not a company domain.'],
      p1: ['too-good-to-be-true', 'High stipend, remote, and no interview: real internships check your skills.'],
      p2: ['payment-request', 'Legitimate employers never charge you to join. "Refundable" fees are not refunded.'],
      p3: ['urgency', 'Limited seats and a 6-hour window to stop you asking anyone.'],
    },
    takeaway: 'If a job asks you to pay first, it is not a job. Check through your placement cell.',
  }),
  email({
    title: 'Shared exam timetable', phish: true, difficulty: 'medium',
    from: ['SharePoint Online', 'no-reply@sharepoint-docs.online'], subject: 'Rahul Verma shared "End Sem Timetable FINAL.xlsx" with you', auth: 'pass',
    lines: ['Rahul Verma shared a file with you.', '"Please check your slot, changes made by exam cell."', { link: 'Open in SharePoint', href: 'https://sharepoint-docs.online/login?u=you%40campus.edu.in' }, 'This link will work for anyone at your organisation.', 'Microsoft respects your privacy.'],
    cues: {
      from: ['lookalike-domain', 'Microsoft sends share notifications from microsoft.com or sharepointonline.com, never "sharepoint-docs.online".'],
      p2: ['suspicious-link', 'The link goes to a login page on a non-Microsoft domain and already contains your email, to make the fake sign-in look personal.'],
    },
    takeaway: 'Topical lures (exam timetables, results) are effective. Open shared files from the app, not the email.',
  }),
  email({
    title: 'Parcel redelivery fee', phish: true, difficulty: 'easy',
    from: ['India Post', 'support@indiapost-redelivery.top'], subject: 'Your parcel is held at the warehouse', auth: 'none',
    lines: ['Your parcel could not be delivered due to an incomplete address.', 'Pay a redelivery fee of ₹25 within 48 hours or the parcel will be returned to sender.', { link: 'Update address and pay', href: 'http://indiapost-redelivery.top/pay' }],
    cues: {
      from: ['lookalike-domain', 'India Post uses indiapost.gov.in. The .top domain is cheap and widely abused.'],
      auth: ['auth-failure', 'No SPF, DKIM or DMARC at all. Real postal services authenticate their mail.'],
      p1: ['payment-request', 'A tiny fee lowers your guard. The real goal is your card details.'],
      p2: ['suspicious-link', 'Unencrypted payment link on an unrelated domain.'],
    },
    takeaway: 'Small-fee requests are designed to feel harmless. The card details are the prize.',
  }),
  email({
    title: 'Scholarship bank details by reply', phish: true, difficulty: 'hard',
    from: ['Registrar Office', 'registrar@campus.edu.in'], replyTo: 'registrar.office.campus@outlook.com', subject: 'Scholarship disbursal: confirm account details', auth: 'fail',
    lines: ['Dear Student,', 'The second instalment of your merit scholarship is being processed. Our records show a mismatch in your bank account.', 'Please reply to this email with your account number, IFSC and a photo of your debit card (front and back) so that the amount can be credited this week.', 'Registrar Office'],
    cues: {
      auth: ['auth-failure', 'SPF and DMARC fail: this message did not come from campus.edu.in even though the From line says so. The sender address was spoofed.'],
      replyTo: ['reply-to-mismatch', 'Replies go to an Outlook.com address, not the university. This is how there is no link at all, yet the data still reaches the attacker.'],
      p2: ['credential-request', 'No office needs a photo of your card. Front and back means the number, expiry and CVV.'],
    },
    takeaway: 'A correct-looking From address can be forged. Check the authentication results and where replies go.',
  }),
  email({
    title: 'HoD gift-card request', phish: true, difficulty: 'medium',
    from: ['Dr. Meera Iyer (HoD CSE)', 'hod.cse.office@gmail.com'], subject: 'Are you available?', auth: 'pass',
    lines: ['Hello,', 'Are you on campus? I am in a meeting and cannot take calls. I need a quick favour.', 'Please buy 5 Amazon gift cards of ₹2,000 each for a department event and send me the codes here. I will reimburse you tomorrow.', 'Keep this between us for now, it is a surprise for the faculty.', 'Dr. Meera'],
    cues: {
      from: ['sender-mismatch', 'A head of department would write from the university domain, not a personal Gmail.'],
      p1: ['urgency', '"Cannot take calls" blocks the obvious way to verify.'],
      p2: ['unusual-request', 'Gift-card codes are cash that cannot be traced or reversed.'],
      p3: ['unusual-request', 'Requests for secrecy are a classic pretexting move.'],
    },
    takeaway: 'Verify unusual requests through a channel you already know, such as the official phone number or in person.',
  }),
  email({
    title: 'Invoice with executable', phish: true, difficulty: 'medium',
    from: ['Accounts Receivable', 'billing@quickserve-invoices.com'], subject: 'FINAL NOTICE: Invoice #8841 overdue', auth: 'soft',
    lines: ['Dear Sir/Madam,', 'Our records show invoice #8841 for ₹12,640 remains unpaid. Legal proceedings will begin if payment is not received within 2 working days.', 'The invoice is attached for your reference.', { att: 'Invoice_8841.pdf.exe' }],
    cues: {
      subject: ['urgency', '"FINAL NOTICE" in capitals for an invoice you have never heard of.'],
      p1: ['threat', 'Legal threats about an unknown debt are designed to scare you into opening the file.'],
      p3: ['risky-attachment', 'The real extension is .exe. ".pdf" is part of the name, so this is a program, not a document.'],
    },
    takeaway: 'Look at the last extension of a file name. A double extension hides an executable.',
  }),
  email({
    title: 'Storage full lookalike', phish: true, difficulty: 'hard',
    from: ['Google', 'storage-alert@googIe-mail.com'], subject: 'Your storage is full: emails will stop arriving', auth: 'pass',
    lines: ['Hi,', 'Your Google account storage is full. You will stop receiving new email in 3 days.', 'Claim 50 GB of free extra storage provided for students:', { link: 'Claim free storage', href: 'https://googIe-mail.com/storage/claim' }, 'The Google Account Team'],
    cues: {
      from: ['lookalike-domain', 'That is a capital I, not a lowercase l: "googIe". In many fonts they look identical.'],
      p2: ['too-good-to-be-true', 'Free storage offers are a common hook.'],
      p3: ['suspicious-link', 'Same homoglyph domain in the link.'],
    },
    takeaway: 'Homoglyphs (I vs l, rn vs m, 0 vs O) beat a quick glance. Use the app to check storage.',
  }),
  email({
    title: 'UPI cashback needs PIN', phish: true, difficulty: 'easy',
    from: ['PhonePe Rewards', 'rewards@phonepe-cashback.in'], subject: 'You won ₹5,000 cashback!', auth: 'pass',
    lines: ['Congratulations!', 'You have won ₹5,000 cashback in the festive lucky draw.', 'To receive the amount, open the link and enter your UPI PIN to approve the credit.', { link: 'Receive ₹5,000', href: 'https://phonepe-cashback.in/claim' }],
    cues: {
      from: ['lookalike-domain', 'Not the payment app\'s domain.'],
      p1: ['too-good-to-be-true', 'A lucky draw you never entered.'],
      p2: ['otp-request', 'You never enter a UPI PIN to receive money. A PIN only ever sends money out of your account.'],
    },
    takeaway: 'UPI PIN = money leaves your account. Receiving money never needs your PIN.',
  }),
  email({
    title: 'Electricity disconnection', phish: true, difficulty: 'easy',
    from: ['Electricity Board', 'billing.dept.power@gmail.com'], subject: 'Power disconnection tonight 9:30 PM', auth: 'pass',
    lines: ['Dear Consumer,', 'Your electricity will be disconnected tonight at 9:30 PM because your previous month bill was not updated.', 'Contact our electricity officer immediately on 98XXXX4127 to avoid disconnection.'],
    cues: {
      from: ['sender-mismatch', 'Utilities do not send disconnection notices from Gmail.'],
      p1: ['threat', 'Same-day disconnection threats create panic.'],
      p2: ['unusual-request', 'The "officer" will ask you to install a screen-sharing app or pay by UPI. Use the number on your bill instead.'],
    },
    takeaway: 'No link does not mean safe. A phone number can be the hook.',
  }),
  email({
    title: 'Result withheld fine', phish: true, difficulty: 'medium',
    from: ['Examination Cell', 'results@campus-exams.in'], subject: 'Your semester result is withheld', auth: 'pass',
    lines: ['Dear Student,', 'Your semester result has been withheld due to a pending library fine of ₹350.', 'Clear the fine using your student portal login below to release your result:', { link: 'Student portal login', href: 'https://campus-exams.in/portal/login' }, 'Controller of Examinations'],
    cues: {
      from: ['lookalike-domain', 'The exam cell would use campus.edu.in, not a separate "campus-exams.in".'],
      p1: ['threat', 'Withholding results plays on exam anxiety.'],
      p2: ['credential-request', 'It asks for your portal password on an outside site.'],
    },
    takeaway: 'Log in to student services by typing the address you know, not through email.',
  }),
  email({
    title: 'Offer letter QR code', phish: true, difficulty: 'hard',
    from: ['Ananya Rao, Talent Acquisition', 'careers@infosys-onboarding.co'], subject: 'Offer letter: e-signature pending', auth: 'pass',
    lines: ['Hi,', 'Congratulations on your selection for the Graduate Engineer Trainee role.', 'For security, our e-signature portal is accessible only from mobile. Scan the QR code in the attached image and sign in with your college email to sign your offer letter.', { att: 'Offer_Letter_Signature_QR.png' }, 'Ananya Rao'],
    cues: {
      from: ['lookalike-domain', 'An "-onboarding.co" domain is not the company. Check placement news through your placement cell.'],
      p1: ['too-good-to-be-true', 'An offer you never interviewed for.'],
      p2: ['credential-request', '"Mobile only" moves you to a phone, where URLs are harder to inspect and corporate filters do not apply. The QR hides the destination.'],
      p3: ['risky-attachment', 'QR-code phishing ("quishing") hides the link inside an image so email scanners cannot read it.'],
    },
    takeaway: 'A QR code is a link you cannot hover over. Treat it with the same suspicion.',
  }),
  email({
    title: 'DigiLocker expiry', phish: true, difficulty: 'hard',
    from: ['DigiLocker', 'noreply@digilocker-gov.in'], subject: 'Documents linked to your Aadhaar will be removed', auth: 'pass',
    lines: ['Dear User,', 'As part of the annual re-verification, documents not re-verified by 30 November will be deleted from your DigiLocker.', 'Re-verify using your Aadhaar number and the OTP sent to your phone:', { link: 'https://digilocker.gov.in/reverify', href: 'https://digilocker-gov.in/reverify' }, 'Ministry of Electronics & IT'],
    cues: {
      from: ['lookalike-domain', 'digilocker-gov.in uses a hyphen. The real service is digilocker.gov.in, a subdomain of gov.in that only the government can register.'],
      p1: ['threat', 'Deletion of official documents is a strong fear trigger.'],
      p2: ['otp-request', 'An OTP entered on a fake site lets the attacker sign in as you in real time.'],
      p3: ['link-text-mismatch', 'Text shows digilocker.gov.in; the destination has a hyphen instead of a dot.'],
    },
    takeaway: 'Hyphen vs dot matters. "x.gov.in" belongs to the government; "x-gov.in" belongs to anyone.',
  }),

  // ---- Legitimate ----
  email({
    title: 'Order confirmation', phish: false, difficulty: 'medium',
    from: ['Amazon.in', 'auto-confirm@amazon.in'], subject: 'Your Amazon.in order of "USB-C cable" has shipped', auth: 'pass',
    lines: ['Hello,', 'Your package is on its way and should arrive by Thursday.', 'To track it, open the Amazon app or go to Your Orders on amazon.in.', 'Thank you for shopping with us.'],
    legit: ['Sent from the expected amazon.in domain, and all authentication checks pass.', 'No request for a password, OTP or payment.', 'It tells you to use the app or website directly instead of a link.', 'No deadline or threat.'],
    takeaway: 'Legitimate messages inform; they rarely demand. Calling this phishing has a cost too.',
  }),
  email({
    title: 'Sign-in alert', phish: false, difficulty: 'hard',
    from: ['Google', 'no-reply@accounts.google.com'], subject: 'Security alert: new sign-in on Windows', auth: 'pass',
    lines: ['A new sign-in to your Google Account', 'We noticed a new sign-in from Chrome on Windows.', 'If this was you, you do not need to do anything. If not, we will help you secure your account.', { link: 'Check activity', href: 'https://myaccount.google.com/notifications' }],
    legit: ['accounts.google.com with SPF, DKIM and DMARC passing.', 'The link goes to myaccount.google.com, a real Google domain.', '"If this was you, do nothing" is the opposite of phishing pressure.'],
    takeaway: 'Security alerts can be real. Check the domain and link, and when unsure open the account directly.',
  }),
  email({
    title: 'Library due reminder', phish: false, difficulty: 'medium',
    from: ['Central Library', 'library@campus.edu.in'], subject: 'Reminder: 2 books due on Friday', auth: 'pass',
    lines: ['Dear Student,', 'The following books are due on Friday: "Operating System Concepts" and "Computer Networks".', 'You can renew them once from your library account:', { link: 'library.campus.edu.in/account', href: 'https://library.campus.edu.in/account' }, 'Central Library'],
    legit: ['Sent from the university domain with authentication passing.', 'Specific details (book titles) rather than a generic hook.', 'The link text and destination match, on a campus subdomain.'],
  }),
  email({
    title: 'Train booking', phish: false, difficulty: 'easy',
    from: ['IRCTC', 'ticketadmin@irctc.co.in'], subject: 'Booking confirmed: PNR 4521983370', auth: 'pass',
    lines: ['Dear Passenger,', 'Your e-ticket for train 12951 on 14 Dec is confirmed. Coach B3, berth 42.', 'Please carry a valid photo ID during the journey.', { att: 'ETicket_4521983370.pdf' }],
    legit: ['Matches a booking you would have made; specific PNR, train and berth.', 'irctc.co.in is the real domain and checks pass.', 'The attachment is a plain .pdf.'],
  }),
  email({
    title: 'New SSH key added', phish: false, difficulty: 'hard',
    from: ['GitHub', 'noreply@github.com'], subject: '[GitHub] A new SSH authentication public key was added to your account', auth: 'pass',
    lines: ['Hey you-campus,', 'The following SSH key was added to your account: "laptop-2026" (SHA256:9Qe...F2w).', 'If you believe this key was added in error, you can remove it and review your security log at:', { link: 'https://github.com/settings/keys', href: 'https://github.com/settings/keys' }],
    legit: ['From github.com with authentication passing, and it uses your username.', 'The link is on github.com itself.', 'Alarming does not mean fake. It is reporting an action, not demanding one.'],
    takeaway: 'If you did not add the key, go to GitHub yourself. The email is still genuine.',
  }),
  email({
    title: 'Placement drive notice', phish: false, difficulty: 'medium',
    from: ['Training & Placement Cell', 'placements@campus.edu.in'], subject: 'Campus drive: register on the placement portal by 20 Nov', auth: 'pass',
    lines: ['Dear Final-Year Students,', 'A campus drive for the Software Engineer role is scheduled for 28 November. Eligibility: 7.0 CGPA, no active backlogs.', 'Register through the placement portal. There is no registration fee.', { link: 'placements.campus.edu.in', href: 'https://placements.campus.edu.in/drives' }],
    legit: ['University domain, authentication passing.', 'States there is no fee and gives clear eligibility.', 'The deadline is reasonable, not hours.'],
  }),
  email({
    title: 'Meeting invite', phish: false, difficulty: 'easy',
    from: ['Prof. Arjun Menon', 'arjun.menon@campus.edu.in'], subject: 'Project review: Thursday 3 PM, Lab 2', auth: 'pass',
    lines: ['Hi team,', 'Let us review your capstone progress on Thursday at 3 PM in Lab 2. Please bring your updated architecture diagram.', 'Arjun'],
    legit: ['A known colleague on the university domain.', 'Expected context (your project) and no request for data or money.'],
  }),
  email({
    title: 'Course enrolment', phish: false, difficulty: 'medium',
    from: ['NPTEL', 'noreply@nptel.iitm.ac.in'], subject: 'Enrolment confirmed: Introduction to Cyber Security', auth: 'pass',
    lines: ['Dear Learner,', 'You have successfully enrolled in "Introduction to Cyber Security". Week 1 content will be available on Monday.', 'Access the course from your NPTEL dashboard:', { link: 'onlinecourses.nptel.ac.in', href: 'https://onlinecourses.nptel.ac.in' }],
    legit: ['Institutional ac.in domain with authentication passing.', 'Confirms an action you took.', 'Link text and destination match.'],
  }),
];
