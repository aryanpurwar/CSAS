# Software Requirements Specification — CSAS

Version 3.0 · Final-year capstone project

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for the Cybersecurity Awareness System (CSAS): a web application that trains users to detect phishing and social-engineering attacks, and that functions simultaneously as the instrument for a controlled study measuring whether the training changes detection behaviour.

### 1.2 Scope
CSAS provides interactive training (phishing inspection, social-engineering scenarios, a knowledge quiz, a password lab), a consented simulated-phishing campaign engine, and a research layer (assessments, questionnaires, analytics, data export). It does **not** provide real email delivery to third parties, real credential handling, or production identity management beyond its own accounts.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Cue | A specific red flag in a phishing email (e.g. a lookalike domain) that a learner can flag. |
| Session | A bounded sequence of training or assessment items. |
| Campaign | A simulated-phishing exercise delivered to consenting participants. |
| Assessment | A measured pre/post/retention test with no per-item feedback. |
| Adaptive group | Study condition with gamification and Elo-adaptive difficulty. |
| Control group | Study condition with static difficulty and no gamification. |
| SUS | System Usability Scale, a standard 10-item usability questionnaire. |

### 1.4 Stakeholders
Students/participants (learners), administrators/researchers (content, campaigns, analysis), and examiners (evaluation).

---

## 2. Overall description

### 2.1 Product perspective
A self-contained MERN-style application (MongoDB, Express, React, Node). The API is the single source of truth: all grading, scoring, timing, and gamification happen server-side. The client is a presentation layer that never holds answer keys.

### 2.2 User classes
- **Student** — trains, participates in the study, views own progress.
- **Admin** — manages content and users, launches campaigns, views cohort analytics, exports data. Admin actions are audit-logged and can require 2FA.

### 2.3 Operating environment
Modern browsers; Node 20+ server; MongoDB 7 replica set. Deployable via Docker Compose or a single Node service that also serves the built client.

### 2.4 Design constraints
- The application's subject is security, so the application itself must be secure (this is an assessed quality, not a nice-to-have).
- Research data must be anonymised (participant codes, not names) and consented.
- No real passwords or personal messages may be collected.

---

## 3. Functional requirements

Each requirement has an ID, a priority (M=must, S=should, C=could), and a verification method (T=automated test, D=demo, I=inspection).

### 3.1 Authentication & accounts
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-A1 | Users can register with name, email, password. Passwords are checked against a NIST-aligned policy (length-first, breach/guessability check) and rejected if weak. | M | T |
| FR-A2 | Passwords are stored only as bcrypt hashes (cost ≥ 12 in production). | M | I |
| FR-A3 | Login issues a short-lived access token and a rotating refresh token, both in httpOnly cookies. | M | T |
| FR-A4 | After 5 failed logins an account locks for 15 minutes. | M | T |
| FR-A5 | Users can enable TOTP two-factor authentication; admins may be required to. | S | T/D |
| FR-A6 | Users can change their password and sign out of all sessions; this invalidates existing tokens. | M | T |
| FR-A7 | Replaying a rotated refresh token revokes the whole token family. | S | T |

### 3.2 Phishing inspection training
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-P1 | A training session serves a sequence of emails; the client never receives whether an email is phishing or which elements are cues. | M | T |
| FR-P2 | Every header field and body line is individually selectable as a suspected red flag. | M | D |
| FR-P3 | Hovering a link reveals its true destination; the displayed text may differ. | M | D |
| FR-P4 | The learner commits a verdict (phishing/legitimate) and a confidence rating. | M | D |
| FR-P5 | The server scores the verdict plus cue precision/recall, and penalises false flags on legitimate email. | M | T |
| FR-P6 | After answering, the learner sees per-cue feedback (found, missed, false alarm) with explanations. | M | D |
| FR-P7 | Content covers Indian-context scams (UPI, Aadhaar/DigiLocker, courier, placement, QR). | S | I |

### 3.3 Other training modules
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-T1 | Social-engineering scenarios present a situation and multiple-choice responses, graded on the server. | M | T |
| FR-T2 | The quiz is server-timed; answers after the limit are marked timed-out and cannot be correct. | M | T |
| FR-T3 | The password lab analyses strength in the browser and checks breaches via k-anonymity (only a hash prefix leaves the device). | M | D |
| FR-T4 | Password "strongest of these" challenges are graded on the server with answer keys computed by zxcvbn. | M | T |

