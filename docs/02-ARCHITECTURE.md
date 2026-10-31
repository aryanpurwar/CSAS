# Architecture — CSAS

This document describes the system structure and includes the UML diagrams an examiner expects: a component/deployment view, an entity-relationship diagram, a use-case diagram, and a sequence diagram of the core answer flow.

---

## 1. Architectural style

A three-tier web application with a **thin client** and a **server that owns all truth**. The React client renders state and collects input; it never grades answers, computes scores, or holds answer keys. This is a deliberate choice for a security-subject project: anything the client is trusted to compute, an attacker can forge (this was the central flaw in the earlier version, where the browser sent its own password score).

Logic is layered on the server so that the interesting parts are pure and testable:

```text
routes/      HTTP: parse (Zod), authorise, call a service, shape the response
services/    Orchestration: sessions, campaigns, progress, analytics, tokens
lib/         Pure functions: elo, stats, cueScoring, gamification, totp, crypto, time
models/      Mongoose schemas (persistence)
```

The `lib/` layer has no database or HTTP dependency, so it is unit-tested in isolation; the `services/` and `routes/` layers are covered by HTTP integration tests against a real MongoDB.

---

## 2. Component & deployment view

```mermaid
graph TB
    subgraph Browser["Browser (React SPA)"]
        UI["Pages & components"]
        Hooks["Hooks: session, strength, breach"]
        AX["Axios client<br/>cookies + CSRF + refresh"]
    end

    subgraph Server["Node + Express API"]
        MW["Middleware<br/>auth · CSRF · validate · rate-limit · helmet"]
        R["Routes"]
        SVC["Services"]
        LIB["lib/ pure logic"]
    end

    DB[("MongoDB 7<br/>replica set")]
    MAIL["Mailpit<br/>(local SMTP, optional)"]
    HIBP["Have I Been Pwned<br/>range API"]

    UI --> Hooks --> AX
    AX -- "HTTPS, httpOnly cookies" --> MW --> R --> SVC --> LIB
    SVC --> DB
    SVC -- "simulated phishing" --> MAIL
    Hooks -- "k-anonymity hash prefix" --> HIBP

    classDef ext fill:#1a2330,stroke:#2b3a4d,color:#a7b4c4;
    class MAIL,HIBP ext;
```

**Deployment.** In production a single Node process serves both the API and the built client (`SERVE_CLIENT=true`), so the app is one origin and the auth cookies can be `SameSite=Strict`. Docker Compose adds MongoDB (replica set) and Mailpit. The client can alternatively be served by nginx/CDN with the API proxied.

---

## 3. Request pipeline

Every `/api` request passes through this chain before reaching a handler:

```text
requestLog → helmet(CSP) → permissionsPolicy → json body limit → cookieParser
  → noStore → csrfProtection → rateLimit → [route] requireAuth → requireRole
  → validate(Zod) → controller → service → lib
  → errorHandler (central, typed)
```

Validation replaces `req.body`/`req.params` with the parsed, typed, unknown-key-stripped result, so a controller never sees an unexpected field.

---

