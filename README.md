# Cybersecurity Awareness System (CSAS)

An adaptive cybersecurity-awareness training platform **and a controlled research study** into whether that training changes real phishing-detection behaviour.

Most awareness tools ask a user to pass a quiz. This one asks a research question: *does adaptive, gamified, behaviour-based training improve phishing detection more than static training, and does the improvement last?* The platform is the instrument that answers it.

The project is built on three pillars:

- **Cybersecurity** — an interactive email inspector that scores *which red flags* a learner finds (precision/recall of cues), a consented simulated-phishing **campaign engine** that measures real click/report behaviour, and a privacy-preserving password lab.
- **Human–Computer Interaction** — a controlled user study (adaptive vs. control groups; pre/post/retention tests), adaptive difficulty via an Elo rating system, confidence calibration, the System Usability Scale, and a WCAG-minded interface.
- **Software Engineering** — validated configuration, structured logging, a full automated test suite (unit + integration against a real database), CI with CodeQL and dependency audit, Docker, and the documentation in this folder.

---

## Quick start (Docker)

```bash
cp server/.env.docker.example server/.env     # then edit the two secrets
docker compose up --build
docker compose exec api npm run seed          # load content + demo accounts
```

- App: <http://localhost:5000>
- Mailpit (catches simulated phishing email): <http://localhost:8025>

Demo accounts (change before any real use):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@csas.edu` | `Admin!longpass#2026` |
| Student (adaptive group) | `student@csas.edu` | `student-longpass-2026` |

## Quick start (local, no Docker)

You need Node 20+ and a MongoDB **replica set** (transactions and the session engine rely on it). A single-node replica set is fine:

```bash
# 1. Server
cd server
npm install
cp .env.example .env            # fill JWT_SECRET and DATA_ENC_KEY (see below)
npm run seed
npm run dev                     # API on :5000

# 2. Client (separate terminal)
cd client
npm install
npm run dev                     # Vite dev server on :5173, proxies /api to :5000
```

Generate the two required secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DATA_ENC_KEY
```

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Component UI, fast builds, code-splitting |
| Routing | React Router 6 | SPA navigation, protected routes |
| Charts | Recharts | Study and admin visualisations |
| Password analysis | zxcvbn-ts | Realistic strength estimation, client + server |
| Backend | Node 20 + Express 4 | One language end to end, small REST surface |
| Database | MongoDB 7 + Mongoose 8 | Flexible documents; transactions via replica set |
| Auth | JWT (httpOnly cookies) + bcrypt + TOTP | Stateless access tokens, rotating refresh tokens, 2FA |
| Validation | Zod | Every request body/param is parsed and typed |
| Security | Helmet, CSP, CSRF, rate limiting | Defence in depth for a security-subject app |
| Logging | Pino | Structured, redacted JSON logs |
| Mail (optional) | Nodemailer + Mailpit | Local-only simulated phishing delivery |
| Tests | node:test + Supertest | Unit and HTTP integration tests |

---

## What makes this a final-year project, not a CRUD app

| Capability | What it does | Where |
|---|---|---|
| **Email inspector** | Every header and body line is selectable; the learner flags cues and the server scores precision/recall, penalising false alarms on legitimate email | `modules/phishing.js`, `lib/cueScoring.js` |
| **Campaign engine** | Admin launches consented simulated phishing; tracks delivery → open → click → data-entry → report; the landing page captures nothing | `services/campaignService.js` |
| **Adaptive difficulty** | Learners and items both carry Elo ratings; each item is chosen near the learner's current skill (~70% success) | `lib/elo.js`, `services/sessionService.js` |
| **Controlled study** | Randomised adaptive vs. control assignment; counterbalanced pre/post/retention forms; SUS; confidence calibration; between-group t-tests; CSV export | `routes/study.js`, `services/analyticsService.js`, `lib/stats.js` |
| **Derived gamification** | XP, badges, streaks are **recomputed from source data**, never incremented — so they cannot drift out of sync | `lib/gamification.js`, `services/progressService.js` |
| **Security hardening** | httpOnly cookies, refresh-token rotation with reuse detection, CSRF, TOTP 2FA, account lockout, CSP/HSTS, audit log, AES-GCM for secrets | `middleware/`, `services/tokenService.js` |

See [`docs/`](docs/) for the full SRS, architecture, threat model, and study protocol.

---

## Scripts

### Server (`server/`)
| Command | Purpose |
|---|---|
| `npm run dev` | Start with file watching |
| `npm start` | Start for production |
| `npm run seed` | Load content and demo accounts |
| `npm run recompute` | Rebuild all derived gamification from source data |
| `npm test` | Unit + integration tests |
| `npm run test:coverage` | Tests with coverage report |

### Client (`client/`)
| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

---

## Project structure

```text
csas/
├── client/                 React app (Vite)
│   └── src/
│       ├── api/            Axios client (cookies + CSRF + refresh)
│       ├── components/     Shell, UI primitives, email inspector, MCQ runner
│       ├── context/        Auth and toast providers
│       ├── hooks/          Session, zxcvbn strength, HIBP breach check
│       └── pages/          Trainers, dashboard, study, settings, admin
├── server/                 Express API
│   ├── config/             Validated env, DB connection
│   ├── lib/                Pure logic: elo, stats, cue scoring, gamification, totp, crypto
│   ├── middleware/         Auth, CSRF, validation, rate limit, security headers, errors
│   ├── models/             Mongoose schemas
│   ├── modules/            Per-module item definitions (phishing, mcq)
│   ├── routes/             HTTP routes
│   ├── services/           Session engine, campaigns, analytics, tokens, progress
│   ├── seed/               Seed script + content (46 emails, 40 MCQ items)
│   └── tests/              Unit + integration tests
├── docs/                   SRS, architecture, threat model, study protocol, viva guide
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Ethics note

The campaign engine sends simulated phishing only to participants who explicitly consent, and consent is enforced on the server, not just hidden in the UI. **Running simulated phishing against real people requires written approval from your institution's ethics committee.** The consent flow in this project mirrors a real one but is not a substitute for that approval. No real passwords or personal messages are ever collected: the password lab keeps passwords in the browser, and the simulated landing page discards whatever is typed.
