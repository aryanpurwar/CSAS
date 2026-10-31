# Changelog

## 3.0 — Adaptive awareness system with a controlled study

This version reframes the project from a training website into an adaptive awareness
system with a research question: does adaptive, gamified training change phishing-detection
behaviour, and can I measure it? The headline additions:

### New capabilities
- **Interactive email inspector.** Every header and body line is selectable. Learners flag
  the red flags they spot and are scored on cue precision and recall, with false alarms on
  legitimate email penalised. Hovering a link reveals its true destination.
- **Simulated phishing campaign engine.** Admins launch consented campaigns; the system
  tracks delivery, open, click, data-entry and report. The landing page captures nothing.
- **Adaptive difficulty** using an Elo rating system for both learners and items.
- **Controlled study layer:** consent and random group assignment, counterbalanced
  pre/post/retention assessments, the System Usability Scale, confidence calibration, and a
  between-group analysis with CSV export.

### Correctness fixes (from the previous version's review)
- Gamification (XP, badges, streaks) is now **derived from stored responses**, not
  incremented — so it can no longer drift (the old dashboard showed 200 XP with 0 attempts).
- The password score is computed **on the server**; the client-trusted score endpoint is gone.
- Answering is now **race-safe**: an atomic conditional write prevents concurrent duplicates
  from double-counting.
- The quiz timer is **enforced on the server**; late answers are rejected.
- Streaks use the **user's own time zone** for day boundaries.
- `.env` is no longer shipped; configuration is validated at startup.

### Security
httpOnly cookies with rotating refresh tokens and reuse detection, CSRF protection, a
Content-Security-Policy and HSTS, TOTP two-factor authentication, account lockout, a
persistent rate limiter, an audit log, and AES-GCM encryption for stored secrets.

### Content
Expanded to 46 phishing emails (training, three assessment forms, campaign templates) and
40 multiple-choice items, with an Indian-context focus: UPI fraud, Aadhaar/DigiLocker,
courier scams, fake placements, and QR-code phishing. Password guidance follows current
NIST SP 800-63B (length over composition rules; breach checking).

### Engineering
A full automated test suite (49 unit and integration tests against a real MongoDB, ~90%
line coverage), CI with CodeQL and dependency audit, Docker Compose (MongoDB + Mailpit +
API), and the documentation in docs/.