### 3.4 Adaptivity & gamification
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-G1 | Learners and items carry Elo ratings; the adaptive group is served items near its skill (~70% target success). | M | T |
| FR-G2 | The control group receives a fixed, non-adaptive curriculum and no gamification. | M | T |
| FR-G3 | XP, badges, streaks, and module scores are derived from stored responses, never incremented in place. | M | T |
| FR-G4 | Streaks use the user's own time zone for day boundaries. | M | T |
| FR-G5 | A leaderboard ranks the gamified group by XP. | S | D |

### 3.5 Campaigns
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-C1 | Admins launch a campaign from a template to selected participants. | M | D |
| FR-C2 | Only participants who consented to campaigns can be targeted; this is enforced server-side. | M | T |
| FR-C3 | The system tracks delivery, open, click, data-entry, and report for each target. | M | T |
| FR-C4 | The simulated landing page records that a submission happened but captures no entered data. | M | T |
| FR-C5 | A click leads to a teachable-moment lesson explaining the cues. | M | D |
| FR-C6 | Admins see a funnel and rates (click, report, report-before-click, median time). | S | D |

### 3.6 Research study
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-S1 | Participants give informed consent before any study data is collected. | M | T |
| FR-S2 | Consenting participants are assigned to adaptive or control, kept balanced. | M | T |
| FR-S3 | Pre, post, and retention assessments use counterbalanced parallel forms and give no per-item feedback. | M | T |
| FR-S4 | The post-test unlocks only after the pre-test and a minimum number of training sessions. | M | T |
| FR-S5 | Participants complete the SUS once. | S | T |
| FR-S6 | Admins view between-group comparisons (gain, retained gain) with t-tests and effect sizes. | S | D |
| FR-S7 | Admins export anonymised item responses, assessments, and SUS as CSV (formula-injection safe). | M | T |

### 3.7 Administration
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-M1 | Admins manage users (role, study group, unlock). | M | D |
| FR-M2 | Admins add/retire/delete content; items with responses are retired, not deleted. | M | T |
| FR-M3 | Admins view cohort analytics (module performance, cue-detection rates, false-alarm rate). | M | D |
| FR-M4 | Security-relevant admin and auth actions are written to an append-only audit log. | S | I |

---

## 4. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Security | All inputs validated and typed (Zod). CSP, HSTS (prod), CSRF, rate limiting, security headers applied. See `03-THREAT-MODEL.md`. |
| NFR-2 | Privacy | Research data stored under anonymous participant codes. Passwords and typed landing-page data never transmitted/stored. |
| NFR-3 | Reliability | Concurrent and duplicate answers cannot double-count (atomic conditional writes). Sessions expire via TTL. |
| NFR-4 | Usability | WCAG 2.2 AA targeted: keyboard operable, visible focus, verdict state never conveyed by colour alone, reduced-motion respected. |
| NFR-5 | Performance | Typical API responses < 200 ms under demo load; large JS (zxcvbn) lazy-loaded. |
| NFR-6 | Maintainability | Pure logic isolated in `lib/` and unit-tested; config validated at startup; structured logs. |
| NFR-7 | Portability | Runs via Docker Compose or a single Node process; no OS-specific dependencies. |
| NFR-8 | Testability | Unit + HTTP integration tests run in CI against a real MongoDB; coverage reported. |

---

## 5. Data (logical)

Principal collections: `User`, `RefreshToken`, `AuditLog`, `RateLimit`, `PhishingScenario`, `McqItem`, `TrainingSession`, `ItemResponse`, `UserProgress`, `Campaign`, `CampaignTarget`, `SurveyResponse`, `AssessmentResult`. The entity-relationship diagram is in `02-ARCHITECTURE.md`.

`ItemResponse` is the research dataset: one row per answered item, carrying verdict, correctness, cue precision/recall, confidence, decision time, and the Elo ratings before/after. Every analytic figure and the CSV export derive from these rows.

---

## 6. Assumptions and dependencies
- A MongoDB replica set is available (required for transactions and the session engine).
- The Have I Been Pwned range API is reachable from the browser for the breach check (the feature degrades gracefully if not).
- For real campaigns, institutional ethics approval and participant consent are obtained outside the system.

## 7. Out of scope
Real email delivery to external recipients, SSO/LDAP integration, mobile native apps, and production-grade key management (the project uses environment-held keys suitable for a capstone deployment).
