# Viva Preparation Guide — CSAS

This guide prepares you to **defend** the project, not just describe it. An examiner's goal is to find the edge of your understanding; the way through is to explain *why* each decision was made and what you rejected. Read the code alongside this. If a question's answer isn't yet true in your own head, go read that file until it is.

---

## 1. The one-sentence pitch
"It's an adaptive cybersecurity-awareness platform that doubles as a controlled study measuring whether its training actually changes phishing-detection behaviour — so it has a research question, a real technical core, and an evaluation, not just a CRUD app with a quiz."

If you can only remember one thing: **the server owns all truth; the client is never trusted.** Almost every design decision follows from that.

---

## 2. Questions you will likely be asked

### "What makes this a final-year project and not a third-year one?"
Three things a minor project lacks: (1) a **research question** with a controlled study to answer it; (2) a **non-trivial technical core** — the email inspector with cue scoring, the Elo adaptivity, and the campaign engine measure behaviour, not quiz answers; (3) **evidence** — automated tests, a threat model, and a results pipeline. A minor project proves "I can build an app." This proves "I built something non-trivial, tested whether it works, and can show the data."

### "Walk me through what happens when a user answers a phishing email."
Follow the sequence diagram in `02-ARCHITECTURE.md`. Key beats: the client sends a verdict + flags + confidence (never a score); the server grades it (`modules/phishing.js` → `lib/cueScoring.js`); the answer is written with an **atomic conditional update** so concurrent duplicates can't double-count; Elo ratings for the user and item update; one `ItemResponse` row is written (the research record); on the last item, gamification is **recomputed from source data**.

### "Why is the scoring on the server? Isn't that slower?"
Because the subject is security and the client is attacker-controllable. In the previous version the browser computed a password score and sent it, so anyone could `curl` a perfect score. Server-side grading makes forging a score impossible. The latency cost is a few milliseconds — irrelevant next to correctness.

### "How does the adaptive difficulty work? Why Elo and not something fancier?"
Both learners and items carry an Elo rating. Expected success is `1 / (1 + 10^((item − learner)/400))`. After each answer the learner gains and the item loses rating proportional to the surprise (`lib/elo.js`). To pick the next item, I compute the item rating at which the learner has ~70% success (`targetItemRating`) and choose randomly among the nearest few, so the sequence isn't memorisable. I chose Elo over **Item Response Theory** because IRT needs a calibration dataset and heavier statistics; Elo updates online from the first answer and I can explain every line. The ~70% target comes from the "desirable difficulty" idea — challenging but mostly achievable.

### "How do you score which red flags someone found?"
For a phishing email I know the true cue set. The learner's flags give me precision and recall against it (`lib/cueScoring.js`). A correct verdict earns most of the score; finding the evidence earns the rest. Crucially, for **legitimate** emails every flag is a false alarm and is penalised — because someone who calls everything phishing isn't safe, just noisy. Tracking false positives is a deliberate, defensible choice.

### "Why recompute XP instead of adding it up?"
The earlier version incremented a stored XP counter, and its own screenshot showed 200 XP with 0 attempts — the counter had drifted from reality. I derive XP, badges, and streaks from the stored responses every time (`lib/gamification.js`, `progressService.js::recomputeUser`). Derived state can never be inconsistent with the data, and there's a `recompute` script to rebuild everything if needed. The trade-off is a bit more computation per update, which is negligible here.

### "How do you stop someone farming a high score by replaying?"
The module score is a **rolling average of the last three sessions**, not the best ever (`rollingScore`). A lucky session can't lock in a high score, and the score falls if skill falls. Combined with server-side grading and adaptive item selection (you stop seeing easy items as you improve), replay doesn't help.

### "The password lab — how do you check breaches without seeing the password?"
k-anonymity with the Have I Been Pwned range API (`hooks/usePwnedCheck.js`). The browser SHA-1s the password, sends only the **first 5 hex characters** of the hash, and the API returns all suffixes with that prefix; the match happens locally. The full password and full hash never leave the device. zxcvbn estimates strength on top of that. This is the kind of privacy-preserving protocol worth walking an examiner through slowly.