## 4. Entity-relationship diagram

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : has
    USER ||--o{ TRAINING_SESSION : runs
    USER ||--o{ ITEM_RESPONSE : produces
    USER ||--o{ USER_PROGRESS : has
    USER ||--o{ CAMPAIGN_TARGET : receives
    USER ||--o| SURVEY_RESPONSE : submits
    USER ||--o{ ASSESSMENT_RESULT : completes
    USER ||--o{ AUDIT_LOG : "acts in"

    PHISHING_SCENARIO ||--o{ ITEM_RESPONSE : "answered as"
    MCQ_ITEM ||--o{ ITEM_RESPONSE : "answered as"
    TRAINING_SESSION ||--o{ ITEM_RESPONSE : contains

    CAMPAIGN ||--o{ CAMPAIGN_TARGET : targets
    PHISHING_SCENARIO ||--o{ CAMPAIGN : "template for"

    USER {
        string name
        string email UK
        string passwordHash
        string role
        string timezone
        string participantCode UK
        string studyGroup
        object consent
        object ratings
        int xp
        array badges
        object streak
        object security
    }
    PHISHING_SCENARIO {
        string title
        bool isPhishing
        string pool
        string form
        object auth "SPF/DKIM/DMARC"
        array parts
        array cues
        int rating
    }
    ITEM_RESPONSE {
        ObjectId userId FK
        ObjectId sessionId FK
        ObjectId itemId FK
        string kind
        string phase
        bool correct
        float score
        float precision
        float recall
        int confidence
        int decisionMs
        int ratingBefore
        int ratingAfter
    }
    TRAINING_SESSION {
        ObjectId userId FK
        string module
        string mode
        string phase
        array served
        array answers
        date expiresAt
    }
    CAMPAIGN_TARGET {
        ObjectId campaignId FK
        ObjectId userId FK
        string tokenHash UK
        date clickedAt
        date reportedAt
        date submittedAt
    }
```

`ITEM_RESPONSE` is deliberately the hub: it is both the gameplay record and the research dataset.

---

## 5. Use-case diagram

```mermaid
graph LR
    student((Student))
    admin((Admin))
    researcher((Researcher))

    student --- UC1["Train (inspect phishing)"]
    student --- UC2["Take social / quiz / password"]
    student --- UC3["Give consent & take assessments"]
    student --- UC4["Report inbox messages"]
    student --- UC5["Manage account & 2FA"]

    admin --- UC6["Manage users & roles"]
    admin --- UC7["Manage content"]
    admin --- UC8["Launch & monitor campaigns"]

    researcher --- UC9["View study results"]
    researcher --- UC10["Export anonymised data"]

    UC8 -.->|"«include»"| CONSENT{{"consent check"}}
    UC3 -.->|"«include»"| CONSENT
    admin --- UC9
    admin --- UC10
```

(The researcher role is an admin acting in a research capacity; the system has two roles, student and admin.)

---

## 6. Sequence diagram — answering a phishing item

This is the core flow and the one most worth understanding, because it is where concurrency, scoring, adaptivity, and the research record all meet.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as routes/training
    participant S as sessionService
    participant DB as MongoDB
    participant P as progressService

    C->>R: POST /sessions/:id/next
    R->>S: nextItem(user, id)
    S->>DB: load session (not completed, not expired)
    alt item already pending
        S-->>C: same item, original servedAt (timer not reset)
    else choose new item
        S->>DB: candidates (adaptive: Elo-near skill)
        S->>DB: conditional $push served (size guard)
        S-->>C: public item (no answer key), servedAt, deadline
    end

    C->>R: POST /sessions/:id/answer {itemId, answer}
    R->>S: submitAnswer(...)
    S->>S: grade (verdict + cue precision/recall)
    S->>DB: findOneAndUpdate<br/>(answers.itemId $ne id) — atomic guard
    alt lost the race / duplicate
        S-->>C: 409 ALREADY_ANSWERED
    else won
        S->>DB: update Elo (user += Δ, item -= Δ) via $inc
        S->>DB: insert ItemResponse (research row)
        opt last item
            S->>DB: flip completed false→true (once)
            S->>P: recordTrainingSession(score)
            P->>DB: push rolling score, recompute XP/badges/streak
        end
        S-->>C: feedback (annotations) + result
    end
```

### Why the atomic guard matters
Two parallel submissions for the same item (double-click, retried request) could both pass a naive "already answered?" check and both record a response, double-counting XP. The write is instead a single `findOneAndUpdate` with the condition `'answers.itemId': { $ne: itemId }`, so only one can succeed; the other gets a 409. This is covered by the integration test *"concurrent duplicate answers: exactly one succeeds"*.

---

## 7. Key design decisions

| Decision | Rationale | Alternative rejected |
|---|---|---|
| Server owns all grading | A security app cannot trust the client; forging a score must be impossible | Client-side scoring (the earlier version's flaw) |
| httpOnly cookies + refresh rotation | An XSS cannot read the token; reuse detection catches stolen refresh tokens | localStorage JWT (readable by any script) |
| Elo for adaptivity | Achievable, explainable, needs no training data, updates online | Item Response Theory (needs calibration data and heavier statistics) |
| Rolling-average module score | A lucky session cannot lock in a high score; the score tracks current skill | Best-ever score (gameable by replay) |
| Derived gamification | XP/badges recomputed from responses can never drift from reality | Incrementing stored counters (the earlier version showed 200 XP with 0 attempts) |
| k-anonymity breach check | Checks real breaches without the password or full hash leaving the device | Sending the password to a server (unacceptable in a security tool) |
| One `ItemResponse` per answer | Single source for both gameplay and research analytics | Separate ad-hoc aggregates (drift, duplication) |

---

## 8. Technology rationale (short)
MongoDB suits the heterogeneous content (emails with parts and cues, MCQs with transcripts) and the append-heavy response log; the replica set gives transactions and TTL indexes. Express keeps the HTTP surface small and explicit. React with Vite gives a fast build and natural component decomposition for the inspector and runners. Zod gives a single place where the shape of every request is defined and enforced.
