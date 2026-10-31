# Test & Quality Report — CSAS

This report documents how quality is made visible: the test strategy, what is covered, and the measured results from an actual run. Reproduce it with `npm run test:coverage` in `server/`.

---

## 1. Test strategy

Two layers, each targeting a different kind of risk:

1. **Unit tests** (`tests/unit/`) exercise the pure logic in `lib/` with no database or HTTP: Elo updates, statistics (SUS, t-tests, Brier), cue scoring, gamification derivation, crypto round-trips, TOTP, the password policy, CSV escaping, and streak/time-zone logic. These are fast and deterministic, and they pin down the parts a reader most needs to trust.

2. **Integration tests** (`tests/integration/`) drive the real HTTP API against a **real MongoDB**, through the real cookie/CSRF flow, with the database reseeded before each test. These verify behaviour that only emerges from the whole stack: authorisation, concurrency, session integrity, and the study flow.

The content itself is also tested: every phishing cue must point at a real selectable element, assessment forms must be balanced, and MCQ answer keys must be in range (`tests/unit/content.test.js`). This catches authoring mistakes that would otherwise surface in a live demo.

---

## 2. Results (measured)

```
# tests 49
# pass  49
# fail  0
```

### Coverage (server)

| Scope | Line | Branch | Funcs |
|---|---|---|---|
| **All files** | **89.7%** | 79.1% | 80.4% |
| `lib/` (pure logic) | ~100% | high | ~100% |

Selected modules:

| File | Line % |
|---|---|
| `lib/crypto.js` | 100 |
| `lib/cueScoring.js` | 100 |
| `lib/elo.js` | 100 |
| `lib/gamification.js` | 100 |
| `lib/stats.js` | 100 |
| `lib/totp.js` | 100 |
| `lib/passwordPolicy.js` | 100 |
| `middleware/csrf.js` | 100 |
| `app.js` | 100 |

The pure logic — the part a reader cannot verify by eye — is at or near 100%. The uncovered remainder is mostly defensive error branches (e.g. a 500 handler) and startup wiring.

---

## 3. What the integration tests prove

These map directly to the bugs and gaps identified in the earlier review, and to the threat model.

| Test | What it proves |
|---|---|
| *phishing session never leaks the answer key* | The client receives no `isPhishing`/cues; detection is genuine |
| *password-lab score is computed by the server* | The earlier client-trusted-score flaw is gone (no such endpoint exists) |
| *concurrent duplicate answers: exactly one succeeds* | The read-check-write race is fixed with an atomic conditional write |
| *answering the same item twice is rejected* | No double-counting of XP |
| *quiz is server-timed: a late answer is timed out* | The timer is enforced on the server, not cosmetic |
| *serving the next item twice does not reset the timer* | Refreshing the page cannot buy more time |
| *student cannot reach admin endpoints* | Role authorisation, not just authentication |
| *user A cannot answer inside user B's session* | Object-level authorisation |
| *role change invalidates the old session* | `tokenVersion` revocation works |
| *account locks after 5 failed attempts* | Brute-force protection |
| *campaign only targets consenting users* | Consent enforced server-side |
| *clicking a tracked link records it; submit records no data* | Behaviour tracked without capturing credentials |
| *CSV export* | Anonymised export with the expected header |

---

## 4. Manual & tooling checks (to run before submission)
These are part of the plan but run outside the automated suite:

- **`npm audit --audit-level=high`** on both packages (also in CI).
- **CodeQL** static analysis (in CI).
- **OWASP ZAP** baseline scan against a running instance — include the before/after reports in the final submission.
- **axe** + **Lighthouse** accessibility audits on the main pages — report scores before and after fixes.
- **Manual accessibility pass:** keyboard-only navigation of a full training session, screen-reader check of the inspector, and colour-contrast verification.

---

## 5. Continuous integration
`.github/workflows/ci.yml` runs on every push and pull request:

1. **server** — spins up MongoDB, runs the full suite with coverage.
2. **client** — installs and builds (catches compile/import errors).
3. **audit** — `npm audit` on both packages.
4. **codeql** — static security analysis.

A green pipeline is the gate; branch protection should require it before merge. With a team, the git history and PR reviews are themselves evidence of individual contribution.

---

## 6. How to reproduce

```bash
cd server
# a single-node replica set must be running on :27017
NODE_ENV=test \
MONGO_URI="mongodb://127.0.0.1:27017/csas_test?replicaSet=rs0" \
JWT_SECRET="<32+ chars>" \
DATA_ENC_KEY="<64 hex chars>" \
PUBLIC_URL="http://localhost:5173" \
RETENTION_DAYS=0 POST_TEST_MIN_SESSIONS=1 \
npm run test:coverage
```