### "Why httpOnly cookies instead of a JWT in localStorage?"
A token in localStorage is readable by any JavaScript, so one XSS steals the session. httpOnly cookies aren't readable by scripts. I pair a short-lived access token with a rotating refresh token, add CSRF protection (double-submit token) because cookies are sent automatically, and detect refresh-token reuse — if a rotated token is replayed, I revoke the whole family (`tokenService.js`).

### "How is the quiz timer enforced?"
The server stores when each question was served and rejects answers after the limit plus a small network grace (`sessionService.js`). The countdown in the browser is only a cue. In the earlier version the timer existed only in the browser, so it was cosmetic — you could take 45 minutes. There's an integration test that backdates the served time and asserts the answer is marked timed-out.

### "Walk me through the study design."
Between-subjects randomised controlled design with repeated measures (pre/post/retention). Consenting participants are balanced into adaptive vs. control. The two groups get the same content and the same practice, differing only in adaptivity and gamification, so a between-group difference isolates those factors. Assessments use three counterbalanced parallel forms and give no feedback. Primary analysis is a Welch t-test on pre→post gain between groups. See `04-STUDY-PROTOCOL.md`.

### "Your N is only 30. Isn't that underpowered?"
Yes, and I say so explicitly. A medium effect at 80% power needs ~45 per group, so 30 total is **exploratory**. I report effect sizes and confidence intervals, not just p-values, and I don't over-claim. Being honest about this is stronger than pretending otherwise.

### "Can I trust the statistics in your dashboard?"
They're textbook implementations (Welch, paired t via the incomplete-beta function, Brier, SUS) and unit-tested against known values — SUS against Brooke's worked example, the t-tests against hand-checked cases. But the dashboard is a *first look*; the report confirms everything in R or SPSS from the CSV export. I built the export for exactly that reason.

### "How do you keep the research data anonymous?"
Every participant has a random participant code; responses are stored and exported under that code, never the name (`participantCode`, `analyticsService.js`). The CSV export's header starts `participant,group,...` with no identifying fields.

### "What stops an admin from phishing people who didn't agree?"
Consent is enforced on the **server**, in `campaignService.js::launchCampaign` — it filters to users with `consent.campaigns.given` before creating any target, and the integration test confirms a non-consenting user is skipped. The UI also hides them, but the server is the real gate.

### "Show me your worst bug or weakest point."
Have an honest answer ready. Good candidates: the statistics are a convenience, not a substitute for proper analysis software; there are no TOTP recovery codes yet (a locked-out 2FA user needs an admin reset); secrets are environment-held rather than in a KMS; and the study N is exploratory. Naming real limitations shows judgement.

---

## 3. If you're asked to make a live change
Practise these so you can do one calmly:
- Add a phishing scenario via the admin content form and show it appearing in training.
- Point at the atomic write in `sessionService.js` and explain why the `$ne` guard prevents double-counting.
- Run `npm test` and talk through one integration test as it passes.
- Open the study dashboard, download the CSV, and open it in a spreadsheet.

---

## 4. Five-minute code tour (the order to show files)
1. `modules/phishing.js` + `lib/cueScoring.js` — the core interaction and its scoring.
2. `services/sessionService.js` — the engine: adaptive selection, the atomic answer write, Elo update, the research row.
3. `lib/gamification.js` + `services/progressService.js` — derived, not incremented.
4. `routes/auth.js` + `services/tokenService.js` — the security story.
5. `services/analyticsService.js` + `lib/stats.js` — how the study question gets answered.
6. `tests/integration/` — proof that the above actually holds.

---

## 5. Honesty note
This codebase is large and uses patterns you may not have written before. Before the viva, make each decision in this guide genuinely yours: read the file, change something small, break it, fix it. An examiner can tell the difference between someone who understands their system and someone who memorised a description of it — and the understanding is the point of the whole exercise.
