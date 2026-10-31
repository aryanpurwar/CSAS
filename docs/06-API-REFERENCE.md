# API Reference — CSAS

Base path: `/api`. All responses are JSON unless noted. Auth is via httpOnly cookies set at login; mutating requests require the `X-CSRF-Token` header echoing the `csas_csrf` cookie (the client does this automatically).

Error responses share a shape: `{ "message": string, "code": string, "details"?: any }`.

Common codes: `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `RATE_LIMITED`, `CSRF`.

---

## Authentication — `/api/auth`

| Method | Path | Auth | Body | Purpose |
|---|---|---|---|---|
| GET | `/csrf` | — | — | Prime the CSRF cookie |
| POST | `/register` | — | `{name,email,password,timezone?}` | Create account (NIST password policy) |
| POST | `/login` | — | `{email,password}` | Sign in; returns `{user}` or `{mfaRequired:true}` |
| POST | `/mfa/verify` | mfa cookie | `{code}` | Complete 2FA login |
| POST | `/refresh` | refresh cookie | — | Rotate tokens |
| POST | `/logout` | — | — | Revoke this session |
| POST | `/logout-all` | session | — | Revoke all sessions (bumps tokenVersion) |
| GET | `/me` | session | — | Current profile |
| POST | `/mfa/setup` | session | — | Begin TOTP enrolment (returns QR) |
| POST | `/mfa/enable` | session | `{code}` | Confirm and enable TOTP |
| POST | `/mfa/disable` | session | `{password,code}` | Disable TOTP |

## Profile — `/api/me`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Profile (same as `/auth/me`) |
| PATCH | `/` | Update name / timezone |
| POST | `/password` | Change password (ends other sessions) |
| GET | `/insights` | Personal cue-miss breakdown |
| GET | `/leaderboard` | Gamified leaderboard (gamified users only) |

## Training — `/api/training`

| Method | Path | Purpose |
|---|---|---|
| POST | `/:module/sessions` | Start a session (`module` = phishing/social/quiz/password) |
| POST | `/sessions/:id/next` | Get the next item (idempotent; keeps the timer) |
| POST | `/sessions/:id/answer` | Submit `{itemId, answer}` and get feedback |

Answer shapes:
- Phishing/assessment: `{ verdict: "phish"|"legit", flags: string[], confidence: 1..5 }`
- MCQ: `{ selectedIndex: -1..4, confidence?: 1..5 }` (`-1` = timed out)

## Study — `/api/study`

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Enrolment, group, phase availability |
| POST | `/consent` | `{study,campaigns}` — enrol and assign group |
| POST | `/assessments/:phase/start` | Start pre/post/retention assessment |
| POST | `/sus` | `{answers:number[10], comment?}` — submit SUS |
| GET | `/sus` | Whether SUS was submitted |

## Inbox — `/api/inbox`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Delivered campaign messages |
| POST | `/:id/open` | Mark opened |
| POST | `/:id/report` | Report as phishing |

## Campaign tracking (public) — `/api/track` and `/c`

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:token` | Click endpoint (records click, redirects to landing) |
| GET | `/api/track/:token/landing` | Landing-page branding |
| POST | `/api/track/:token/submit` | Record a submission (empty body; captures nothing) |
| GET | `/api/track/:token/lesson` | Teachable-moment lesson |

These are intentionally unauthenticated: a participant may click from their real mailbox. The token identifies exactly one delivery and the responses contain no personal data.

## Admin — `/api/admin` (role: admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/overview` | Cohort analytics (modules, cue detection, false alarms) |
| GET | `/users` | List participants |
| PATCH | `/users/:id` | Change role / group / unlock |
| GET | `/content/:type` | Item analysis for a content type |
| POST | `/content/phishing` | Create a phishing scenario |
| POST | `/content/mcq` | Create an MCQ item |
| PATCH | `/content/:type/:id` | Retire / restore an item |
| DELETE | `/content/:type/:id` | Delete an item (only if unanswered) |
| GET | `/campaigns` | Campaigns + templates |
| POST | `/campaigns` | Launch a campaign (consent enforced) |
| GET | `/campaigns/:id` | Campaign funnel metrics |
| POST | `/campaigns/:id/end` | End a running campaign |
| GET | `/study/summary` | Between-group study results |
| GET | `/study/export?type=` | CSV export (`responses`/`assessments`/`sus`) |
| GET | `/audit` | Audit log (filterable) |

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{status, name, version, db}` — for load balancers and the Docker healthcheck |
